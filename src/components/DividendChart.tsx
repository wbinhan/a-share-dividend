type Point = { fy: number; dps: number };

/** 10 财年每股分红走势。纯服务端渲染，无 JS；表格是它的可访问替代。 */
export default function DividendChart({ data }: { data: Point[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.dps), 0.0001);
  const asc = [...data].sort((a, b) => a.fy - b.fy);
  const latestFy = asc[asc.length - 1]?.fy;
  const prevFy = asc[asc.length - 2]?.fy;
  const prevDps = asc[asc.length - 2]?.dps ?? 0;
  const latestDps = asc[asc.length - 1]?.dps ?? 0;

  return (
    <figure className="chart" aria-hidden="true">
      <div className="chart-bars">
        {asc.map((d) => {
          const drop = d.fy === latestFy && prevDps > 0 && latestDps < prevDps * 0.9;
          return (
            <div
              key={d.fy}
              className={`chart-col${d.fy === latestFy ? " is-latest" : ""}${drop ? " is-drop" : ""}`}
              title={`${d.fy} 年 每股 ${d.dps.toFixed(3)} 元`}
            >
              <span className="chart-val">{d.dps >= 1 ? d.dps.toFixed(1) : d.dps.toFixed(2)}</span>
              <span className="chart-bar" style={{ height: `${Math.max(2, (d.dps / max) * 100)}%` }} />
              <span className="chart-year">{String(d.fy).slice(2)}</span>
            </div>
          );
        })}
      </div>
      <figcaption className="legend">
        <span>
          <i style={{ background: "var(--scale)" }} />
          最新财年
        </span>
        <span>
          <i style={{ background: "var(--ink-4)" }} />
          历史财年
        </span>
        {prevFy && latestDps < prevDps * 0.9 ? (
          <span>
            <i style={{ background: "#8a5a3a" }} />
            最新财年同比下降
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
