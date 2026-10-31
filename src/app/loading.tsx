export default function Loading() {
  return (
    <>
      <div className="head">
        <div style={{ width: "100%" }}>
          <span className="skeleton" style={{ width: 220, height: 18, marginBottom: 10 }} />
          <span className="skeleton" style={{ width: "min(560px, 70%)", height: 10 }} />
        </div>
      </div>
      <div className="strip" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i}>
            <span className="skeleton" style={{ width: 44, height: 16, marginBottom: 6 }} />
            <span className="skeleton" style={{ width: 62, height: 8 }} />
          </div>
        ))}
      </div>
      <p className="sr-only" role="status">
        正在加载榜单数据
      </p>
      <div style={{ paddingTop: 28 }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 0.8fr 0.7fr 0.9fr 0.7fr 0.6fr",
              gap: 16,
              alignItems: "center",
              padding: "13px 12px",
              borderBottom: "1px solid var(--line)",
            }}
            aria-hidden="true"
          >
            <span className="skeleton" style={{ width: `${58 + ((i * 13) % 34)}%`, height: 10 }} />
            <span className="skeleton" style={{ width: "54%", height: 9 }} />
            <span className="skeleton" style={{ width: "72%", height: 12 }} />
            <span className="skeleton" style={{ width: "64%", height: 9 }} />
            <span className="skeleton" style={{ width: "58%", height: 9 }} />
            <span className="skeleton" style={{ width: "48%", height: 9 }} />
          </div>
        ))}
      </div>
    </>
  );
}
