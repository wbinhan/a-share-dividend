import { getDb } from "./db";

export const PAGE_SIZE = 50;

/** 一手 = 100 股 —— A 股必须整手交易，1 万元能买多少手直接决定实际分红 */
export const LOT = 100;

export type SortKey = "yield" | "latest" | "annual" | "dps" | "price" | "mcap" | "payout";

const SORT_SQL: Record<SortKey, string> = {
  yield: "m.yield3",
  latest: "(m.dps3 / s.price)",
  // 1 万元按整手能买到的股数 × 3 年均每股分红。CAST 对正数即向下取整。
  annual: "(CAST(10000.0 / s.price / 100 AS INTEGER) * 100) * m.dps_avg3",
  dps: "m.dps_avg3",
  price: "s.price",
  mcap: "s.mcap",
  payout: "m.payout_latest",
};

export type Filters = {
  q?: string;
  ind?: string;
  ymin?: number;
  pmax?: number;
  stable?: boolean;
  nost?: boolean;
  nofall?: boolean;
  sort?: SortKey;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type Row = {
  code: string;
  name: string;
  industry: string | null;
  price: number;
  mcap: number | null;
  pe: number | null;
  pb: number | null;
  is_st: number;
  fy1: number;
  fy2: number;
  fy3: number;
  dps1: number;
  dps2: number;
  dps3: number;
  dps_avg3: number;
  yield3: number;
  payout_latest: number | null;
  div_years3: number;
  div_years10: number;
  stable: number;
  last_ex_date: string | null;
};

export type ScoredRow = Row & {
  shares: number; // 1 万元按整手能买的股数
  cost: number; // 实际花掉的钱
  rest: number; // 剩下的现金
  annual: number; // 一年税前分红（按整手）
  annualTheory: number; // 零股理论值（不计整手）
  yieldLatest: number; // 最新财年每股分红 ÷ 现价（3 年均值可能高估刚降息的公司）
};

const BASE_WHERE = "s.price > 0 AND m.yield3 IS NOT NULL";

function buildWhere(f: Filters) {
  const w: string[] = [BASE_WHERE];
  const p: unknown[] = [];
  if (f.q) {
    const like = `%${f.q.trim()}%`;
    w.push("(s.code LIKE ? OR s.name LIKE ?)");
    p.push(like, like);
  }
  if (f.ind) {
    w.push("s.industry = ?");
    p.push(f.ind);
  }
  if (f.ymin && f.ymin > 0) {
    w.push("m.yield3 >= ?");
    p.push(f.ymin);
  }
  if (f.pmax && f.pmax > 0) {
    // pmax 是百分数（60 = 60%），payout_latest 存的是小数（0.6）
    w.push("(m.payout_latest IS NULL OR m.payout_latest <= ?)");
    p.push(f.pmax / 100);
  }
  if (f.stable) w.push("m.div_years3 = 3");
  // 最新财年分红低于 3 年均值 70% 的，均值口径会把股息率算高
  if (f.nofall) w.push("m.dps3 >= m.dps_avg3 * 0.7");
  if (f.nost) {
    w.push("s.is_st = 0 AND s.name NOT LIKE '%退%'");
  }
  return { sql: w.join(" AND "), params: p };
}

function score(r: Row): ScoredRow {
  const shares = Math.floor(10000 / r.price / LOT) * LOT;
  const cost = Math.round(shares * r.price * 100) / 100;
  return {
    ...r,
    shares,
    cost,
    rest: Math.round((10000 - cost) * 100) / 100,
    annual: Math.round(shares * r.dps_avg3 * 100) / 100,
    annualTheory: Math.round((10000 / r.price) * r.dps_avg3 * 100) / 100,
    yieldLatest: Math.round((r.dps3 / r.price) * 10000) / 100,
  };
}

const SELECT = `
  SELECT s.code, s.name, s.industry, s.price, s.mcap, s.pe, s.pb, s.is_st,
         m.fy1, m.fy2, m.fy3, m.dps1, m.dps2, m.dps3, m.dps_avg3, m.yield3,
         m.payout_latest, m.div_years3, m.div_years10, m.stable, m.last_ex_date
  FROM stocks s JOIN metrics m ON m.code = s.code
`;

export function listStocks(f: Filters) {
  const db = getDb();
  const { sql, params } = buildWhere(f);
  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, f.pageSize ?? PAGE_SIZE));
  const sortKey = (f.sort ?? "yield") as SortKey;
  const sortCol = SORT_SQL[sortKey] ?? SORT_SQL.yield;
  const dir = f.order === "asc" ? "ASC" : "DESC";

  const total = (
    db
      .prepare(`SELECT COUNT(*) n FROM stocks s JOIN metrics m ON m.code=s.code WHERE ${sql}`)
      .get(...params) as { n: number }
  ).n;

  const rows = db
    .prepare(
      `${SELECT} WHERE ${sql}
       ORDER BY ${sortCol} ${dir}, s.code ASC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, (page - 1) * pageSize) as Row[];

  return { rows: rows.map(score), total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function getStats() {
  const db = getDb();
  const one = (sql: string) => (db.prepare(sql).get() as { n: number } | undefined)?.n ?? 0;
  return {
    stocks: one("SELECT COUNT(*) n FROM stocks"),
    priced: one("SELECT COUNT(*) n FROM stocks WHERE price > 0"),
    paid3: one("SELECT COUNT(*) n FROM metrics WHERE div_years3 = 3"),
    stable: one("SELECT COUNT(*) n FROM metrics WHERE stable = 1"),
    yield5: one("SELECT COUNT(*) n FROM metrics WHERE yield3 >= 5"),
  };
}

export function getIndustries() {
  return getDb()
    .prepare(
      `SELECT industry, COUNT(*) n FROM stocks
       WHERE industry IS NOT NULL AND industry <> '' AND price > 0
       GROUP BY industry HAVING n >= 3 ORDER BY n DESC`,
    )
    .all() as { industry: string; n: number }[];
}

export type StockDetail = Row & {
  updated_at: string;
};

export function getStock(code: string): StockDetail | null {
  const row = getDb()
    .prepare(
      `SELECT s.code, s.name, s.industry, s.price, s.mcap, s.pe, s.pb, s.is_st, s.updated_at,
              m.fy1, m.fy2, m.fy3, m.dps1, m.dps2, m.dps3, m.dps_avg3, m.yield3,
              m.payout_latest, m.div_years3, m.div_years10, m.stable, m.last_ex_date
       FROM stocks s JOIN metrics m ON m.code = s.code
       WHERE s.code = ?`,
    )
    .get(code) as StockDetail | undefined;
  return row ?? null;
}

export type DivEvent = {
  fiscal_year: number;
  ex_date: string | null;
  record_date: string | null;
  dps: number;
  plan: string | null;
  progress: string;
};

export function getDividends(code: string) {
  return getDb()
    .prepare(
      `SELECT fiscal_year, ex_date, record_date, dps, plan, progress
       FROM dividends WHERE code = ? ORDER BY fiscal_year DESC, ex_date DESC`,
    )
    .all(code) as DivEvent[];
}

export type EpsRow = {
  fiscal_year: number;
  eps: number | null;
  net_profit: number | null;
  revenue: number | null;
  rev_yoy: number | null;
  np_yoy: number | null;
};

export function getEps(code: string) {
  return getDb()
    .prepare(
      `SELECT fiscal_year, eps, net_profit, revenue, rev_yoy, np_yoy
       FROM eps WHERE code = ? ORDER BY fiscal_year DESC`,
    )
    .all(code) as EpsRow[];
}

export function getPeers(code: string, industry: string | null, limit = 6) {
  if (!industry) return [];
  return getDb()
    .prepare(
      `${SELECT} WHERE s.industry = ? AND s.code <> ? AND m.div_years3 = 3 AND s.price > 0
       ORDER BY m.yield3 DESC LIMIT ?`,
    )
    .all(industry, code, limit) as Row[];
}
