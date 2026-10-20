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
 * matches are not re-uploaded. `_redirects` and `_headers` (asset-prep's redirects.rs,
 * headers.rs and glob.rs) are applied, not served.
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
/** Inlined header bytes per `execute_operations` call (sync-core: under the 2 MiB ingress cap). */
const MAX_HEADER_BYTES_PER_GROUP = 1_500_000;
const PAGE_GUARD = 10_000;

export const REDIRECTS_FILENAME = '_redirects';
export const HEADERS_FILENAME = '_headers';
export const ROOT_404_KEY = '/404.html';

/**
 * Replace the canister's content with `files`.
 * A `_redirects` file is applied as rules and `_headers` as per-asset response headers
 * and content types; neither is served. A malformed `_redirects` or `_headers` throws
 * before the canister is touched.
 */
export async function syncAssets(
  actor: CertifiedAssetsSyncActor,
  files: SyncFile[],
  options: SyncOptions = {},
): Promise<SyncResult> {
  const log = options.log ?? (() => undefined);
  const encoders = options.encoders ?? [];
  const concurrency = Math.max(1, options.concurrency ?? 4);
  const keepExisting = options.keepExisting ?? false;

  // 1. Plan: normalise keys, apply `_headers`, pull out the special files.
  const site = prepareSiteFiles(files);
  const byKey = new Map(site.files.map((f) => [f.path, f]));
  const headerRules = keepExisting ? [] : site.headerRules;
  if (keepExisting && (site.redirectsSource !== undefined || site.headerRules.length)) {
    log(`${REDIRECTS_FILENAME} / ${HEADERS_FILENAME} are ignored by a partial update`);
  }
  if (headerRules.length) log(`${HEADERS_FILENAME}: ${headerRules.length} rule(s)`);

  const userRules =
    site.redirectsSource && !keepExisting ? parseRedirects(site.redirectsSource) : [];
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
  // 3xx rules answer on their own (no target asset to borrow headers from), so they carry
  // the `_headers` resolved for their `from` path; 200/4xx rules use their target's.
  for (const rule of rules) {
    if (rule.status >= 300 && rule.status < 400) {
      const key = 'Exact' in rule.from ? rule.from.Exact : rule.from.Subtree;
      rule.headers = resolveHeaders(key, headerRules);
    }
  }

  // 2. Encode and hash.
  const planned: PlannedAsset[] = [];
  for (const file of byKey.values()) {
    planned.push(await prepareAsset(file, encoders, resolveHeaders(file.path, headerRules)));
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
    // A partial update knows no `_headers`: assets it replaces keep the headers they have.
    if (keepExisting && current) asset.headers = current.headers;
    let reusable = current;
    if (!current) {
      operations.push({
        CreateAsset: { key: asset.key, content_type: asset.contentType, headers: asset.headers },
      });
      reusable = undefined;
    } else if (current.content_type !== asset.contentType) {
      // No "set content type" operation exists: recreate the asset.
      operations.push({ DeleteAsset: { key: asset.key } });
      operations.push({
        CreateAsset: { key: asset.key, content_type: asset.contentType, headers: asset.headers },
      });
      reusable = undefined;
    } else if (!headersEqual(current.headers, asset.headers)) {
      // Headers are compared on every sync, also when all encodings are reused, so a
      // deploy that only changes `_headers` still reaches the canister.
      operations.push({ SetAssetHeaders: { key: asset.key, headers: asset.headers } });
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
  const groups = splitOperationGroups(operations);
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

/** A `#` starts a comment at the line start or after whitespace, never inside a token. */
function stripComment(line: string): string {
  let prevIsWs = true;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '#' && prevIsWs) return line.slice(0, i);
    prevIsWs = ASCII_WHITESPACE.has(ch);
  }
  return line;
}

const ASCII_WHITESPACE = new Set([' ', '\t', '\n', '\r', '\f']);

// ───────── _headers (port of asset-prep::headers / glob) ─────────

/** A `_headers` path pattern: absolute, with `*` matching any run of characters including `/`. */
export interface KeyPattern {
  source: string;
  /** Literal parts; consecutive parts are joined by an implicit `*`. */
  parts: string[];
}

export interface HeaderRule {
  pattern: KeyPattern;
  /** Response headers in declaration order; never contains `Content-Type`. */
  headers: HeaderField[];
  /** Media type override for matching files (the `Content-Type:` line of the block). */
  contentType?: string;
}

/** A malformed `_headers` line; `line` is 1-based. */
export class HeadersParseError extends Error {
  readonly line: number;
  readonly source: string;
  readonly reason: string;

  constructor(line: number, source: string, reason: string) {
    super(`${HEADERS_FILENAME}: line ${line}: ${reason} (source: \`${source}\`)`);
    this.name = 'HeadersParseError';
    this.line = line;
    this.source = source;
    this.reason = reason;
  }
}

export function parseKeyPattern(token: string): KeyPattern {
  if (!token.startsWith('/')) {
    throw new Error(`'${token}' must be an absolute path (start with '/')`);
  }
  if (token.includes(':')) {
    throw new Error(`':' placeholders in pattern ('${token}') are not supported`);
  }
  if (token.includes('**')) {
    throw new Error(
      `'**' in pattern ('${token}') is not supported — a single '*' already matches any character sequence including '/'`,
    );
  }
  return { source: token, parts: token.split('*') };
}

export function keyPatternMatches(pattern: KeyPattern, key: string): boolean {
  const { parts } = pattern;
  if (parts.length === 1) return key === parts[0];
  if (!key.startsWith(parts[0])) return false;
  let tail = key.slice(parts[0].length);
  for (const middle of parts.slice(1, -1)) {
    const idx = tail.indexOf(middle);
    if (idx < 0) return false;
    tail = tail.slice(idx + middle.length);
  }
  const last = parts[parts.length - 1];
  return tail.length >= last.length && tail.endsWith(last);
}

/**
 * Strict block parser for Netlify-style `_headers` files: a non-indented pattern line,
 * then indented `Name: value` lines. A blank line closes a block; comment lines do not.
 * The first malformed line throws a {@link HeadersParseError}.
 */
export function parseHeaders(content: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  let current:
    | { lineNo: number; source: string; pattern: KeyPattern; rule: HeaderRule }
    | undefined;
  const close = () => {
    if (!current) return;
    if (current.rule.headers.length === 0 && current.rule.contentType === undefined) {
      throw new HeadersParseError(
        current.lineNo,
        current.source,
        'path block has no header lines under it',
      );
    }
    rules.push(current.rule);
    current = undefined;
  };

  const lines = content.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const raw = line.endsWith('\r') ? line.slice(0, -1) : line;
    if (raw.trim() === '') {
      close();
      return;
    }
    const stripped = stripComment(raw);
    if (stripped.trim() === '') return;

    const source = raw.trimEnd();
    const indented = stripped[0] === ' ' || stripped[0] === '\t';
    if (!indented) {
      close();
      let pattern: KeyPattern;
      try {
        pattern = parseKeyPattern(stripped.trim());
      } catch (error) {
        throw new HeadersParseError(lineNo, source, (error as Error).message);
      }
      current = { lineNo, source, pattern, rule: { pattern, headers: [] } };
      return;
    }
    if (!current) {
      throw new HeadersParseError(lineNo, source, 'indented header line outside a path block');
    }
    let parsed: HeaderField | { contentType: string };
    try {
      parsed = parseHeaderLine(stripped);
    } catch (error) {
      throw new HeadersParseError(lineNo, source, (error as Error).message);
    }
    if ('contentType' in parsed) {
      if (current.rule.contentType !== undefined) {
        throw new HeadersParseError(lineNo, source, 'duplicate `Content-Type` in the same block');
      }
      current.rule.contentType = parsed.contentType;
    } else {
      current.rule.headers.push(parsed);
    }
  });
  close();
  return rules;
}

