import Link from "next/link";
import { notFound } from "next/navigation";
import Calculator from "@/components/Calculator";
import DividendChart from "@/components/DividendChart";
import CompareToggle from "@/components/CompareToggle";
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
  const oneLotAnnual = 100 * s.dps_avg3;

  return (
    <>
      <Link href="/" className="crumb">
        ← 返回榜单
      </Link>

      <div className="identity">
        <div className="dtitle">
          <h1>{s.name}</h1>
          <span className="code" style={{ fontSize: 13 }}>
            {s.code}
          </span>
          <span className="tag">{s.industry ?? "未分类"}</span>
          {s.is_st ? <span className="tag risk">ST</span> : null}
          {dropped ? <span className="tag risk">降息</span> : null}
        </div>
        <div className="identity-meta">
          <span>最近除权日 {s.last_ex_date ?? "—"}</span>
          <span className="sep">·</span>
          <span>数据更新 {s.updated_at?.slice(0, 10) ?? "—"}</span>
          <span className="sep">·</span>
          <CompareToggle code={s.code} name={s.name} />
          <span>加入对比</span>
        </div>
      </div>

      <div className="metrics">
        <div className="metric">
          <b className={`tone-${yieldTone(s.yield3)}`}>{pct(s.yield3)}</b>
          <span>3 年平均股息率</span>
        </div>
        <div className="metric">
          <b className={`tone-${yieldTone(latestYield)}`}>{pct(latestYield)}</b>
          <span>{s.fy3} 年股息率 · 最新财年</span>
        </div>
        <div className="metric">
          <b>{money(s.price)}</b>
          <span>最新价（元）</span>
        </div>
        <div className="metric">
          <b>{s.dps_avg3.toFixed(3)}</b>
          <span>3 年均每股分红（税前）</span>
        </div>
        <div className="metric">
          <b className={s.payout_latest && s.payout_latest > 0.9 ? "is-over" : ""}>
            {s.payout_latest ? pct(s.payout_latest * 100, 0) : "—"}
          </b>
          <span>最新财年派息率</span>
        </div>
        <div className="metric">
          <b>
            {s.div_years3}/3 · {s.div_years10}/10
          </b>
          <span>近 3 年 / 近 10 年分红年数</span>
        </div>
        <div className="metric">
          <b>{yi(s.mcap)}</b>
          <span>总市值</span>
        </div>
      </div>

      {dropped ? (
        <div className="warn" role="status" style={{ marginBottom: 32 }}>
          <span aria-hidden="true">▲</span>
          <span>
            <strong>降息提示：</strong>最新财年（{s.fy3} 年）每股分红 {s.dps3.toFixed(3)} 元，只有 3 年均值{" "}
            {s.dps_avg3.toFixed(3)} 元的 {pct((s.dps3 / s.dps_avg3) * 100, 0)}。按 3 年均值算出的 {pct(s.yield3)}
            股息率可能高于当前真实分红水平，参考最新财年股息率 {pct(latestYield)}。
          </span>
        </div>
      ) : null}

      <div className="two-up" style={{ marginBottom: 48 }}>
        <section className="block">
          <div className="block-head">
            <h2>1 万元买入能分多少</h2>
            <span className="hint">税前 · 整手规则</span>
          </div>
          <Calculator price={s.price} dpsAvg={s.dps_avg3} years={years} />
        </section>

        <section className="block">
          <div className="block-head">
            <h2>最近 10 个财年每股分红</h2>
            <span className="hint">税前 · 元 / 股</span>
            <span className="push" />
            <span className="hint">一手现分 {money(oneLotAnnual, 0)} 元</span>
          </div>
          {timeline.length === 0 ? (
            <p className="muted">无分红记录。</p>
          ) : (
            <>
              <DividendChart data={timeline.map(([fy, dps]) => ({ fy, dps }))} />
              <div className="tablebox">
                <table>
                  <caption className="sr-only">最近 {timeline.length} 个财年每股分红明细</caption>
                  <thead>
                    <tr>
                      <th className="al" scope="col">
                        财年
                      </th>
                      <th scope="col">每股分红</th>
                      <th scope="col">每手分红</th>
                      <th className="al" scope="col">
                        除权日
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.map(([fy, dps]) => (
                      <tr key={fy}>
                        <td className="al num">{fy}</td>
                        <td className="num" style={{ color: "var(--ink)", fontWeight: 600 }}>
                          {dps.toFixed(3)}
                        </td>
                        <td className="num muted">{money(dps * 100, 2)}</td>
                        <td className="al muted num">
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
            </>
          )}
          <p className="note">同一财年分两次（中期 + 年度）的已合并计算；含税，未扣红利税。</p>
        </section>
      </div>

      <div className="two-up" style={{ marginBottom: 48 }}>
        <section className="block">
          <div className="block-head">
            <h2>分红明细</h2>
            <span className="hint">原始方案 · 最近 {Math.min(divs.length, 20)} 条</span>
          </div>
          <div className="tablebox">
            <table>
              <caption className="sr-only">分红方案原始记录</caption>
              <thead>
                <tr>
                  <th className="al" scope="col">
                    财年
                  </th>
                  <th className="al" scope="col">
                    方案
                  </th>
                  <th className="al" scope="col">
                    除权日
                  </th>
                  <th className="al" scope="col">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody>
                {divs.slice(0, 20).map((d, i) => (
                  <tr key={`${d.fiscal_year}-${d.ex_date}-${i}`}>
                    <td className="al num">{d.fiscal_year}</td>
                    <td className="al muted">{d.plan ?? "—"}</td>
                    <td className="al muted num">{d.ex_date ?? "—"}</td>
                    <td className="al muted">{d.progress}</td>
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
        </section>

        <section className="block">
          <div className="block-head">
            <h2>财务对照</h2>
            <span className="hint">EPS 与派息率</span>
          </div>
          <div className="tablebox">
            <table>
              <caption className="sr-only">各财年每股收益、净利润与派息率</caption>
              <thead>
                <tr>
                  <th className="al" scope="col">
                    财年
                  </th>
                  <th scope="col">每股收益</th>
                  <th scope="col">净利润</th>
                  <th scope="col">净利同比</th>
                  <th scope="col">派息率</th>
                </tr>
              </thead>
              <tbody>
                {eps.map((e) => {
                  const dps = byYear.get(e.fiscal_year) ?? 0;
                  const pay = e.eps && e.eps > 0 ? (dps / e.eps) * 100 : null;
                  return (
                    <tr key={e.fiscal_year}>
                      <td className="al num">{e.fiscal_year}</td>
                      <td className="num">{e.eps !== null ? money(e.eps, 2) : "—"}</td>
                      <td className="num muted">{e.net_profit !== null ? yi(e.net_profit) : "—"}</td>
                      <td className={`num${e.np_yoy && e.np_yoy < 0 ? " muted" : ""}`}>{pctSigned(e.np_yoy)}</td>
                      <td className={`num${pay && pay > 90 ? " muted" : ""}`}>{pay ? pct(pay, 0) : "—"}</td>
                    </tr>
                  );
                })}
                {eps.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty">
                      无财务数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="note">派息率 &gt; 80% 通常难以长期维持；净利大幅下滑的年份，次年分红下调的概率很高。</p>
        </section>
      </div>

      {peers.length > 0 && (
        <section className="block">
          <div className="block-head">
            <h2>同行业分红对照</h2>
            <span className="hint">{s.industry} · 近 3 年连续分红，按股息率排序</span>
          </div>
          <div className="tablebox">
            <table className="wide">
              <caption className="sr-only">{s.industry} 同行业分红对照</caption>
              <thead>
                <tr>
                  <th className="al" scope="col">
                    股票
                  </th>
                  <th scope="col">现价</th>
                  <th scope="col">3 年每股分红</th>
                  <th scope="col">3 年平均股息率</th>
                  <th scope="col">派息率</th>
                  <th scope="col">1 万年分红</th>
                </tr>
              </thead>
              <tbody>
                {peers.map((p) => {
                  const shares = Math.floor(10000 / p.price / 100) * 100;
                  const annual = shares * p.dps_avg3;
                  return (
                    <tr key={p.code}>
                      <td className="al c-stock">
                        <div className="row-title">
                          <Link href={`/stock/${p.code}`} className="name">
                            {p.name}
                          </Link>
                          <span className="code">{p.code}</span>
                        </div>
                      </td>
                      <td className="num c-price">{money(p.price)}</td>
                      <td className="num muted c-dps">{p.dps_avg3.toFixed(3)}</td>
                      <td className="c-yield">
                        <div className={`yield-cell tone-${yieldTone(p.yield3)}`}>
                          <span className="bar" aria-hidden="true">
                            <i style={{ width: `${Math.min(100, (p.yield3 / 12) * 100)}%` }} />
                          </span>
                          <span className="yield-value">{pct(p.yield3)}</span>
                        </div>
                      </td>
                      <td className="num c-payout">{p.payout_latest ? pct(p.payout_latest * 100, 0) : "—"}</td>
                      <td className="c-dividend">
                        <span className={`dividend${annual <= 0 ? " is-zero" : ""}`}>
                          {annual > 0 ? money(annual, 0) : "0"}
                          <span className="unit">元</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="note">
            同行业对照按 3 年平均股息率降序，仅列出近 3 年连续分红的股票。1 万年分红按整手规则计算；
            与 <Link href={`/stock/${s.code}`} style={{ textDecoration: "underline" }}>{s.name}</Link>{" "}
            的差异主要来自股价与每股分红。
          </p>
        </section>
      )}
    </>
  );
}
