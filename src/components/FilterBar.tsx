type Props = {
  industries: { industry: string; n: number }[];
  current: Record<string, string>;
};

/** 纯服务端表单：GET 提交，不需要任何客户端 JS。排序在表头完成，这里只保留筛选。 */
export default function FilterBar({ industries, current }: Props) {
  const toggles = [
    { name: "stable", label: "连续 3 年", checked: current.stable !== "0" },
    { name: "nost", label: "排除 ST", checked: current.nost !== "0" },
    { name: "nofall", label: "排除降息", checked: current.nofall === "1" },
  ];

  return (
    <form className="toolbar" action="/" method="get" role="search" aria-label="筛选榜单">
      <div className="field">
        <label htmlFor="q">代码 / 名称</label>
        <input
          id="q"
          name="q"
          type="search"
          placeholder="600519 或 茅台"
          defaultValue={current.q ?? ""}
          autoComplete="off"
        />
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
        <label htmlFor="ymin">股息率 ≥ %</label>
        <input
          id="ymin"
          name="ymin"
          type="number"
          step="0.5"
          min="0"
          inputMode="decimal"
          placeholder="不限"
          defaultValue={current.ymin ?? ""}
        />
      </div>

      <div className="field">
        <label htmlFor="pmax">派息率 ≤ %</label>
        <input
          id="pmax"
          name="pmax"
          type="number"
          step="10"
          min="0"
          inputMode="numeric"
          placeholder="不限"
          defaultValue={current.pmax ?? ""}
        />
      </div>

      {/* 排序由表头链接控制，这里作为隐藏字段随表单一起提交 */}
      <input type="hidden" name="sort" value={current.sort ?? "yield"} />
      <input type="hidden" name="order" value={current.order ?? "desc"} />
      <input type="hidden" name="page" value="1" />

      <button type="submit">应用筛选</button>
      <a className="btn-quiet" href="/" title="清空全部筛选条件">
        重置
      </a>

      <div className="toggles" role="group" aria-label="筛选条件">
        {toggles.map((t) => (
          <label key={t.name} className="toggle">
            <input type="checkbox" name={t.name} value="1" defaultChecked={t.checked} />
            {t.label}
            <input type="hidden" name={t.name} value="0" />
          </label>
        ))}
      </div>
    </form>
  );
}
