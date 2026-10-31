import type { Metadata } from "next";
import Link from "next/link";
import { getMeta } from "@/lib/db";
import NavLinks from "@/components/NavLinks";
import "./globals.css";

export const metadata: Metadata = {
  title: "A 股分红雷达 · 1 万元年分红",
  description: "全 A 股分红数据、3 年平均股息率、派息率与 1 万元实际可得分红测算",
};

/** 数据超过 7 天视为过期，顶栏给出提示 */
function isStale(builtAt: string): boolean {
  const t = Date.parse(builtAt.replace(" ", "T"));
  if (Number.isNaN(t)) return false;
  return Date.now() - t > 7 * 24 * 3600 * 1000;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  let builtAt = "";
  try {
    builtAt = getMeta().built_at ?? "";
  } catch {
    builtAt = "";
  }
  const stale = builtAt ? isStale(builtAt) : true;

  return (
    <html lang="zh-CN">
      <body>
        <a href="#main" className="skip">
          跳到主要内容
        </a>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden="true" />
              A 股分红雷达
            </Link>
            <NavLinks />
            <span className="spacer" />
            <span className={`stamp${stale ? " is-stale" : ""}`} title={stale ? "数据可能已过期" : "数据在 7 天内更新"}>
              <i aria-hidden="true" />
              <span className="text">数据</span>
              <b className="num" style={{ fontWeight: 400 }}>
                {builtAt ? builtAt.slice(0, 10) : "未生成"}
              </b>
            </span>
          </div>
        </header>
        <main id="main" className="wrap">
          {children}
        </main>
        <footer>
          <div className="foot-inner">
            <div className="foot-col">
              <p>
                数据来源：东方财富公开行情与分红送配数据、腾讯行情、新浪行业分类。公开渠道抓取，可能存在延迟或缺失，
                请以交易所公告为准。
              </p>
              <p className="risk-note">
                <strong>本站仅提供数据整理与计算工具，不构成任何投资建议。</strong>
                历史分红不代表未来分红，股息率不等于收益率；分红除权会使股价同步下调。
              </p>
            </div>
            <div className="foot-col">
              <p>股息率口径：最近 3 个完整财年每股税前分红均值 ÷ 当前股价。</p>
              <p>分红数据为税前，实际到手金额需按持股期限扣缴红利税。</p>
              <p>
                完整口径见 <Link href="/about" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>口径说明</Link>
                ，或批量调用 <code style={{ fontSize: 11 }}>/api/stocks</code>。
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
