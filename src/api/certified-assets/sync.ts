/**
 * Minimal TypeScript port of the upload ("sync") protocol of the certified-assets
 * canister (dfinity/certified-assets, vendored in hosty-live-fe/canisters/certified-assets).
 *
 * Reference implementation: crates/sync-core/src/sync.rs and crates/asset-prep.
 * There is no official JavaScript client, so hosty keeps this port. It is shared
 * verbatim between hosty-live-api (src/ic/certified-assets-sync.ts) and
 * hosty-live-fe (src/api/certified-assets/sync.ts); keep both copies identical.
 *
 * Semantics: "replace everything". After a sync the canister serves exactly the
 * given files (plus the synthesized clean-URL / 404 rules), like the old
 * AssetManager `clear()` + `store()` flow, but encodings whose sha256 already
 * matches are not re-uploaded.
 *
 * Runtime requirements: `globalThis.crypto.subtle` (browsers, Node >= 20).
 */

// ───────── Candid wire shapes (structural, agent-version independent) ─────────

export type EncodingVariant = { Identity: null } | { Gzip: null } | { Brotli: null };
export type RulePattern = { Exact: string } | { Subtree: string };
export type HeaderField = [string, string];
export type Bytes = Uint8Array | number[];

export interface RedirectRule {
  from: RulePattern;
  to: string;
  status: number;
  headers: HeaderField[];
}

export interface AssetDetails {
  key: string;
  content_type: string;
  encodings: { encoding: EncodingVariant; sha256: Bytes }[];
  headers: HeaderField[];
}

export type Operation =
  | { CreateAsset: { key: string; content_type: string; headers: HeaderField[] } }
  | {
      SetAssetContent: {
        key: string;
        encoding: EncodingVariant;
        chunk_ids: bigint[];
        sha256: Bytes;
        chunk_sha256: Bytes[];
      };
    }
  | { UnsetAssetContent: { key: string; encoding: EncodingVariant } }
  | { DeleteAsset: { key: string } }
  | { SetAssetHeaders: { key: string; headers: HeaderField[] } }
  | { SetRedirectRules: { rules: RedirectRule[] } }
  | { SetPreparationCanary: { canary: Bytes } };

/** The subset of the canister interface the sync needs. */
export interface CertifiedAssetsSyncActor {
  version: () => Promise<{ major: number; minor: number; patch: number }>;
  can_sync: () => Promise<boolean>;
  get_asset_details: (start_after: [] | [string]) => Promise<AssetDetails[]>;
  start_sync: () => Promise<
    { Started: { session_id: bigint } } | { Busy: { owner: unknown; idle_for_secs: bigint } }
  >;
  upload_chunks: (arg: { session_id: bigint; chunks: Bytes[] }) => Promise<bigint[]>;
  execute_operations: (arg: {
    session_id: bigint;
    operations: Operation[];
    is_final: boolean;
  }) => Promise<[] | [Bytes]>;
}

// ───────── Public API ─────────

export type EncodingName = 'Identity' | 'Gzip' | 'Brotli';

export interface SyncFile {
  /** Path inside the site, with or without a leading slash, e.g. `index.html`. */
  path: string;
  content: Uint8Array;
  contentType: string;
}

export interface Encoder {
  encoding: Exclude<EncodingName, 'Identity'>;
  encode: (data: Uint8Array) => Promise<Uint8Array> | Uint8Array;
}

export interface SyncOptions {
  /** Optional compressors; a compressed copy is only kept when it is smaller. */
  encoders?: Encoder[];
  /** Max concurrent `upload_chunks` calls. */
  concurrency?: number;
  /**
   * Add/replace only the given files and leave everything else untouched: no deletes,
   * no `_redirects`/404 handling and the canister's redirect rules are not changed.
   * Meant for single-file updates such as `.well-known/ic-domains`.
   */
  keepExisting?: boolean;
  log?: (message: string) => void;
}

export interface SyncResult {
  assets: number;
  uploadedChunks: number;
  uploadedBytes: number;
  operations: number;
  /** Hex state hash reported by the canister, if any. */
  stateHash?: string;
}

/** Matches asset-prep::MAX_CHUNK_SIZE. */
export const MAX_CHUNK_SIZE = 1_900_000;
const MAX_OPERATIONS_PER_GROUP = 500;
const PAGE_GUARD = 10_000;

