export interface CandidMethod {
  name: string;
  args: string;
  returns: string;
  query: boolean;
}

/**
 * Method list from a `.did`, enough to build a call form. Reads the statements of the
 * `service` body as `name : (args) -> (returns) [query|composite_query|oneway];`, with
 * balanced parentheses inside the tuples so nested records, variants and function
 * types stay intact. Methods declared through a named type (`m : SomeFunc;`) are skipped.
 */
export function parseCandidMethods(candid: string): CandidMethod[] {
  const serviceStart = candid.search(/service\s*:?[^{]*\{/);
  if (serviceStart < 0) return [];
  const body = candid.slice(candid.indexOf("{", serviceStart) + 1);
  const methods: CandidMethod[] = [];
  let i = 0;

  const skipWs = () => {
    while (i < body.length && /\s/.test(body[i])) i++;
  };
  const skipStatement = () => {
    const semi = body.indexOf(";", i);
    i = semi < 0 ? body.length : semi + 1;
  };
  const readTuple = (): string | null => {
    skipWs();
    if (body[i] !== "(") return null;
    const start = i;
    let depth = 0;
    for (; i < body.length; i++) {
      const c = body[i];
      if (c === '"') {
        i++;
        while (i < body.length && body[i] !== '"') {
          if (body[i] === "\\") i++;
          i++;
        }
        continue;
      }
      if (c === "(") depth++;
      else if (c === ")") {
        depth--;
        if (depth === 0) {
          i++;
          return body.slice(start + 1, i - 1).trim();
        }
      }
    }
    return null;
  };

  while (i < body.length) {
    skipWs();
    if (i >= body.length || body[i] === "}") break;

    let name: string;
    if (body[i] === '"') {
      const end = body.indexOf('"', i + 1);
      if (end < 0) break;
      name = body.slice(i + 1, end);
      i = end + 1;
    } else {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(body.slice(i));
      if (!m) {
        skipStatement();
        continue;
      }
      name = m[0];
      i += m[0].length;
    }

    skipWs();
    if (body[i] !== ":") {
      skipStatement();
      continue;
    }
    i++;
    const args = readTuple();
    skipWs();
    if (args === null || body.slice(i, i + 2) !== "->") {
      skipStatement();
      continue;
    }
    i += 2;
    const returns = readTuple();
    if (returns === null) {
      skipStatement();
      continue;
    }
    skipWs();
    const annotation = /^(query|composite_query|oneway)\b/.exec(body.slice(i));
    if (annotation) i += annotation[0].length;
    skipWs();
    if (body[i] === ";") i++;
    methods.push({ name, args, returns, query: !!annotation && annotation[1] !== "oneway" });
  }
  return methods;
}
