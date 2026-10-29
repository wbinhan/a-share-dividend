"use client";

import { useMemo, useState } from "react";

type YearDps = { fy: number; dps: number };

type Props = {
  price: number;
  dpsAvg: number;
  years: YearDps[];
  /** 银行一年期定存利率 %（对比基准） */
  bankRate?: number;
};

const LOT = 100;

export default function Calculator({ price, dpsAvg, years, bankRate = 0.95 }: Props) {
  const [amount, setAmount] = useState(10000);

  const calc = useMemo(() => {
    const amt = Number.isFinite(amount) && amount > 0 ? amount : 0;
    const lots = Math.floor(amt / (price * LOT));
    const shares = lots * LOT;
    const cost = shares * price;
    const annual = shares * dpsAvg;
    const bank = (amt * bankRate) / 100;
    const yieldOnCost = cost > 0 ? (annual / cost) * 100 : 0;
    return {
      amt,
      lots,
      shares,
      cost,
      rest: amt - cost,
      annual,
      monthly: annual / 12,
      bank,
      multiple: bank > 0 ? annual / bank : 0,
      yieldOnCost,
    };
  }, [amount, price, dpsAvg, bankRate]);

  const fmt = (n: number, d = 2) =>
    n.toLocaleString("zh-CN", { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div>
      <div className="calc">
        <div className="field">
          <label htmlFor="amt">投入金额（元）</label>
          <input
            id="amt"
            type="number"
            step={1000}
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={{ width: 150 }}
          />
        </div>
        <div className="field">
          <label>现价 / 3 年均每股分红</label>
          <div style={{ padding: "7px 2px" }}>
            {fmt(price)} 元 / {fmt(dpsAvg, 3)} 元
          </div>
        </div>
      </div>

      <div className="calc-out">
        <div>
          <b>{calc.shares.toLocaleString("zh-CN")} 股</b>
          <span>
            {calc.lots} 手 · 实际花费 {fmt(calc.cost, 0)} 元
          </span>
        </div>
        <div>
          <b className="hi">{fmt(calc.annual, 0)} 元</b>
          <span>一年税前分红</span>
        </div>
        <div>
          <b>{fmt(calc.monthly, 1)} 元</b>
          <span>平均每月</span>
        </div>
        <div>
          <b>{fmt(calc.yieldOnCost)}%</b>
          <span>按实际成本算的股息率</span>
        </div>
        <div>
          <b>{fmt(calc.bank, 0)} 元</b>
          <span>同样钱存银行一年（{bankRate}%）</span>
        </div>
        <div>
          <b className={calc.multiple >= 3 ? "hi" : "mid"}>
            {calc.multiple ? `${fmt(calc.multiple, 1)} 倍` : "—"}
          </b>
          <span>分红 ÷ 银行利息</span>
        </div>
      </div>

      <p className="note">
        · A 股按整手（100 股）成交：{fmt(calc.amt, 0)} 元只能买 {calc.lots} 手，
        剩 {fmt(calc.rest, 0)} 元现金买不起一手，不产生分红。
        <br />· 分红为税前、按最近 3 年均值估算（{years.map((y) => `${y.fy} 年 ${y.dps.toFixed(3)} 元`).join(" / ")}），
        该股最近 3 年有未分红年份时，均值会被拉低，属保守估计。
        <br />· 持股满 1 年免征红利税，1 个月至 1 年扣 10%，1 个月内扣 20%；分红除权日股价会等额下调。
      </p>
    </div>
  );
}
