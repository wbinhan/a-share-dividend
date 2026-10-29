-- ============================================================
-- A 股分红雷达 · 表结构 (SQLite)
-- 由 scripts/fetch_data.py 生成 data/stocks.db
-- ============================================================
-- 迁 PostgreSQL 时的类型映射：
--   TEXT -> text / varchar      REAL -> double precision / numeric(18,4)
--   INTEGER -> integer / bigint DEFAULT 当前值为 '2026-10-28' 等字符串，可直接 text
--   PRIMARY KEY 复合键不变；CREATE INDEX 语法通用
--   注意：SQLite 的 REAL 在 PG 建议用 numeric(18,4) 存金额，避免浮点误差
-- ============================================================

DROP TABLE IF EXISTS stocks;
DROP TABLE IF EXISTS dividends;
DROP TABLE IF EXISTS eps;
DROP TABLE IF EXISTS metrics;
DROP TABLE IF EXISTS meta;

CREATE TABLE stocks (
  code      TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  market    TEXT,
  industry  TEXT,
  is_st     INTEGER DEFAULT 0,
  price     REAL,
  mcap      REAL,      -- 总市值（元）
  pe        REAL,
  pb        REAL,
  updated_at TEXT
);

CREATE TABLE dividends (
  code        TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  report_date TEXT,
  ex_date     TEXT,
  record_date TEXT,
  dps         REAL,       -- 每股税前分红（元）
  plan        TEXT,
  progress    TEXT,
  PRIMARY KEY (code, fiscal_year, ex_date, dps)
);
CREATE INDEX idx_div_code ON dividends(code);
CREATE INDEX idx_div_fy   ON dividends(fiscal_year);

CREATE TABLE eps (
  code        TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  eps         REAL,
  net_profit  REAL,
  revenue     REAL,
  rev_yoy     REAL,
  np_yoy      REAL,
  PRIMARY KEY (code, fiscal_year)
);

-- 预计算指标（管道每次运行重算，查询只读这张表）
CREATE TABLE metrics (
  code        TEXT PRIMARY KEY,
  fy1 INTEGER, fy2 INTEGER, fy3 INTEGER,
  dps1 REAL, dps2 REAL, dps3 REAL,      -- 三个财年的每股税前分红（含中期）
  dps_avg3 REAL,                        -- 三年均值
  yield3   REAL,                        -- 三年均值 / 现价
  payout_latest REAL,                   -- 最新财年派息率（dps3 / EPS3，EPS≤0 记 NULL）
  div_years3 INTEGER,                   -- 三年中分红年数
  div_years10 INTEGER,                  -- 十年中分红年数
  stable   INTEGER,                     -- 三年连续且波动<=40%
  avg_eps3 REAL,
  last_ex_date TEXT
);

CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT);
