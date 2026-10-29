export type Query = Record<string, string | string[] | undefined>;

/** 把 searchParams 规整成普通对象（去空值） */
export function normalize(sp: Query): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val !== undefined && val !== null && val !== "") out[k] = val;
  }
  return out;
}

/** 生成带覆盖参数的查询串 */
export function qs(base: Record<string, string>, patch: Record<string, string | undefined>): string {
  const merged: Record<string, string> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === "") delete merged[k];
    else merged[k] = v;
  }
  const s = new URLSearchParams(merged).toString();
  return s ? `?${s}` : "";
}
