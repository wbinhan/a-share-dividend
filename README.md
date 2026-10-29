# A 股分红雷达 · A-share Dividend Radar

用「最近 3 年平均股息率」给全 A 股排序，并把股息率折算成 **「1 万元实际每年能分到多少钱」**（按 A 股整手规则计算）。

> 数据为公开渠道抓取，**不构成投资建议**。详见 `/about` 页。

## 环境要求

- Node.js **≥ 18.18**（推荐 20 LTS）
- Python **≥ 3.9**（只在重新抓数据时需要，仅用标准库）

## 快速开始

```bash
cd a-share-dividend
npm install
npm run dev          # http://localhost:3000
```

仓库里已带一份生成好的数据（`data/stocks.db`，5,227 只股票 / 34,062 条分红 / 10 年历史），`npm install` 后可直接跑。

## 重新抓数据

```bash
npm run data           # 全量：分红(10年) + 业绩(6年) + 行情 + 行业，约 2 分钟
npm run data:industry  # 只刷新行情/行业/PE/PB（轻量）
```

输出与来源：

| 数据 | 来源 |
|---|---|
| 分红送配明细、年度业绩 | 东方财富 `datacenter-web`（`RPT_SHAREBONUS_DET` / `RPT_LICO_FN_CPD`） |
| 行情、总市值、PE/PB、行业 | 东方财富 `push2` clist |
| 兜底行情 | 腾讯 `qt.gtimg.cn` |
| 兜底行业 | 新浪 `newSinaHy.php` |

均为公开非官方接口，可能限流或变更；管道自带退避重试与多源兜底。

## 项目结构

```
a-share-dividend/
├─ docs/PRD.md                  产品需求文档（口径、验收标准、风险）
├─ docs/schema.sql              表结构
├─ scripts/fetch_data.py        全量数据管道 → data/stocks.db
├─ scripts/fetch_industry.py    行情/行业轻量刷新
├─ data/stocks.db               SQLite（只读给前端）
└─ src/
   ├─ app/page.tsx              榜单（筛选/排序/分页）
   ├─ app/stock/[code]/page.tsx 个股详情 + 1 万元计算器
   ├─ app/about/page.tsx        口径说明
   ├─ app/api/stocks/route.ts   榜单 JSON API
   ├─ components/                FilterBar / Pagination / Calculator
   └─ lib/                       db / query / format / url
```

## 核心指标口径

```
每股分红(某财年) = Σ 该财年「实施分配」方案 每10股派息 ÷ 10     ← 中期+年度自动合并
3 年平均股息率   = 3 个完整财年每股税前分红均值 ÷ 当前股价
最新年度股息率   = 最新财年每股税前分红 ÷ 当前股价               ← 识别刚降息的公司
派息率           = 最新财年每股分红 ÷ 最新财年 EPS（EPS≤0 记 N/A）
1 万可买股数     = floor(10000 ÷ 股价 ÷ 100) × 100              ← A 股整手
1 万年分红       = 1 万可买股数 × 3 年每股分红均值                ← 税前
银行对比基准     = 10000 × 0.95%（一年期定存）
```

最新财年分红低于 3 年均值 70% 的股票会打上「降息」标签——这类公司按 3 年均值算出的股息率会偏高，可用「排除最新年度降息」筛掉。

**注意**：股价 > 100 元时 1 万元买不起一手，年分红显示为 **0 元**，这是真实结果而非 bug。

## API

```bash
curl "http://localhost:3000/api/stocks?ymin=5&sort=annual&order=desc&pageSize=20"
```

参数：`q`（代码/名称）、`ind`（行业）、`ymin`（最低股息率%）、`pmax`（最高派息率%，按最新财年）、
`stable`（1=仅连续3年分红）、`nost`（1=排除ST/退市）、`nofall`（1=排除最新年度降息）、
`sort`（yield|latest|annual|dps|payout|mcap|price）、`order`（asc|desc）、`page`、`pageSize`（≤200）。