/**
 * Response headers for `key`: every matching rule contributes, in declaration order. Values
 * of the same name (case-insensitive) are joined with `, `, except `Set-Cookie`, which stays
 * one header per value. Stable-sorted by lowercased name.
 */
export function resolveHeaders(key: string, rules: HeaderRule[]): HeaderField[] {
  const merged: HeaderField[] = [];
  const indexByName = new Map<string, number>();
  for (const rule of rules) {
    if (!keyPatternMatches(rule.pattern, key)) continue;
    for (const [name, value] of rule.headers) {
      const lower = name.toLowerCase();
      if (lower === 'set-cookie') {
        merged.push([name, value]);
        continue;
      }
      const index = indexByName.get(lower);
      if (index === undefined) {
        indexByName.set(lower, merged.length);
        merged.push([name, value]);
      } else {
        merged[index] = [merged[index][0], `${merged[index][1]}, ${value}`];
      }
    }
  }
  return merged
    .map((header, index) => ({ header, index, lower: header[0].toLowerCase() }))
    .sort((a, b) => (a.lower < b.lower ? -1 : a.lower > b.lower ? 1 : a.index - b.index))
    .map((entry) => entry.header);
}

/** The `Content-Type` override for `key`: the first matching rule that declares one. */
export function contentTypeFor(key: string, rules: HeaderRule[]): string | undefined {
  return rules.find((r) => r.contentType !== undefined && keyPatternMatches(r.pattern, key))
    ?.contentType;
}