export const REDIRECTS_FILENAME = '_redirects';
export const HEADERS_FILENAME = '_headers';
export const ROOT_404_KEY = '/404.html';

/**
 * Replace the canister's content with `files`.
 * A `_redirects` file is applied as rules (never served); `_headers` is ignored.
 */
export async function syncAssets(
  actor: CertifiedAssetsSyncActor,
  files: SyncFile[],
  options: SyncOptions = {},
): Promise<SyncResult> {
  const log = options.log ?? (() => undefined);
  const encoders = options.encoders ?? [];
  const concurrency = Math.max(1, options.concurrency ?? 4);

  // 1. Plan: normalise keys, pull out the special files.
  const byKey = new Map<string, SyncFile>();
  let redirectsSource: string | undefined;
  for (const file of files) {
    const key = normaliseKey(file.path);
    if (key === '/' + REDIRECTS_FILENAME) {
      redirectsSource = new TextDecoder().decode(file.content);
      continue;
    }
    if (key === '/' + HEADERS_FILENAME) {
      log(`${HEADERS_FILENAME} is not supported by this uploader and was skipped`);
      continue;
    }
    byKey.set(key, { ...file, path: key });
  }

  const keepExisting = options.keepExisting ?? false;
  const userRules = redirectsSource && !keepExisting ? parseRedirects(redirectsSource) : [];
  const notFound = keepExisting
    ? { injectDefaultAsset: false, appendCatchall: false }
    : planNotFound([...byKey.keys()], userRules);
  if (notFound.injectDefaultAsset) {
    byKey.set(ROOT_404_KEY, {
      path: ROOT_404_KEY,
      content: new TextEncoder().encode(DEFAULT_404_HTML),
      contentType: 'text/html',
    });
  }
  const rules = synthesizeHtmlRules([...byKey.keys()]);
  rules.push(...userRules);
  if (notFound.appendCatchall) {
    rules.push({ from: { Subtree: '/' }, to: ROOT_404_KEY, status: 404, headers: [] });
  }

  // 2. Encode and hash.
  const planned: PlannedAsset[] = [];
  for (const file of byKey.values()) {
    planned.push(await prepareAsset(file, encoders));
  }

  // 3. Current canister state.
  const existing = await listAllAssets(actor);
  log(`canister currently has ${existing.size} asset(s); syncing ${planned.length}`);

  // 4. Diff into operations and chunks to upload.
  const operations: Operation[] = [];
  const pending: PendingChunk[] = [];
  if (!keepExisting) {
    for (const key of existing.keys()) {
      if (!byKey.has(key)) operations.push({ DeleteAsset: { key } });
    }
  }
  for (const asset of planned) {
    const current = existing.get(asset.key);
    let reusable = current;
    if (!current) {
      operations.push({
        CreateAsset: { key: asset.key, content_type: asset.contentType, headers: [] },
      });
      reusable = undefined;
    } else if (current.content_type !== asset.contentType) {
      // No "set content type" operation exists: recreate the asset.
      operations.push({ DeleteAsset: { key: asset.key } });
      operations.push({
        CreateAsset: { key: asset.key, content_type: asset.contentType, headers: [] },
      });
      reusable = undefined;
    } else if (current.headers.length > 0) {
      operations.push({ SetAssetHeaders: { key: asset.key, headers: [] } });
    }
    const ours = new Set(asset.encodings.map((e) => e.encoding));
    if (reusable) {
      for (const enc of reusable.encodings) {
        const name = encodingName(enc.encoding);
        if (!ours.has(name)) {
          operations.push({ UnsetAssetContent: { key: asset.key, encoding: enc.encoding } });
        }
      }
    }
    for (const enc of asset.encodings) {
      const inPlace = reusable?.encodings.some(
        (e) => encodingName(e.encoding) === enc.encoding && bytesEqual(e.sha256, enc.sha256),
      );
      if (inPlace) continue;
      enc.chunkIds = new Array<bigint>(enc.chunks.length).fill(0n);
      enc.chunks.forEach((chunk, index) => pending.push({ asset, enc, index, data: chunk.data }));
    }
  }
  const contentOps = (): Operation[] => {
    const ops: Operation[] = [];
    for (const asset of planned) {
      for (const enc of asset.encodings) {
        if (!enc.chunkIds) continue;
        ops.push({
          SetAssetContent: {
            key: asset.key,
            encoding: encodingVariant(enc.encoding),
            chunk_ids: enc.chunkIds,
            sha256: enc.sha256,
            chunk_sha256: enc.chunks.map((c) => c.sha256),
          },
        });
      }
    }
    return ops;
  };

  // 5. Run the sync session.
  const started = await actor.start_sync();
  if (!('Started' in started)) {
    const busy = started.Busy;
    throw new Error(
      `another sync is in progress on this canister (owner ${String(busy.owner)}, idle for ${busy.idle_for_secs}s)`,
    );
  }
  const sessionId = started.Started.session_id;

  const uploaded = await uploadChunks(actor, sessionId, pending, concurrency);
  log(
    `uploaded ${uploaded.chunks} chunk(s) in ${uploaded.calls} call(s) (${uploaded.bytes} bytes)`,
  );

  operations.push(...contentOps());
  if (!keepExisting) operations.push({ SetRedirectRules: { rules } });

  let stateHash: Bytes | undefined;
  const groups = chunkArray(operations, MAX_OPERATIONS_PER_GROUP);
  if (groups.length === 0) groups.push([]);
  for (let i = 0; i < groups.length; i++) {
    const result = await actor.execute_operations({
      session_id: sessionId,
      operations: groups[i],
      is_final: i === groups.length - 1,
    });
    if (result.length) stateHash = result[0];
  }
  log(`executed ${operations.length} operation(s)`);

  return {
    assets: planned.length,
    uploadedChunks: uploaded.chunks,
    uploadedBytes: uploaded.bytes,
    operations: operations.length,
    stateHash: stateHash ? toHex(stateHash) : undefined,
  };
}

