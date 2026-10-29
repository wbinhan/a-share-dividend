import { getMeta } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "口径说明 · A 股分红雷达" };

export default function About() {
  let meta: Record<string, string> = {};
  try {
    meta = getMeta();
  } catch {
    meta = {};
  }

  return (
    <>
      <section className="hero">
        <h1>计算口径与数据说明</h1>
        <p>所有数字都基于下面的口径，看榜单前建议先读这一页——股息率是个很容易被算错的指标。</p>
      </section>

      <div className="card">
        <h2>1. 股息率</h2>
        <p className="muted">
          股息率 = 最近 3 个完整财年平均每股现金分红（税前） ÷ 当前股价。
          <br />
          用 3 年均值而不是只看去年，是为了过滤周期股在盈利高峰年份的异常高分红；
          用当前股价而不是历史除权价，是回答「<strong>现在这个价格买进去，能拿多少</strong>」。
        </p>
        <p className="muted">
          榜单同时给出<strong>最新年度股息率</strong>（最新财年每股分红 ÷ 现价）。
          最新财年分红低于 3 年均值 70% 的股票会标「<span className="tag down">降息</span>」——
          此时 3 年均值会<strong>高估</strong>当前的真实分红水平，可以用筛选栏的「排除最新年度降息」直接剔除。
        </p>
      </div>

      <div className="card">
        <h2>2. 分红口径</h2>
        <ul className="muted">
          <li>只统计「<strong>实施分配</strong>」的方案，预披露/取消不计。</li>
          <li>同一财年分两次（中期 + 年度）的，<strong>合并为年度总额</strong>。</li>
          <li>金额为<strong>税前</strong>（含税），未扣红利税：持股满 1 年免税，1 个月–1 年扣 10%，1 个月内扣 20%。</li>
          <li>某财年没有分红记为 0 并计入均值（保守估计）；近 3 年分红额波动超过 40% 的标记为「波动」。</li>
          <li>
            <strong>派息率只看最新财年</strong>：每股分红 ÷ 最新财年每股收益。之前用「3 年最高派息率」，
            遇到利润接近 0 的年份会算出几百上千倍，无法解读；最新财年 EPS ≤ 0（亏损）时显示「—」。
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>3. 1 万元年分红（核心指标）</h2>
        <p className="muted">
          A 股必须整手交易（1 手 = 100 股）。所以 1 万元实际只能买
          <code> floor(10000 ÷ 股价 ÷ 100) × 100 </code>
          股，剩余现金买不起一手、也不产生分红。
          <br />
          例：股价 1330 元 → 1 万元连一手都买不起 → 分红 <strong>0 元</strong>；股价 4.58 元 → 能买 2100 股 → 按 3 年均值 0.272 元/股 → 年分红 <strong>571 元</strong>。
        </p>
      </div>

      <div className="card">
        <h2>4. 数据来源与更新</h2>
        <ul className="muted">
          <li>分红送配明细、年度业绩：东方财富 datacenter 公开接口</li>
          <li>行情、总市值、PE/PB、行业分类：东方财富 push2 行情接口</li>
          <li>兜底源：腾讯行情（qt.gtimg.cn）、新浪行业分类</li>
          <li>更新方式：手动运行 <code>npm run data</code>，或按 PRD 里的定时任务每日 18:00 跑</li>
        </ul>
        <p className="note">
          当前数据：建库时间 {meta.built_at ?? "—"}，指标财年 {meta.fy_window ?? "—"}，
          收录 {meta.stock_count ?? "—"} 只股票，分红记录 {meta.div_count ?? "—"} 条。
        </p>
      </div>

      <div className="card">
        <h2>5. 免责声明</h2>
        <p className="muted">
          本站是数据工具，<strong>不是投资建议</strong>。高股息不等于高回报：分红除权日股价会等额下调，
          真正的总回报 = 分红 + 股价涨跌 − 红利税。历史分红不代表未来，
          周期股与一次性特别股息尤其容易让「去年股息率」变成陷阱。
        </p>
      </div>
    </>
  );
}
