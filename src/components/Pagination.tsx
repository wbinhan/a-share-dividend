import Link from "next/link";
import { qs } from "@/lib/url";

type Props = { current: Record<string, string>; page: number; pages: number };

/** 页码窗口：1 … 4 5 [6] 7 8 … 20 */
function windowPages(page: number, pages: number): (number | "…")[] {
  const set = new Set<number>([1, pages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (page >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach((n) => set.add(n));
  const list = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  list.forEach((n, i) => {
    if (i > 0 && n - (list[i - 1] as number) > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export default function Pagination({ current, page, pages }: Props) {
  if (pages <= 1) return null;
  const href = (p: number) => `/${qs(current, { page: String(p) })}`;
  return (
    <div className="pager">
      {page > 1 && <Link href={href(page - 1)}>上一页</Link>}
      {windowPages(page, pages).map((p, i) =>
        p === "…" ? (
          <span key={`gap${i}`}>…</span>
        ) : (
          <Link key={p} href={href(p)} className={p === page ? "on" : undefined}>
            {p}
          </Link>
        ),
      )}
      {page < pages && <Link href={href(page + 1)}>下一页</Link>}
      <span>
        共 {pages} 页
      </span>
    </div>
  );
}
