#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全 A 股分红数据管道
====================
数据源（均为公开接口，非官方，可能失效/限流）：
  1. 东方财富 datacenter-web  : 分红送配明细 RPT_SHAREBONUS_DET / 业绩报表 RPT_LICO_FN_CPD
  2. 腾讯行情 qt.gtimg.cn     : 实时价格、总市值、PE
  3. 新浪财经 newSinaHy.php   : 行业分类

输出：data/stocks.db (SQLite)
表：stocks / dividends / eps / metrics / meta

用法：python3 scripts/fetch_data.py [--years 10] [--skip-eps] [--skip-industry]
"""
import argparse
import json
import os
import sqlite3
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE, "data", "stocks.db")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"}

# 只保留 A 股（沪主板 60 / 科创 68 / 深主板 00 / 创业板 30），剔除新三板 43/83/87/92
A_PREFIX = ("60", "00", "30", "68")


def log(*a):
    print(datetime.now().strftime("%H:%M:%S"), *a, flush=True)


def http(url, headers=None, retry=4, timeout=30, encoding=None):
    h = dict(UA)
    if headers:
        h.update(headers)
    last = None
    for i in range(retry):
        try:
            req = urllib.request.Request(url, headers=h)
            raw = urllib.request.urlopen(req, timeout=timeout).read()
            return raw.decode(encoding, "ignore") if encoding else raw.decode("utf-8", "ignore")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.2 * (i + 1))
    raise RuntimeError(f"请求失败 {url[:120]}: {last}")


def em(params):
    url = "https://datacenter-web.eastmoney.com/api/data/v1/get?" + urllib.parse.urlencode(params)
    return json.loads(http(url, {"Referer": "https://data.eastmoney.com/"}))


def page_all(report, columns, filt, sort=None, sort_type="-1"):
    """分页拉取东财 datacenter 报表全量数据"""
    rows, page = [], 1
    while True:
        p = {"reportName": report, "columns": columns, "filter": filt,
             "pageSize": "500", "pageNumber": str(page), "source": "WEB", "client": "WEB"}
        if sort:
            p["sortColumns"], p["sortTypes"] = sort, sort_type
        d = em(p)
        res = d.get("result")
        if not res:
            break
        rows += res["data"]
        pages = res["pages"]
        if page >= pages:
            break
        page += 1
        if page % 10 == 0:
            log(f"    {report} 第 {page}/{pages} 页, 累计 {len(rows)} 条")
        time.sleep(0.08)
    return rows


# --------------------------------------------------------------------------- 分红
def fetch_dividends(years=10):
    start = f"{date.today().year - years}-01-01"
    log(f"[1/4] 分红明细 {start} 至今 ...")
    cols = ("SECURITY_CODE,SECURITY_NAME_ABBR,PRETAX_BONUS_RMB,BONUS_IT_RATIO,"
            "REPORT_DATE,EX_DIVIDEND_DATE,EQUITY_RECORD_DATE,ASSIGN_PROGRESS,IMPL_PLAN_PROFILE")
    rows = page_all("RPT_SHAREBONUS_DET", cols,
                    f"(REPORT_DATE>='{start}')(REPORT_DATE<='{date.today().year}-12-31')")
    log(f"      原始记录 {len(rows)}")
    return rows


# --------------------------------------------------------------------------- 财务
def fetch_eps(years=6):
    cur = date.today().year - 1
    log(f"[2/4] 年度业绩 {cur - years + 1}~{cur} ...")
    out = {}
    for y in range(cur - years + 1, cur + 1):
        cols = ("SECURITY_CODE,SECURITY_NAME_ABBR,REPORTDATE,BASIC_EPS,TOTAL_OPERATE_INCOME,"
                "PARENT_NETPROFIT,YSTZ,SJLTZ")
        rows = page_all("RPT_LICO_FN_CPD", cols, f"(REPORTDATE='{y}-12-31')")
        out[y] = rows
        log(f"      {y}: {len(rows)} 条")
        time.sleep(0.2)
    return out


# --------------------------------------------------------------------------- 行情+行业
def fetch_quotes():
    """东财 clist：一次分页拿全 A 股 价格/总市值/PE/PB/行业"""
    log("[3/4] 全 A 股行情 + 行业 (eastmoney clist) ...")
    fs = "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23"
    out, pn = {}, 1
    hdr = {"Referer": "https://quote.eastmoney.com/center/gridlist.html"}
    while True:
        url = ("https://push2.eastmoney.com/api/qt/clist/get?pn=%d&pz=1000&po=1&np=1"
               "&fltt=2&invt=2&fid=f3&fs=%s&fields=f2,f9,f12,f14,f20,f23,f100" % (pn, fs))
        try:
            d = json.loads(http(url, hdr))
        except Exception as e:  # noqa: BLE001
            log("      clist 失败:", e)
            break
        data = d.get("data")
        if not data or not data.get("diff"):
            break
        diff = data["diff"]
        items = diff.values() if isinstance(diff, dict) else diff
        for it in items:
            code = it.get("f12")
            if not code or not code.startswith(A_PREFIX):
                continue
            price = it.get("f2")
            if not isinstance(price, (int, float)) or price <= 0:
                price = None
            out[code] = {"name": it.get("f14"), "price": price, "mcap": it.get("f20"),
                         "pe": it.get("f9"), "pb": it.get("f23"),
                         "industry": it.get("f100")}
        if pn * 1000 >= data.get("total", 0):
            break
        pn += 1
        time.sleep(0.2)
    log(f"      拿到 {len(out)} 只")
    return out


def gtimg_prefix(code):
    return "sh" if code[0] == "6" else "sz"


def fetch_prices(codes):
    """兜底行情源（腾讯），仅在东财 clist 缺失某只股票时使用。"""
    log(f"      腾讯行情兜底 {len(codes)} 只 ...")
    px = {}
    step = 60
    for i in range(0, len(codes), step):
        chunk = codes[i:i + step]
        q = ",".join(gtimg_prefix(c) + c for c in chunk)
        try:
            raw = http("https://qt.gtimg.cn/q=" + q, {"Referer": "https://gu.qq.com/"},
                       encoding="gb18030")
        except Exception as e:  # noqa: BLE001
            log("      行情批次失败:", e)
            continue
        for line in raw.split(";"):
            if '="' not in line:
                continue
            f = line.split('="', 1)[1].split("~")
            if len(f) < 46:
                continue
            try:
                price, mcap = float(f[3]), float(f[45])
            except ValueError:
                continue
            if price <= 0:
                continue
            px[f[2]] = {"price": price, "mcap": mcap * 1e8}   # gtimg 返回「亿元」→ 统一存「元」
        if (i // step) % 10 == 0:
            log(f"      {i + len(chunk)}/{len(codes)}")
        time.sleep(0.05)
    log(f"      拿到 {len(px)} 只行情")
    return px


# --------------------------------------------------------------------------- 行业
def fetch_industry(quotes=None):
    """兜底行业源（新浪）。东财 clist 的 f100 字段已覆盖全市场，此处仅在缺失时使用。"""
    log("[4/4] 行业兜底（新浪）...")
    try:
        txt = http("https://vip.stock.finance.sina.com.cn/q/view/newSinaHy.php",
                   {"Referer": "https://finance.sina.com.cn/"}, encoding="gb18030")
        payload = json.loads(txt.split("=", 1)[1].strip().rstrip(";"))
    except Exception as e:  # noqa: BLE001
        log("      行业接口不可用，跳过:", e)
        return {}
    mapping = {}
    nodes = list(payload.keys())
    for n, node in enumerate(nodes, 1):
        name = payload[node].split(",")[1]
        try:
            url = ("https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/"
                   f"Market_Center.getHQNodeData?page=1&num=2000&sort=symbol&asc=1&node={node}")
            arr = json.loads(http(url, {"Referer": "https://finance.sina.com.cn/"}))
            for it in arr:
                mapping[it["code"]] = name
        except Exception:  # noqa: BLE001
            pass
        if n % 20 == 0:
            log(f"      行业 {n}/{len(nodes)}, 已映射 {len(mapping)} 只")
        time.sleep(0.05)
    log(f"      行业映射 {len(mapping)} 只")
    return mapping


# --------------------------------------------------------------------------- 建库
SCHEMA = """
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
  payout_latest REAL,                   -- 最新财年派息率（EPS≤0 记 NULL）
  div_years3 INTEGER,                   -- 三年中分红年数
  div_years10 INTEGER,                  -- 十年中分红年数
  stable   INTEGER,                     -- 三年连续且波动<=40%
  avg_eps3 REAL,
  last_ex_date TEXT
);

CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT);
"""


def market_of(code):
    if code.startswith("68"):
        return "科创板"
    if code.startswith("60"):
        return "沪市主板"
    if code.startswith("30"):
        return "创业板"
    if code.startswith("00"):
        return "深市主板"
    return "其他"


def build(dividends, eps_by_year, quotes, industry_fb, years=10):
    cur = date.today().year - 1
    fy3, fy2, fy1 = cur, cur - 1, cur - 2
    log(f"建库：指标财年 {fy1}/{fy2}/{fy3}")

    # 1. 合并分红（同一财年可能中期+年度两笔 → 累加）
    per_stock_year = defaultdict(lambda: defaultdict(float))
    names, last_ex = {}, {}
    div_rows = []
    for r in dividends:
        code = r["SECURITY_CODE"]
        if not code.startswith(A_PREFIX):
            continue
        if r.get("PRETAX_BONUS_RMB") is None or r.get("REPORT_DATE") is None:
            continue
        dps = round(float(r["PRETAX_BONUS_RMB"]) / 10.0, 4)   # 每10股派息 → 每股
        fy = int(r["REPORT_DATE"][:4])
        ex = (r.get("EX_DIVIDEND_DATE") or "")[:10]
        names[code] = r["SECURITY_NAME_ABBR"]
        div_rows.append((code, fy, r["REPORT_DATE"][:10], ex,
                         (r.get("EQUITY_RECORD_DATE") or "")[:10], dps,
                         r.get("IMPL_PLAN_PROFILE"), r.get("ASSIGN_PROGRESS")))
        if r.get("ASSIGN_PROGRESS") == "实施分配":
            per_stock_year[code][fy] += dps
            if ex:
                last_ex[code] = max(last_ex.get(code, ""), ex)

    # 2. EPS
    eps_tab = {}
    for y, rows in eps_by_year.items():
        for r in rows:
            code = r["SECURITY_CODE"]
            if not code.startswith(A_PREFIX):
                continue
            eps_tab[(code, y)] = r
            names.setdefault(code, r["SECURITY_NAME_ABBR"])

    # 3. 组装
    stocks, metrics = [], []
    for code, name in names.items():
        q = quotes.get(code) or {}
        price = q.get("price")
        industry = q.get("industry") or industry_fb.get(code)
        by_year = per_stock_year.get(code, {})
        dps = [round(by_year.get(y, 0.0), 4) for y in (fy1, fy2, fy3)]
        avg3 = round(sum(dps) / 3, 4)
        yield3 = round(avg3 / price * 100, 2) if price else None
        eps3 = [eps_tab.get((code, y), {}).get("BASIC_EPS") for y in (fy1, fy2, fy3)]
        # 派息率只取最新财年：三年取 max 会被「利润接近 0 的年份」撑到几百上千倍，无法解读
        eps_latest = eps3[2]
        payout_latest = round(dps[2] / eps_latest, 4) if eps_latest and eps_latest > 0 else None
        years_paid = sum(1 for d in dps if d > 0)
        years10 = sum(1 for d in by_year.values() if d > 0)
        stable = int(years_paid == 3 and min(dps) > 0 and min(dps) / max(dps) >= 0.6)
        eps_ok = [e for e in eps3 if e is not None]
        stocks.append((code, name, market_of(code), industry, int("ST" in name.upper()),
                       price, q.get("mcap"), q.get("pe"), q.get("pb"),
                       datetime.now().strftime("%Y-%m-%d %H:%M")))
        metrics.append((code, fy1, fy2, fy3, dps[0], dps[1], dps[2], avg3, yield3, payout_latest,
                        years_paid, years10, stable,
                        round(sum(eps_ok) / len(eps_ok), 4) if eps_ok else None,
                        last_ex.get(code)))

    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    con = sqlite3.connect(DB_PATH)
    con.executescript(SCHEMA)
    con.executemany("INSERT INTO stocks VALUES (?,?,?,?,?,?,?,?,?,?)", stocks)
    con.executemany("INSERT OR IGNORE INTO dividends VALUES (?,?,?,?,?,?,?,?)", div_rows)
    con.executemany("INSERT OR REPLACE INTO eps VALUES (?,?,?,?,?,?,?)",
                    [(c, y, r.get("BASIC_EPS"), r.get("PARENT_NETPROFIT"),
                      r.get("TOTAL_OPERATE_INCOME"), r.get("YSTZ"), r.get("SJLTZ"))
                     for (c, y), r in eps_tab.items()])
    con.executemany("INSERT INTO metrics VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", metrics)
    con.executemany("INSERT INTO meta VALUES (?,?)", [
        ("built_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        ("price_date", date.today().isoformat()),
        ("fy_window", f"{fy1},{fy2},{fy3}"),
        ("source", "eastmoney datacenter + eastmoney push2 clist + sina industry(fallback)"),
        ("stock_count", str(len(stocks))),
        ("div_count", str(len(div_rows))),
    ])
    con.commit()
    con.execute("VACUUM")
    con.close()
    ind_cov = sum(1 for s in stocks if s[3])
    log(f"完成 -> {DB_PATH}  ({os.path.getsize(DB_PATH) / 1e6:.1f} MB, "
        f"{len(stocks)} 只股票, {len(div_rows)} 条分红, 行业覆盖 {ind_cov})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--years", type=int, default=10)
    ap.add_argument("--skip-eps", action="store_true")
    a = ap.parse_args()
    t0 = time.time()
    div = fetch_dividends(a.years)
    codes = sorted({r["SECURITY_CODE"] for r in div if r["SECURITY_CODE"].startswith(A_PREFIX)})
    eps = {} if a.skip_eps else fetch_eps(6)
    quotes = fetch_quotes()
    missing = [c for c in codes if not quotes.get(c, {}).get("price")]
    if missing:
        for c, v in fetch_prices(missing).items():      # 腾讯兜底（价格/市值）
            q = quotes.setdefault(c, {})
            q["price"], q["mcap"] = v["price"], v["mcap"]
    ind_fb = fetch_industry()
    build(div, eps, quotes, ind_fb, a.years)
    log(f"总耗时 {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
