import Link from "next/link";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import CompareToggle from "@/components/CompareToggle";
import CompareBar from "@/components/CompareBar";
import { getIndustries, getStats, listStocks, type Filters, type SortKey } from "@/lib/query";
import { dividendDropped, money, pct, yi, yieldTone } from "@/lib/format";
import { normalize, qs, type Query } from "@/lib/url";

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

/** 表头排序链接：同一列再点一次反转方向 */
function SortTh({
  label,
  sortKey,
  current,
  order,
  activeSort,
  className = "",
  sub,
  note,
}: {
  label: string;
  sortKey: SortKey;
  current: Record<string, string>;
  order: "asc" | "desc";
  activeSort: SortKey;
  className?: string;
  sub?: { label: string; sortKey: SortKey };
  note?: string;
}) {
  const active = activeSort === sortKey;
  const next = active && order === "desc" ? "asc" : "desc";
  const href = `/${qs(current, { sort: sortKey, order: next, page: "1" })}`;
  const subActive = sub ? activeSort === sub.sortKey : false;
  const subHref = sub ? `/${qs(current, { sort: sub.sortKey, order: subActive && order === "desc" ? "asc" : "desc", page: "1" })}` : "";

  return (
    <th className={className} scope="col" aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={href} title={`按${label}排序`}>
        {label}
        <span className={`sort-mark${active ? "" : " idle"}`} aria-hidden="true">
          {active && order === "asc" ? "▲" : "▼"}
        </span>
      </Link>
      {sub ? (
        <Link href={subHref} className="sub-sort" title={`按${sub.label}排序`}>
          {sub.label}
        </Link>
      ) : null}
      {note ? <span className="sub-sort note-years">{note}</span> : null}
    </th>
  );
}

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

  const activeSort = (current.sort as SortKey | undefined) ?? "yield";
  const fy = rows[0] ? [rows[0].fy1, rows[0].fy2, rows[0].fy3] : null;

  const hasFilters =
    !!filters.q || !!filters.ind || !!filters.ymin || !!filters.pmax || !filters.stable || !filters.nost || !!filters.nofall;
  const firstIndex = (page - 1) * 50 + 1;
  const lastIndex = (page - 1) * 50 + rows.length;

  return (
    <>
      <div className="head">
        <div>
          <h1>全 A 股分红榜单</h1>
          <p>
            按最近 3 个完整财年每股税前分红的均值 ÷ 当前股价排序。「1 万元年分红」按 A 股整手规则计算：
            <strong> 1 万元实际能买几手，就按那几股算分红</strong>，剩余现金不计息。
          </p>
        </div>
        <span className="stamp" style={{ paddingBottom: 4 }}>
          <b className="num" style={{ fontWeight: 600, color: "var(--ink)" }}>
            {total.toLocaleString("zh-CN")}
          </b>
          <span>只符合当前条件</span>
        </span>
      </div>

      <div className="strip" role="group" aria-label="全市场概览">
        <div>
          <b>{stats.stocks.toLocaleString("zh-CN")}</b>
          <span>收录 A 股</span>
        </div>
        <div>
          <b>{stats.paid3.toLocaleString("zh-CN")}</b>
          <span>近 3 年连续分红</span>
        </div>
        <div>
          <b>{stats.stable.toLocaleString("zh-CN")}</b>
          <span>3 年分红额稳定</span>
        </div>
        <div>
          <b>{stats.yield5.toLocaleString("zh-CN")}</b>
          <span>股息率 ≥ 5%</span>
        </div>
        <div>
          <b>0.95%</b>
          <span>银行一年定存基准</span>
        </div>
      </div>

      <details className="method">
        <summary>
          计算口径与已知偏差
          <span className="kbd-hint">3 年均值会高估刚砍分红的公司</span>
        </summary>
        <div className="method-body">
          <p>
            <strong>股息率</strong> = 最近 3 个完整财年每股现金分红（税前）均值 ÷ 当前股价。一年分两次的（中期 + 年度）已合并为年度总额；
            某财年没分红记为 0 并计入均值，属保守估计。
          </p>
          <p>
            <strong>1 万元年分红</strong> = <code>floor(10000 ÷ 股价 ÷ 100) × 100</code> 股 × 3 年均每股分红。股价超过 100 元时
            1 万元买不起一手，年分红为 0，这是真实结果而非错误。
          </p>
          <p>
            <strong>降息</strong>标记指最新财年每股分红低于 3 年均值的 70%。这类公司的「3 年平均股息率」会高于当前真实分红水平，
            所以每一行都同时给出最新财年股息率，也可在筛选栏勾选「排除降息」直接剔除。
          </p>
          <p className="note">
            完整口径见 <Link href="/about" style={{ textDecoration: "underline" }}>口径说明</Link>。分红为税前，实际到手需按持股期限扣缴红利税；
            分红除权会使股价同步下调，股息率不等于收益率。
          </p>
        </div>
      </details>

      <FilterBar industries={industries} current={current} />

      <div className="toolbar-extra">
        <span>
          共 <b className="num" style={{ color: "var(--ink)", fontWeight: 600 }}>{total.toLocaleString("zh-CN")}</b> 只
          {rows.length > 0 ? ` · 显示 ${firstIndex}–${lastIndex}` : ""}
        </span>
        <span className="sep">·</span>
        <span>
          排序 {SORT_LABEL[filters.sort ?? "yield"]} {filters.order === "asc" ? "升序" : "降序"}
        </span>
        {hasFilters ? (
          <a className="chip" href="/">
            清除全部筛选
          </a>
        ) : null}
        <span className="push" style={{ flex: 1 }} />
        <span className="legend" aria-hidden="true">
          <span>
            <i style={{ background: "var(--scale)" }} />
            股息率 ≥ 6%
          </span>
          <span>
            <i style={{ background: "#9c8a5e" }} />
            4–6%
          </span>
          <span>
            <i style={{ background: "var(--ink-4)" }} />
            &lt; 4%
          </span>
        </span>
      </div>

      <h2 className="sr-only">分红榜单结果</h2>
      <div className="tablebox">
        <table className="wide">
          <caption className="sr-only">
            全 A 股分红榜单，按{filters.order === "asc" ? "升序" : "降序"}排列，共 {total} 只，第 {page} 页
          </caption>
          <thead>
            <tr>
              <th className="th-pick" scope="col">
                <span className="sr-only">加入对比</span>
              </th>
              <th className="al" scope="col">
                股票
              </th>
              <th className="al" scope="col">
                行业
              </th>
              <SortTh
                label="1 万年分红"
                sortKey="annual"
                current={current}
                order={filters.order ?? "desc"}
                activeSort={activeSort}
              />
              <SortTh
                label="3 年平均股息率"
                sortKey="yield"
                current={current}
                order={filters.order ?? "desc"}
                activeSort={activeSort}
                sub={{ label: "最新年", sortKey: "latest" }}
              />
              <SortTh
                label="现价"
                sortKey="price"
                current={current}
                order={filters.order ?? "desc"}
                activeSort={activeSort}
              />
              <SortTh
                label="3 年每股分红"
                sortKey="dps"
                current={current}
                order={filters.order ?? "desc"}
                activeSort={activeSort}
                note={fy ? `${fy[0]} · ${fy[1]} · ${fy[2]}` : undefined}
              />
              <SortTh
                label="派息率"
                sortKey="payout"
                current={current}
                order={filters.order ?? "desc"}
                activeSort={activeSort}
              />
              <SortTh
                label="总市值"
                sortKey="mcap"
                current={current}
                order={filters.order ?? "desc"}
                activeSort={activeSort}
              />
              <th scope="col">稳定性</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tone = yieldTone(r.yield3);
              const dropped = dividendDropped(r.dps3, r.dps_avg3);
              const delta = r.yieldLatest - r.yield3;
              const deltaCls = delta <= -0.3 ? "drop" : Math.abs(delta) < 0.3 ? "flat" : "";
              return (
                <tr key={r.code}>
                  <td className="c-pick">
                    <CompareToggle code={r.code} name={r.name} />
                  </td>
                  <td className="al c-stock">
                    <div className="row-title">
                      <Link href={`/stock/${r.code}`} className="name">
                        {r.name}
                      </Link>
                      <span className="code">{r.code}</span>
                      {r.is_st ? <span className="tag risk">ST</span> : null}
                      {dropped ? <span className="tag risk">降息</span> : null}
                    </div>
                  </td>
                  <td className="al c-industry muted">{r.industry ?? "—"}</td>

                  <td className="c-dividend">
                    <span className={`dividend${r.annual <= 0 ? " is-zero" : ""}`}>
                      {r.annual > 0 ? money(r.annual, 0) : "0"}
                      <span className="unit">元</span>
                    </span>
                    <span className="sub">
                      {r.shares > 0 ? `${r.shares.toLocaleString("zh-CN")} 股 · 花 ${money(r.cost, 0)}` : "买不起一手"}
                    </span>
                  </td>

                  <td className="c-yield">
                    <div className={`yield-cell tone-${tone}`}>
                      <span className={`bar tone-${tone}`} aria-hidden="true">
                        <i style={{ width: `${Math.min(100, (r.yield3 / 12) * 100)}%` }} />
                      </span>
                      <span className="yield-value">{pct(r.yield3)}</span>
                    </div>
                    <span className="sub">
                      最新年{" "}
                      {Math.abs(delta) >= 0.3 ? (
                        <span className={`delta ${deltaCls}`}>
                          {pct(r.yieldLatest)} {delta > 0 ? "▲" : "▼"}
                          {Math.abs(delta).toFixed(1)}
                        </span>
                      ) : (
                        <span className="delta flat">{pct(r.yieldLatest)}</span>
                      )}
                    </span>
                  </td>

                  <td className="num c-price">{money(r.price)}</td>

                  <td className="num muted c-dps">
                    <span className="yr3">
                      {r.dps1.toFixed(2)}
                      <span className="sep-dot">·</span>
                      {r.dps2.toFixed(2)}
                      <span className="sep-dot">·</span>
                      {r.dps3.toFixed(2)}
                    </span>
                    <span className="sub">均值 {r.dps_avg3.toFixed(3)}</span>
                  </td>

                  <td className={`num c-payout${r.payout_latest && r.payout_latest > 0.9 ? " over" : ""}`}>
                    {r.payout_latest ? pct(r.payout_latest * 100, 0) : "—"}
                  </td>

                  <td className="num muted c-mcap">{yi(r.mcap)}</td>

                  <td className="num c-stability">
                    {r.div_years3}/3
                    <span className="sub">
                      近 10 年 {r.div_years10} 年{!r.stable ? " · 波动" : ""}
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={10} className="empty">
                  {total > 0 ? (
                    <>
                      <h3>第 {page} 页没有数据</h3>
                      <p>
                        当前条件共有 {total.toLocaleString("zh-CN")} 只股票、{pages} 页，请求的页码超出了范围。
                      </p>
                      <div className="empty-actions">
                        <a className="btn-quiet" href={`/${qs(current, { page: "1" })}`}>
                          回到第 1 页
                        </a>
                        <a className="btn-quiet" href={`/${qs(current, { page: String(pages) })}`}>
                          跳到最后一页（第 {pages} 页）
                        </a>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3>没有符合条件的股票</h3>
                      <p>
                        {filters.q
                          ? `没有名称或代码包含「${filters.q}」的股票。`
                          : filters.ymin || filters.pmax
                            ? "当前股息率 / 派息率区间没有匹配结果。"
                            : "当前筛选组合没有匹配结果。"}
                      </p>
                      <div className="empty-actions">
                        {filters.q ? (
                          <a className="btn-quiet" href={`/${qs(current, { q: undefined, page: "1" })}`}>
                            清除搜索「{filters.q}」
                          </a>
                        ) : null}
                        <a className="btn-quiet" href="/">
                          清除全部筛选
                        </a>
                      </div>
                    </>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination current={current} page={page} pages={pages} />

      <p className="note">
        「降息」= 最新财年每股分红低于 3 年均值的 70%，此时 3 年平均股息率会高于当前真实分红水平。
        「稳定性」分别给出近 3 年与近 10 年的分红年数。
      </p>

      <CompareBar />
    </>
  );
}