/** List every asset on the canister (paginated `get_asset_details`). */
export async function listAllAssets(
  actor: CertifiedAssetsSyncActor,
): Promise<Map<string, AssetDetails>> {
  const all = new Map<string, AssetDetails>();
  let startAfter: [] | [string] = [];
  for (let i = 0; i < PAGE_GUARD; i++) {
    const page = await actor.get_asset_details(startAfter);
    if (page.length === 0) break;
    for (const a of page) all.set(a.key, a);
    startAfter = [page[page.length - 1].key];
  }
  return all;
}

// ───────── Rule synthesis (port of asset-prep::html_handling / not_found / redirects) ─────────

export function synthesizeHtmlRules(assetKeys: string[]): RedirectRule[] {
  const htmlKeys = assetKeys.filter((k) => k.endsWith('.html')).sort();
  const rules: RedirectRule[] = [];
  const rewrite = (from: string, to: string): RedirectRule => ({
    from: { Exact: from },
    to,
    status: 200,
    headers: [],
  });
  const redirect = (from: string, to: string): RedirectRule => ({
    from: { Exact: from },
    to,
    status: 307,
    headers: [],
  });
  for (const key of htmlKeys) {
    if (key === '/index.html') {
      rules.push(
        rewrite('/', '/index.html'),
        redirect('/index', '/'),
        redirect('/index.html', '/'),
      );
    } else if (key.endsWith('/index.html')) {
      const stem = key.slice(0, -'/index.html'.length);
      const canonical = `${stem}/`;
      rules.push(
        rewrite(canonical, key),
        redirect(stem, canonical),
        redirect(`${stem}.html`, stem),
        redirect(`${canonical}index`, stem),
        redirect(key, stem),
      );
    } else {
      const canonical = key.slice(0, -'.html'.length);
      rules.push(
        rewrite(canonical, key),
        redirect(key, canonical),
        redirect(`${canonical}/`, canonical),
        redirect(`${canonical}/index`, canonical),
        redirect(`${canonical}/index.html`, canonical),
      );
    }
  }
  return rules;
}

function planNotFound(
  assetKeys: string[],
  userRules: RedirectRule[],
): { injectDefaultAsset: boolean; appendCatchall: boolean } {
  const hasRootCatchall = userRules.some((r) => 'Subtree' in r.from && r.from.Subtree === '/');
  if (hasRootCatchall) return { injectDefaultAsset: false, appendCatchall: false };
  return { injectDefaultAsset: !assetKeys.includes(ROOT_404_KEY), appendCatchall: true };
}

