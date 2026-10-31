import Link from "next/link";
import CompareClear, { CompareRemove } from "@/components/CompareClear";
import { getStock } from "@/lib/query";
import { dividendDropped, money, pct, yi, yieldTone } from "@/lib/format";
import { normalize, type Query } from "@/lib/url";

export const dynamic = "force-dynamic";
export const metadata = { title: "多股分红对比 · A 股分红雷达" };

type Props = { searchParams: Promise<Query> };

export default async function ComparePage({ searchParams }: Props) {
  const current = normalize(await searchParams);
  const codes = (current.codes ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 4);
  const stocks = codes.map((c) => getStock(c)).filter((s): s is NonNullable<typeof s> => s !== null);

  return (
    <>
      <div className="head">
        <div>
          <h1>多股分红对比</h1>
          <p>最多 4 只。所有数字沿用榜单口径：3 年均每股税前分红 ÷ 现价；1 万年分红按整手规则计算。</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <CompareClear codes={codes} />
          <Link className="btn-quiet" href="/">
            返回榜单
          </Link>
        </div>
      </div>

      {stocks.length === 0 ? (
        <div className="empty" style={{ borderTop: "1px solid var(--line)" }}>
          <h3>还没有选择股票</h3>
          <p>在榜单或个股页点击「+」，最多选择 4 只股票后回到这里对比。</p>
          <div className="empty-actions">
            <Link className="btn-quiet" href="/">
              去榜单选择
            </Link>
          </div>
        </div>
      ) : (
        <div className="tablebox">
          <table className="compare-table">
            <caption className="sr-only">所选股票的分红指标对比</caption>
            <thead>
              <tr>
                <th className="al" scope="col">
                  指标
                </th>
                {stocks.map((s) => (
                  <th key={s.code} className="al" scope="col">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Link href={`/stock/${s.code}`} className="name">
                        {s.name}
                      </Link>
                      <CompareRemove code={s.code} id={s.name} />
                    </div>
                    <span className="sub num">{s.code}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="al" scope="row">
                  3 年平均股息率
                </th>
                {stocks.map((s) => (
                  <td key={s.code} className={`c-yield tone-${yieldTone(s.yield3)}`}>
                    <span className="yield-value" style={{ fontSize: 17 }}>
                      {pct(s.yield3)}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <th className="al" scope="row">
                  最新财年股息率
                </th>
                {stocks.map((s) => {
                  const latest = s.price > 0 ? (s.dps3 / s.price) * 100 : null;
                  const drop = dividendDropped(s.dps3, s.dps_avg3);
                  return (
                    <td key={s.code} className={`num${drop ? " delta drop" : ""}`}>
                      {pct(latest)}
                      {drop ? " 降息" : ""}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th className="al" scope="row">
                  1 万元年分红
                </th>
                {stocks.map((s) => {
                  const shares = Math.floor(10000 / s.price / 100) * 100;
                  const annual = shares * s.dps_avg3;
                  return (
                    <td key={s.code} className="c-dividend">
                      <span className={`dividend${annual <= 0 ? " is-zero" : ""}`}>
                        {annual > 0 ? money(annual, 0) : "0"}
                        <span className="unit">元</span>
                      </span>
                      <span className="sub">{shares > 0 ? `${shares} 股` : "买不起一手"}</span>
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th className="al" scope="row">
                  现价
                </th>
                {stocks.map((s) => (
                  <td key={s.code} className="num">
                    {money(s.price)} 元
                  </td>
                ))}
              </tr>
              <tr>
                <th className="al" scope="row">
                  3 年均每股分红
                </th>
                {stocks.map((s) => (
                  <td key={s.code} className="num">
                    {s.dps_avg3.toFixed(3)} 元
                  </td>
                ))}
              </tr>
              <tr>
                <th className="al" scope="row">
                  最新财年派息率
                </th>
                {stocks.map((s) => (
                  <td key={s.code} className="num">
                    {s.payout_latest ? pct(s.payout_latest * 100, 0) : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="al" scope="row">
                  近 10 年分红年数
                </th>
                {stocks.map((s) => (
                  <td key={s.code} className="num">
                    {s.div_years10} / 10
                  </td>
                ))}
              </tr>
              <tr>
                <th className="al" scope="row">
                  总市值
                </th>
                {stocks.map((s) => (
                  <td key={s.code} className="num muted">
                    {yi(s.mcap)}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="al" scope="row">
                  行业
                </th>
                {stocks.map((s) => (
                  <td key={s.code} className="al muted">
                    {s.industry ?? "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="note">
        对比结果不构成投资建议。高股息可能来自股价下跌或一次性特别股息，请结合分红稳定性与派息率判断可持续性。
      </p>
    </>
  );
}
