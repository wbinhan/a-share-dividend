#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
行业/估值补全脚本（独立于主管道，可重复执行）
用东财 clist 全量刷新 stocks.industry / pe / pb / mcap / price。
接口为公开非官方接口，偶发限流，脚本自带退避重试。

用法：python3 scripts/fetch_industry.py
"""
import json
import os
import sqlite3
import time
import urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(BASE, "data", "stocks.db")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Referer": "https://quote.eastmoney.com/center/gridlist.html",
      "Accept": "*/*"}
FS = "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23"
HOSTS = ["https://push2.eastmoney.com", "https://push2delay.eastmoney.com", "https://82.push2.eastmoney.com"]


def get_json(url, retry=6):
    for i in range(retry):
        try:
            req = urllib.request.Request(url, headers=UA)
            return json.loads(urllib.request.urlopen(req, timeout=25).read().decode("utf-8", "ignore"))
        except Exception:
            time.sleep(1.5 * (i + 1))
    return None


def fetch_all():
    out, pn = {}, 1
    while True:
        got = None
        for host in HOSTS:
            url = (f"{host}/api/qt/clist/get?pn={pn}&pz=100&po=1&np=1&fltt=2&invt=2&fid=f3"
                   f"&fs={FS}&fields=f2,f9,f12,f14,f20,f23,f100")
            d = get_json(url)
            if d and d.get("data") and d["data"].get("diff"):
                got = d["data"]
                break
        if not got:
            print(f"页 {pn} 全部失败，中止")
            break
        diff = got["diff"]
        items = diff.values() if isinstance(diff, dict) else diff
        for it in items:
            code = it.get("f12")
            if not code:
                continue
            out[code] = it
        total = got.get("total", 0)
        print(f"页 {pn}: 累计 {len(out)}/{total}")
        if pn * 100 >= total:
            break
        pn += 1
        time.sleep(0.4)
    return out


def main():
    rows = fetch_all()
    if not rows:
        raise SystemExit("未取到数据")
    con = sqlite3.connect(DB)
    n = 0
    for code, it in rows.items():
        price = it.get("f2") if isinstance(it.get("f2"), (int, float)) and it["f2"] > 0 else None
        cur = con.execute("SELECT price FROM stocks WHERE code=?", (code,)).fetchone()
        con.execute(
            "UPDATE stocks SET industry=COALESCE(?,industry), pe=?, pb=?, mcap=COALESCE(?,mcap),"
            " price=COALESCE(?,price) WHERE code=?",
            (it.get("f100"), it.get("f9"), it.get("f23"), it.get("f20"), price, code))
        if con.execute("SELECT changes()").fetchone()[0]:
            n += 1
        if price and cur and cur[0]:
            con.execute("UPDATE metrics SET yield3=ROUND(dps_avg3/?*100,2) WHERE code=?", (price, code))
        elif price:
            con.execute("UPDATE metrics SET yield3=ROUND(dps_avg3/?*100,2) WHERE code=?", (price, code))
    import datetime
    con.execute("INSERT OR REPLACE INTO meta VALUES ('industry_refreshed_at', ?)",
                (datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),))
    con.commit()
    cov = con.execute("SELECT COUNT(*) FROM stocks WHERE industry IS NOT NULL AND industry<>''").fetchone()[0]
    tot = con.execute("SELECT COUNT(*) FROM stocks").fetchone()[0]
    con.close()
    print(f"更新 {n} 只，行业覆盖 {cov}/{tot}")


if __name__ == "__main__":
    main()