const SUPPORTED_STATUSES = new Set([200, 301, 302, 307, 308, 404, 410]);

/** Parse a Netlify-style `_redirects` file: `<from> <to> <status>` per line. */
export function parseRedirects(content: string): RedirectRule[] {
  const rules: RedirectRule[] = [];
  content.split(/\r?\n/).forEach((raw, i) => {
    const body = stripComment(raw).trim();
    if (!body) return;
    const fail = (message: string) => {
      throw new Error(`_redirects: line ${i + 1}: ${message} (source: \`${raw.trim()}\`)`);
    };
    const tokens = body.split(/\s+/);
    if (tokens.length !== 3)
      fail(`expected '<from> <to> <status>' (3 fields), got ${tokens.length}`);
    const [fromTok, toTok, statusTok] = tokens;
    const status = Number(statusTok);
    if (!SUPPORTED_STATUSES.has(status)) fail(`unsupported status '${statusTok}'`);
    if (!fromTok.startsWith('/')) fail(`'from' ('${fromTok}') must be an absolute path`);
    if (fromTok.includes(':')) fail(`':' placeholders in 'from' ('${fromTok}') are not supported`);
    let from: RulePattern;
    if (fromTok.endsWith('/*')) {
      const prefix = fromTok.slice(0, -2);
      if (prefix.includes('*')) fail(`wildcards are only supported as a trailing '/*'`);
      from = { Subtree: prefix === '' ? '/' : `${prefix}/` };
    } else {
      if (fromTok.includes('*')) fail(`wildcards are only supported as a trailing '/*'`);
      from = { Exact: fromTok };
    }
    if (toTok.includes(':splat') || toTok.includes(':placeholder')) {
      fail(`':splat' / ':placeholder' substitution is not supported`);
    }
    const isRedirect = status >= 300 && status < 400;
    if (!toTok.startsWith('/') && !(isRedirect && /^[a-z][a-z0-9+.-]*:\/\//i.test(toTok))) {
      fail(`'to' ('${toTok}') must be an absolute path${isRedirect ? ' or URL' : ''}`);
    }
    rules.push({ from, to: toTok, status, headers: [] });
  });
  return rules;
}

function stripComment(line: string): string {
  let prevIsWs = true;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '#' && prevIsWs) return line.slice(0, i);
    prevIsWs = ch === ' ' || ch === '\t';
  }
  return line;
}

// ───────── Preparation ─────────

interface PreparedChunk {
  data: Uint8Array;
  sha256: Uint8Array;
}

interface PreparedEncoding {
  encoding: EncodingName;
  sha256: Uint8Array;
  chunks: PreparedChunk[];
  /** Set once the encoding is scheduled for upload. */
  chunkIds?: bigint[];
}

interface PlannedAsset {
  key: string;
  contentType: string;
  encodings: PreparedEncoding[];
}

interface PendingChunk {
  asset: PlannedAsset;
  enc: PreparedEncoding;
  index: number;
  data: Uint8Array;
}

async function prepareAsset(file: SyncFile, encoders: Encoder[]): Promise<PlannedAsset> {
  const encodings: PreparedEncoding[] = [await prepareEncoding('Identity', file.content)];
  if (isCompressible(file.contentType)) {
    for (const encoder of encoders) {
      const data = await encoder.encode(file.content);
      if (data.length >= file.content.length) continue;
      encodings.push(await prepareEncoding(encoder.encoding, data));
    }
  }
  return { key: file.path, contentType: file.contentType, encodings };
}

async function prepareEncoding(
  encoding: EncodingName,
  data: Uint8Array,
): Promise<PreparedEncoding> {
  const chunks: PreparedChunk[] = [];
  if (data.length === 0) {
    chunks.push({ data, sha256: await sha256(data) });
  }
  for (let offset = 0; offset < data.length; offset += MAX_CHUNK_SIZE) {
    const slice = data.subarray(offset, Math.min(offset + MAX_CHUNK_SIZE, data.length));
    chunks.push({ data: slice, sha256: await sha256(slice) });
  }
  return { encoding, sha256: await sha256(data), chunks };
}

