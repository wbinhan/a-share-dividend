import { NextResponse, type NextRequest } from "next/server";
import { listStocks, type Filters, type SortKey } from "@/lib/query";

export const dynamic = "force-dynamic";

const SORTS: SortKey[] = ["yield", "latest", "annual", "dps", "payout", "mcap", "price"];

/**
 * GET /api/stocks?q=&ind=&ymin=&pmax=&stable=1&nost=1&nofall=1&sort=yield&order=desc&page=1&pageSize=50
 * 返回榜单 JSON，供外部脚本/自选股批量调用（单次最多 200 条）。
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const num = (k: string) => {
    const v = sp.get(k);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const sortParam = sp.get("sort");
  const filters: Filters = {
    q: sp.get("q") ?? undefined,
    ind: sp.get("ind") ?? undefined,
    ymin: num("ymin"),
    pmax: num("pmax"),
    stable: sp.get("stable") === null ? true : sp.get("stable") === "1",
    nost: sp.get("nost") === null ? true : sp.get("nost") === "1",
    nofall: sp.get("nofall") === "1",
    sort: SORTS.includes(sortParam as SortKey) ? (sortParam as SortKey) : "yield",
    order: sp.get("order") === "asc" ? "asc" : "desc",
    page: num("page") ?? 1,
    pageSize: num("pageSize") ?? 50,
  };

  try {
    const res = listStocks(filters);
    return NextResponse.json(
      {
        ok: true,
        page: res.page,
        pages: res.pages,
        pageSize: res.pageSize,
        total: res.total,
        data: res.rows,
      },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=600" } },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown error" },
      { status: 500 },
    );
  }
}