/**
 * Splits a site into served files and its `_redirects` / `_headers` sources. Keys are
 * normalised and `_headers` content type overrides are applied, so the result is what the
 * canister stores. Throws on a malformed `_headers`.
 */
export function prepareSiteFiles(files: SyncFile[]): {
  files: SyncFile[];
  headerRules: HeaderRule[];
  redirectsSource?: string;
} {
  let redirectsSource: string | undefined;
  let headersSource: string | undefined;
  const served: SyncFile[] = [];
  for (const file of files) {
    const key = normaliseKey(file.path);
    if (key === '/' + REDIRECTS_FILENAME) {
      redirectsSource = new TextDecoder().decode(file.content);
    } else if (key === '/' + HEADERS_FILENAME) {
      headersSource = new TextDecoder().decode(file.content);
    } else {
      served.push({ ...file, path: key });
    }
  }
  const headerRules = headersSource === undefined ? [] : parseHeaders(headersSource);
  return {
    files: served.map((file) => ({
      ...file,
      contentType: contentTypeFor(file.path, headerRules) ?? file.contentType,
    })),
    headerRules,
    redirectsSource,
  };
}

/** Headers the canister computes itself or that mean nothing on a certified asset. */
const RESERVED_HEADERS: Record<string, string> = {
  'content-length': 'the canister sets it from the asset body',
  'content-encoding': 'the canister negotiates gzip/Brotli/identity per request and sets it itself',
  'transfer-encoding': 'body framing is handled by the HTTP gateway, not the canister',
  'accept-ranges': 'range handling for large assets is managed by the canister',
  'content-range':
    'the canister sets it on the certified 206 range responses it serves for large assets',
  'ic-certificate': "it carries the canister's response certificate and is canister-managed",
  'ic-certificateexpression': 'it is part of response certification and is canister-managed',
};

const TOKEN_CHARS = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function parseHeaderLine(stripped: string): HeaderField | { contentType: string } {
  const trimmed = stripped.trim();
  const colon = trimmed.indexOf(':');
  if (colon < 0) throw new Error(`header line '${trimmed}' is missing a ':' separator`);
  const name = trimmed.slice(0, colon).trim();
  const value = trimmed.slice(colon + 1).trim();
  if (!name) throw new Error('header name is empty');
  const lower = name.toLowerCase();
  if (lower === 'content-type') {
    if (!value) throw new Error("'Content-Type' value is empty");
    return { contentType: parseMediaType(value) };
  }
  if (lower === 'etag') {
    throw new Error(
      '`ETag` is managed by the canister (it is derived from the content hash); remove it from `_headers`',
    );
  }
  const reserved = RESERVED_HEADERS[lower];
  if (reserved)
    throw new Error(`\`${name}\` is reserved and cannot be set in \`_headers\`: ${reserved}`);
  if (lower === 'location') {
    throw new Error(
      `\`${name}\` does not redirect from \`_headers\`; add a rule to \`_redirects\` instead`,
    );
  }
  if (value.includes(':splat') || value.includes(':placeholder')) {
    throw new Error(
      `':splat' / ':placeholder' substitution in header value ('${value}') is a known-deferred feature`,
    );
  }
  if (!TOKEN_CHARS.test(name)) throw new Error(`invalid header name '${name}'`);
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    if ((code < 0x20 && ch !== '\t') || code === 0x7f) {
      throw new Error(`invalid header value '${value}': control characters are not allowed`);
    }
  }
  return [name, value];
}