/** Mirrors asset-prep::content::is_compressible closely enough for hosting builds. */
export function isCompressible(contentType: string): boolean {
  const mime = contentType.split(';')[0].trim().toLowerCase();
  if (mime.startsWith('text/')) return true;
  if (mime.startsWith('font/') && !mime.includes('woff')) return true;
  return [
    'application/javascript',
    'application/x-javascript',
    'application/ecmascript',
    'application/json',
    'application/ld+json',
    'application/manifest+json',
    'application/xml',
    'application/xhtml+xml',
    'application/rss+xml',
    'application/atom+xml',
    'application/wasm',
    'image/svg+xml',
    'application/vnd.ms-fontobject',
    'application/x-font-ttf',
    'application/font-sfnt',
  ].includes(mime);
}

// ───────── Upload ─────────

async function uploadChunks(
  actor: CertifiedAssetsSyncActor,
  sessionId: bigint,
  pending: PendingChunk[],
  concurrency: number,
): Promise<{ chunks: number; calls: number; bytes: number }> {
  if (pending.length === 0) return { chunks: 0, calls: 0, bytes: 0 };
  pending.sort((a, b) => b.data.length - a.data.length);

  // First-fit bin packing into calls of at most MAX_CHUNK_SIZE bytes.
  const batches: PendingChunk[][] = [];
  let rest = pending;
  while (rest.length > 0) {
    const batch: PendingChunk[] = [];
    const leftovers: PendingChunk[] = [];
    let size = 0;
    for (const chunk of rest) {
      if (size + chunk.data.length <= MAX_CHUNK_SIZE) {
        size += chunk.data.length;
        batch.push(chunk);
      } else {
        leftovers.push(chunk);
      }
    }
    batches.push(batch);
    rest = leftovers;
  }

  let bytes = 0;
  let next = 0;
  const worker = async () => {
    while (next < batches.length) {
      const batch = batches[next++];
      const ids = await actor.upload_chunks({
        session_id: sessionId,
        chunks: batch.map((c) => c.data),
      });
      if (ids.length !== batch.length) {
        throw new Error(`upload_chunks returned ${ids.length} ids for ${batch.length} chunk(s)`);
      }
      batch.forEach((chunk, i) => {
        chunk.enc.chunkIds![chunk.index] = ids[i];
        bytes += chunk.data.length;
      });
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, batches.length) }, worker));
  return { chunks: pending.length, calls: batches.length, bytes };
}

// ───────── Helpers ─────────

export function normaliseKey(path: string): string {
  const cleaned = path.replace(/\\/g, '/').replace(/^\.?\/+/, '');
  return '/' + cleaned;
}

function encodingName(v: EncodingVariant): EncodingName {
  if ('Gzip' in v) return 'Gzip';
  if ('Brotli' in v) return 'Brotli';
  return 'Identity';
}

function encodingVariant(name: EncodingName): EncodingVariant {
  if (name === 'Gzip') return { Gzip: null };
  if (name === 'Brotli') return { Brotli: null };
  return { Identity: null };
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(data); // detach from any larger backing buffer
  return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', copy));
}

function bytesEqual(a: Bytes, b: Bytes): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function toHex(bytes: Bytes): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Same page upstream serves when a site ships no 404.html (asset-prep::not_found). */
export const DEFAULT_404_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>404 — Not Found</title>
<style>
  :root { color-scheme: light dark; }
  html, body { height: 100%; margin: 0; }
  body {
    display: flex; align-items: center; justify-content: center;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: Canvas; color: CanvasText;
  }
  main { text-align: center; padding: 2rem; max-width: 32rem; }
  h1 { font-size: 4rem; margin: 0; font-weight: 700; letter-spacing: -0.05em; }
  p { margin: 0.5rem 0 0; font-size: 1.1rem; opacity: 0.8; }
  .hint { margin-top: 1.5rem; font-size: 0.85rem; opacity: 0.55; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>
</head>
<body>
<main>
  <h1>404</h1>
  <p>The page you requested could not be found.</p>
  <p class="hint">This is the default page served by the assets canister. Add a <code>404.html</code> to your project to customize it.</p>
</main>
</body>
</html>
`;
