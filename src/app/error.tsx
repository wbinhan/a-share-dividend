"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="empty" style={{ borderTop: "1px solid var(--line)", paddingTop: 64 }}>
      <h3>页面没能加载出来</h3>
      <p>
        通常是数据文件（<code>data/stocks.db</code>）没有生成或正在被写入。
        <br />
        重试一次；如果仍然失败，请先运行 <code>npm run data</code> 重建数据。
      </p>
      <div className="empty-actions">
        <button type="button" onClick={() => reset()}>
          重试
        </button>
        <a className="btn-quiet" href="/">
          返回首页
        </a>
      </div>
    </div>
  );
}
