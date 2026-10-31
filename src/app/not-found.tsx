import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty" style={{ borderTop: "1px solid var(--line)", paddingTop: 64 }}>
      <h3>没有这只股票</h3>
      <p>
        代码可能已退市、更名，或不在当前数据范围内（收录时要求有股价与分红记录）。
        <br />
        回到榜单用名称或代码重新搜索。
      </p>
      <div className="empty-actions">
        <Link className="btn-quiet" href="/">
          返回榜单
        </Link>
      </div>
    </div>
  );
}
