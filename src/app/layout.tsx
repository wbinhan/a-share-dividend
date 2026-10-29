import type { Metadata } from "next";
import Link from "next/link";
import { getMeta } from "@/lib/db";
import "./globals.css";

export const metadata: Metadata = {
  title: "A 股分红雷达 · 1 万元年分红计算器",
  description: "全 A 股分红数据、3 年平均股息率、派息率与 1 万元实际可得分红测算",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  let builtAt = "";
  try {
    builtAt = getMeta().built_at ?? "";
  } catch {
    builtAt = "数据未生成";
  }
  return (
    <html lang="zh-CN">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <span className="brand">
              <span className="brand-mark" />
              A 股分红雷达
            </span>
            <nav>
              <Link href="/">分红榜单</Link>
              <Link href="/about">口径说明</Link>
            </nav>
            <span className="spacer" />
            <span className="stamp">数据更新：{builtAt}</span>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="wrap">
          <div>
            数据来源：东方财富公开行情与分红送配数据、腾讯行情、新浪行业分类。数据为公开渠道抓取，可能存在延迟或缺失，请以交易所公告为准。
          </div>
          <div>
            本站仅提供数据整理与计算工具，<strong>不构成任何投资建议</strong>。历史分红不代表未来分红，股息率不等于收益率；分红除权会使股价同步下调。
          </div>
          <div>股息率口径：最近 3 个完整财年每股税前分红均值 ÷ 当前股价。分红数据为税前，实际到手金额需按持股期限扣缴红利税。</div>
        </footer>
      </body>
    </html>
  );
}
