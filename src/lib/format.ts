/** 金额：保留 2 位，加千分位 */
export function money(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** 百分比 */
export function pct(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

/** 元 → 亿元 */
export function yi(n: number | null | undefined): string {
  if (!n) return "—";
  return `${(n / 1e8).toFixed(0)} 亿`;
}

/** 带符号百分比，用于同比 */
export function pctSigned(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

/** 股息率色阶（0.0 ~ 0.10+） */
export function yieldTone(y: number | null): "low" | "mid" | "high" {
  if (!y) return "low";
  if (y >= 6) return "high";
  if (y >= 4) return "mid";
  return "low";
}

export const fyLabel = (y: number) => `${y} 年`;

/** 最新财年每股分红低于 3 年均值 70% → 均值口径会高估当前股息率 */
export function dividendDropped(dps3: number, dpsAvg3: number): boolean {
  return dpsAvg3 > 0 && dps3 < dpsAvg3 * 0.7;
}