/**
 * Validates a media type the way the `mime` crate parses it (`type/subtype` tokens, then
 * `;` parameters `name=value` with a token or quoted value) and returns the same canonical
 * text as `Mime::to_string`: the input lowercased except the values of parameters other
 * than `charset`.
 */
export function parseMediaType(input: string): string {
  const fail: (why: string) => never = (why) => {
    throw new Error(`invalid \`Content-Type\` value '${input}': ${why}`);
  };
  const isToken = (ch: string) => /^[!#$%&'*+\-.^_`|~0-9A-Za-z]$/.test(ch);
  let i = 0;
  const readToken = (what: string): string => {
    const start = i;
    while (i < input.length && isToken(input[i])) i++;
    if (i === start) {
      fail(
        i < input.length
          ? `invalid character '${input[i]}' at position ${i} in the ${what}`
          : `missing ${what}`,
      );
    }
    return input.slice(start, i);
  };
  readToken('type');
  if (input[i] !== '/') fail(i < input.length ? `expected '/' at position ${i}` : `missing '/'`);
  i++;
  readToken('subtype');
  const keepCase: Array<[number, number]> = [];
  while (i < input.length) {
    if (input[i] !== ';') fail(`invalid character '${input[i]}' at position ${i}`);
    i++;
    while (input[i] === ' ') i++;
    const name = readToken('parameter name').toLowerCase();
    if (input[i] !== '=') fail(`expected '=' after parameter '${name}'`);
    i++;
    const start = i;
    if (input[i] === '"') {
      i++;
      while (i < input.length && input[i] !== '"') i += input[i] === '\\' ? 2 : 1;
      if (i >= input.length) fail('unterminated quoted parameter value');
      i++;
    } else {
      readToken(`value of parameter '${name}'`);
    }
    if (name !== 'charset') keepCase.push([start, i]);
  }
  let out = '';
  let from = 0;
  for (const [start, end] of keepCase) {
    out += input.slice(from, start).toLowerCase() + input.slice(start, end);
    from = end;
  }
  return out + input.slice(from).toLowerCase();
}

function headersEqual(a: HeaderField[], b: HeaderField[]): boolean {
  return a.length === b.length && a.every(([n, v], i) => n === b[i][0] && v === b[i][1]);
}

/**
 * Groups operations into `execute_operations` calls: at most 500 operations and 1.5 MB
 * of inlined header bytes each (a long CSP is attached to every asset and 3xx rule).
 * An operation over the byte budget gets a call of its own.
 */
function splitOperationGroups(operations: Operation[]): Operation[][] {
  const groups: Operation[][] = [];
  let current: Operation[] = [];
  let headerBytes = 0;
  for (const op of operations) {
    const bytes = headerBytesOf(op);
    const overflow =
      current.length >= MAX_OPERATIONS_PER_GROUP ||
      headerBytes + bytes > MAX_HEADER_BYTES_PER_GROUP;
    if (overflow && current.length) {
      groups.push(current);
      current = [];
      headerBytes = 0;
    }
    current.push(op);
    headerBytes += bytes;
  }
  if (current.length) groups.push(current);
  return groups;
}

function headerBytesOf(op: Operation): number {
  const sum = (headers: HeaderField[]) =>
    headers.reduce((total, [n, v]) => total + utf8Length(n) + utf8Length(v), 0);
  if ('CreateAsset' in op) return sum(op.CreateAsset.headers);
  if ('SetAssetHeaders' in op) return sum(op.SetAssetHeaders.headers);
  if ('SetRedirectRules' in op) {
    return op.SetRedirectRules.rules.reduce((total, r) => total + sum(r.headers), 0);
  }
  return 0;
}

function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length;
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
  headers: HeaderField[];
  encodings: PreparedEncoding[];
}

interface PendingChunk {
  asset: PlannedAsset;
  enc: PreparedEncoding;
  index: number;
  data: Uint8Array;
}

async function prepareAsset(
  file: SyncFile,
  encoders: Encoder[],
  headers: HeaderField[],
): Promise<PlannedAsset> {
  const encodings: PreparedEncoding[] = [await prepareEncoding('Identity', file.content)];
  if (isCompressible(file.contentType)) {
    for (const encoder of encoders) {
      const data = await encoder.encode(file.content);
      if (data.length >= file.content.length) continue;
      encodings.push(await prepareEncoding(encoder.encoding, data));
    }
  }
  return { key: file.path, contentType: file.contentType, headers, encodings };
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
