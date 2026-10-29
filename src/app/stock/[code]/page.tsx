import Link from "next/link";
import { notFound } from "next/navigation";
import Calculator from "@/components/Calculator";
import { getDividends, getEps, getPeers, getStock } from "@/lib/query";
import { dividendDropped, money, pct, pctSigned, yi, yieldTone } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  const s = getStock(code);
  return { title: s ? `${s.name} ${s.code} 分红详情` : "未找到该股票" };
}

export default async function StockPage({ params }: Props) {
  const { code } = await params;
  const s = getStock(code);
  if (!s) notFound();

  const [divs, eps, peers] = await Promise.all([
    Promise.resolve(getDividends(code)),
    Promise.resolve(getEps(code)),
    Promise.resolve(getPeers(code, s.industry)),
  ]);

  const byYear = new Map<number, number>();
  for (const d of divs) {
    if (d.progress !== "实施分配") continue;
    byYear.set(d.fiscal_year, (byYear.get(d.fiscal_year) ?? 0) + d.dps);
  }
  const years = [s.fy3, s.fy2, s.fy1].map((fy) => ({ fy, dps: byYear.get(fy) ?? 0 }));
  const timeline = [...byYear.entries()].sort((a, b) => b[0] - a[0]).slice(0, 10);
  const latestYield = s.price > 0 ? (s.dps3 / s.price) * 100 : null;
  const dropped = dividendDropped(s.dps3, s.dps_avg3);

  return (
    <>
      <p className="muted" style={{ marginTop: 18 }}>
        <Link href="/">← 返回榜单</Link>
      </p>

      <div className="card">
        <div className="dtitle">
          <h1>{s.name}</h1>
          <span className="code">{s.code}</span>
          <span className="tag">{s.industry ?? "未分类"}</span>
          {s.is_st ? <span className="tag st">ST</span> : null}
        </div>

        <div className="kv">
          <div>
            <b>{money(s.price)} 元</b>
            <span>最新价</span>
          </div>
          <div>
            <b className={yieldTone(s.yield3)}>{pct(s.yield3)}</b>
            <span>3 年平均股息率</span>
          </div>
          <div>
            <b className={yieldTone(latestYield)}>{pct(latestYield)}</b>
            <span>{s.fy3} 年股息率（最新财年）</span>
          </div>
          <div>
            <b>{s.dps_avg3.toFixed(3)} 元</b>
            <span>3 年平均每股分红（税前）</span>
          </div>
          <div>
            <b className={s.payout_latest && s.payout_latest > 0.9 ? "low" : ""}>
              {s.payout_latest ? pct(s.payout_latest * 100, 0) : "—"}
            </b>
            <span>最新财年派息率</span>
          </div>
          <div>
            <b>{s.div_years3}/3</b>
            <span>近 3 年分红年数</span>
          </div>
          <div>
            <b>{s.div_years10} 年</b>
            <span>近 10 年分红年数</span>
          </div>
          <div>
            <b>{yi(s.mcap)}</b>
            <span>总市值</span>
          </div>
          <div>
            <b>{s.last_ex_date ?? "—"}</b>
            <span>最近除权日</span>
          </div>
        </div>

        {dropped ? (
          <div className="warn">
            <strong>降息提示：</strong>最新财年（{s.fy3} 年）每股分红 {s.dps3.toFixed(3)} 元，只有 3 年均值{" "}
            {s.dps_avg3.toFixed(3)} 元的 {pct((s.dps3 / s.dps_avg3) * 100, 0)}。按 3 年均值算出的{" "}
            {pct(s.yield3)} 股息率可能高于当前真实分红水平。
          </div>
        ) : null}
      </div>

      <div className="grid2">
        <div className="card">
          <h2>1 万元买入能分多少（税前）</h2>
          <Calculator price={s.price} dpsAvg={s.dps_avg3} years={years} />
        </div>

        <div className="card">
          <h2>最近 10 个财年分红（每股税前，元）</h2>
          {timeline.length === 0 ? (
            <p className="muted">无分红记录</p>
          ) : (
            <div className="tablebox">
              <table>
                <thead>
                  <tr>
                    <th className="al">财年</th>
                    <th>每股分红</th>
                    <th>累计分红/手</th>
                    <th>除权日</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map(([fy, dps]) => (
                    <tr key={fy}>
                      <td className="al">{fy} 年</td>
                      <td className="hi">{dps.toFixed(3)}</td>
                      <td className="muted">{money(dps * 100, 2)} 元</td>
                      <td className="muted">
                        {divs
                          .filter((d) => d.fiscal_year === fy && d.ex_date)
                          .map((d) => d.ex_date)
                          .join("、") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="note">
            同一财年分两次（中期 + 年度）的已合并计算；含税，未扣红利税。
          </p>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>分红明细（原始方案）</h2>
          <div className="tablebox">
            <table>
              <thead>
                <tr>
                  <th className="al">财年</th>
                  <th className="al">方案</th>
                  <th>除权日</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {divs.slice(0, 20).map((d, i) => (
                  <tr key={`${d.fiscal_year}-${d.ex_date}-${i}`}>
                    <td className="al">{d.fiscal_year}</td>
                    <td className="al muted">{d.plan ?? "—"}</td>
                    <td className="muted">{d.ex_date ?? "—"}</td>
                    <td className="muted">{d.progress}</td>
                  </tr>
                ))}
                {divs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty">
                      近 10 年无分红记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>财务对照</h2>
          <div className="tablebox">
            <table>
              <thead>
                <tr>
                  <th className="al">财年</th>
                  <th>每股收益</th>
                  <th>净利润</th>
                  <th>净利同比</th>
                  <th>派息率</th>
                </tr>
              </thead>
              <tbody>
                {eps.map((e) => {
                  const dps = byYear.get(e.fiscal_year) ?? 0;
                  const pay = e.eps && e.eps > 0 ? (dps / e.eps) * 100 : null;
                  return (
                    <tr key={e.fiscal_year}>
                      <td className="al">{e.fiscal_year}</td>
                      <td>{e.eps !== null ? money(e.eps, 2) : "—"}</td>
                      <td className="muted">
                        {e.net_profit !== null ? yi(e.net_profit) : "—"}
                      </td>
                      <td className={e.np_yoy && e.np_yoy < 0 ? "low" : "hi"}>
                        {pctSigned(e.np_yoy)}
                      </td>
                      <td className={pay && pay > 90 ? "low" : ""}>{pay ? pct(pay, 0) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="note">
            派息率 &gt; 80% 通常难以长期维持；净利大幅下滑的年份，次年分红下调的概率很高。
          </p>
        </div>
      </div>

      {peers.length > 0 && (
        <div className="card">
          <h2>同行业稳定分红对照 · {s.industry}</h2>
          <div className="tablebox">
            <table>
              <thead>
                <tr>
                  <th className="al">股票</th>
                  <th>现价</th>
                  <th>3 年每股分红</th>
                  <th>3 年平均股息率</th>
                  <th>最新派息率</th>
                  <th>1 万年分红</th>
                </tr>
              </thead>
              <tbody>
                {peers.map((p) => {
                  const shares = Math.floor(10000 / p.price / 100) * 100;
                  return (
                    <tr key={p.code}>
                      <td className="al">
                        <Link href={`/stock/${p.code}`}>
                          <span className="name">{p.name}</span>{" "}
                          <span className="code">{p.code}</span>
                        </Link>
                      </td>
                      <td>{money(p.price)}</td>
                      <td className="muted">{p.dps_avg3.toFixed(3)}</td>
                      <td className={`big ${yieldTone(p.yield3)}`}>{pct(p.yield3)}</td>
                      <td>{p.payout_latest ? pct(p.payout_latest * 100, 0) : "—"}</td>
                      <td className="hi">{money(shares * p.dps_avg3, 0)} 元</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
