type Props = {
  industries: { industry: string; n: number }[];
  current: Record<string, string>;
};

/** 纯服务端表单：GET 提交，不需要任何客户端 JS */
export default function FilterBar({ industries, current }: Props) {
  return (
    <form className="filters" action="/" method="get">
      <div className="field">
        <label htmlFor="q">代码 / 名称</label>
        <input id="q" name="q" type="search" placeholder="600519 或 茅台" defaultValue={current.q ?? ""} />
      </div>

      <div className="field">
        <label htmlFor="ind">行业</label>
        <select id="ind" name="ind" defaultValue={current.ind ?? ""}>
          <option value="">全部行业</option>
          {industries.map((i) => (
            <option key={i.industry} value={i.industry}>
              {i.industry}（{i.n}）
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="ymin">最低股息率 %</label>
        <input id="ymin" name="ymin" type="number" step="0.5" min="0" placeholder="0"
          defaultValue={current.ymin ?? ""} />
      </div>

      <div className="field">
        <label htmlFor="pmax">最高派息率 %（最新财年）</label>
        <input id="pmax" name="pmax" type="number" step="10" min="0" placeholder="不限制"
          defaultValue={current.pmax ?? ""} />
      </div>

      <div className="field">
        <label htmlFor="sort">排序</label>
        <select id="sort" name="sort" defaultValue={current.sort ?? "yield"}>
          <option value="yield">3 年平均股息率</option>
          <option value="latest">最新年度股息率</option>
          <option value="annual">1 万元年分红</option>
          <option value="dps">3 年每股分红</option>
          <option value="payout">最新派息率</option>
          <option value="mcap">总市值</option>
          <option value="price">股价</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="order">方向</label>
        <select id="order" name="order" defaultValue={current.order ?? "desc"}>
          <option value="desc">从高到低</option>
          <option value="asc">从低到高</option>
        </select>
      </div>

      <label className="check">
        <input type="checkbox" name="stable" value="1" defaultChecked={current.stable !== "0"} />
        仅连续 3 年分红
        <input type="hidden" name="stable" value="0" />
      </label>
      <label className="check">
        <input type="checkbox" name="nost" value="1" defaultChecked={current.nost !== "0"} />
        排除 ST / 退市
        <input type="hidden" name="nost" value="0" />
      </label>
      <label className="check">
        <input type="checkbox" name="nofall" value="1" defaultChecked={current.nofall === "1"} />
        排除最新年度降息
        <input type="hidden" name="nofall" value="0" />
      </label>

      <input type="hidden" name="page" value="1" />
      <button type="submit">筛选</button>
      <a className="tag" style={{ padding: "7px 12px", borderRadius: 8 }} href="/">
        重置
      </a>
    </form>
  );
}
