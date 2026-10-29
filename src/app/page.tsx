import Link from "next/link";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import { getIndustries, getStats, listStocks, type Filters, type SortKey } from "@/lib/query";
import { dividendDropped, money, pct, yi, yieldTone } from "@/lib/format";
import { normalize, type Query } from "@/lib/url";

export const dynamic = "force-dynamic";

const SORTS: SortKey[] = ["yield", "latest", "annual", "dps", "payout", "mcap", "price"];

const SORT_LABEL: Record<SortKey, string> = {
  yield: "3 年平均股息率",
  latest: "最新年度股息率",
  annual: "1 万元年分红",
  dps: "3 年平均每股分红",
  payout: "最新派息率",
  mcap: "总市值",
  price: "股价",
};

export default async function Home({ searchParams }: { searchParams: Promise<Query> }) {
  const current = normalize(await searchParams);
  const filters: Filters = {
    q: current.q,
    ind: current.ind,
    ymin: current.ymin ? Number(current.ymin) : undefined,
    pmax: current.pmax ? Number(current.pmax) : undefined,
    stable: current.stable === undefined ? true : current.stable === "1",
    nost: current.nost === undefined ? true : current.nost === "1",
    nofall: current.nofall === "1",
    sort: SORTS.includes(current.sort as SortKey) ? (current.sort as SortKey) : "yield",
    order: current.order === "asc" ? "asc" : "desc",
    page: current.page ? Number(current.page) : 1,
  };

  const [{ rows, total, page, pages }, stats, industries] = await Promise.all([
    Promise.resolve(listStocks(filters)),
    Promise.resolve(getStats()),
    Promise.resolve(getIndustries()),
  ]);

  return (
    <>
      <section className="hero">
        <h1>全 A 股稳定分红榜单 · 1 万元能分多少</h1>
        <p>
          口径：最近 3 个完整财年每股<strong>税前</strong>分红之和（一年两次分红的已合并），取均值 ÷ 当前股价 = 3 年平均股息率。
          「1 万元年分红」按 A 股整手规则计算：1 万元能买几手（100 股/手），就按那几股算，剩余现金不计息。
          <br />
          刚砍过分红的公司，3 年均值会高估当前水平——用「降息」标签和每行的「最新年」股息率识别。
        </p>
      </section>

      <div className="stats">
        <div className="stat">
          <b>{stats.stocks.toLocaleString("zh-CN")}</b>
          <span>收录 A 股</span>
        </div>
        <div className="stat">
          <b>{stats.paid3.toLocaleString("zh-CN")}</b>
          <span>近 3 年连续分红</span>
        </div>
        <div className="stat">
          <b>{stats.stable.toLocaleString("zh-CN")}</b>
          <span>3 年分红额稳定</span>
        </div>
        <div className="stat">
          <b>{stats.yield5.toLocaleString("zh-CN")}</b>
          <span>股息率 ≥ 5%</span>
        </div>
        <div className="stat">
          <b>0.95%</b>
          <span>银行一年定存（对比基准）</span>
        </div>
      </div>

      <FilterBar industries={industries} current={current} />

      <div className="tablebox">
        <table className="wide">
          <thead>
            <tr>
              <th className="al">股票</th>
              <th className="al">行业</th>
              <th>现价</th>
              <th>3 年每股分红</th>
              <th>3 年平均股息率</th>
              <th>最新派息率</th>
              <th>总市值</th>
              <th>1 万能买</th>
              <th>1 万年分红</th>
              <th>分红稳定性</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td className="al">
                  <Link href={`/stock/${r.code}`}>
                    <span className="name">{r.name}</span>{" "}
                    <span className="code">{r.code}</span>
                  </Link>
                  {r.is_st ? <span className="tag st">ST</span> : null}
                  {!r.stable ? <span className="tag">波动</span> : null}
                  {dividendDropped(r.dps3, r.dps_avg3) ? (
                    <span className="tag down">降息</span>
                  ) : null}
                </td>
                <td className="al muted">{r.industry ?? "—"}</td>
                <td>{money(r.price)}</td>
                <td className="muted">
                  {r.dps1.toFixed(2)} / {r.dps2.toFixed(2)} / {r.dps3.toFixed(2)}
                  <div className="code">均值 {r.dps_avg3.toFixed(3)}</div>
                </td>
                <td className={`big ${yieldTone(r.yield3)}`}>
                  {pct(r.yield3)}
                  <div className={dividendDropped(r.dps3, r.dps_avg3) ? "code down" : "code"}>
                    最新年 {pct(r.yieldLatest)}
                  </div>
                </td>
                <td className={r.payout_latest && r.payout_latest > 0.9 ? "low" : ""}>
                  {r.payout_latest ? pct(r.payout_latest * 100, 0) : "—"}
                </td>
                <td className="muted">{yi(r.mcap)}</td>
                <td>
                  {r.shares.toLocaleString("zh-CN")} 股
                  <div className="code">花 {money(r.cost, 0)}</div>
                </td>
                <td className="hi">{money(r.annual, 0)} 元</td>
                <td className="muted">
                  {r.div_years3}/3 年
                  <div className="code">近 10 年 {r.div_years10} 年</div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="empty">
                  没有符合条件的股票，试试放宽「最低股息率」或取消「仅连续 3 年分红」
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination current={current} page={page} pages={pages} />

      <p className="note">
        当前筛选结果 {total.toLocaleString("zh-CN")} 只 · 第 {page}/{pages} 页 ·
        排序：{SORT_LABEL[filters.sort ?? "yield"]} {filters.order === "asc" ? "升序" : "降序"}
        <br />
        「降息」= 最新财年每股分红低于 3 年均值的 70%，此时「3 年平均股息率」会高于当前真实分红水平。
      </p>
    </>
  );
}
