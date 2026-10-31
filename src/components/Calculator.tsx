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

const fmt = (n: number, d = 2) =>
  n.toLocaleString("zh-CN", { minimumFractionDigits: d, maximumFractionDigits: d });

export default function Calculator({ price, dpsAvg, years, bankRate = 0.95 }: Props) {
  const minLot = price * LOT; // 买一手需要的钱
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

  // 1 万元买不起一手：给出最低一手的价格与分红，而不是静默显示 0
  if (calc.lots === 0) {
    const oneLotAnnual = LOT * dpsAvg;
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
              inputMode="numeric"
            />
          </div>
          <button type="button" className="btn-quiet" onClick={() => setAmount(Math.ceil(minLot))}>
            按一手 {fmt(Math.ceil(minLot), 0)} 元测算
          </button>
        </div>

        <div className="calc-empty" role="status">
          <h3>按整手规则，{fmt(calc.amt, 0)} 元买不起 1 手</h3>
          <p>
            现价 <b>{fmt(price)} 元</b>，一手（100 股）需要 <b>{fmt(minLot, 0)} 元</b>。
            A 股按整手成交，不足一手的资金不产生分红。
          </p>
          <p>
            若按最低一手买入 <b>{fmt(minLot, 0)} 元</b>，一年税前分红约 <b>{fmt(oneLotAnnual, 0)} 元</b>
            （3 年平均每股分红 {fmt(dpsAvg, 3)} 元 × 100 股）。
          </p>
        </div>

        <p className="calc-note">
          分红为税前、按最近 3 年均值估算（{years.map((y) => `${y.fy} 年 ${y.dps.toFixed(3)} 元`).join(" / ")}）。
          持股满 1 年免征红利税，1 个月至 1 年扣 10%，1 个月内扣 20%；除权日股价会等额下调。
        </p>
      </div>
    );
  }

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
            inputMode="numeric"
            aria-describedby="calc-rule"
          />
        </div>
        <div className="field">
          <span className="field-label">现价 / 3 年均每股分红</span>
          <span className="calc-static">
            {fmt(price)} 元 / {fmt(dpsAvg, 3)} 元
          </span>
        </div>
      </div>

      <div className="calc-out">
        <div>
          <b className="tone-high">{fmt(calc.annual, 0)} 元</b>
          <span>一年税前分红 · 平均每月 {fmt(calc.monthly, 1)} 元</span>
        </div>
        <div>
          <b>
            {calc.shares.toLocaleString("zh-CN")} 股
          </b>
          <span>
            {calc.lots} 手 · 实际花费 {fmt(calc.cost, 0)} 元
          </span>
        </div>
        <div>
          <b>{fmt(calc.yieldOnCost)}%</b>
          <span>按实际成交价算的股息率</span>
        </div>
        <div>
          <b className="tone-low">{fmt(calc.bank, 0)} 元</b>
          <span>同样金额存银行一年（{bankRate}%）</span>
        </div>
        <div>
          <b className={calc.multiple >= 3 ? "tone-high" : "tone-low"}>
            {calc.multiple ? `${fmt(calc.multiple, 1)} 倍` : "—"}
          </b>
          <span>分红 ÷ 银行利息</span>
        </div>
        <div>
          <b className="tone-low">{fmt(calc.rest, 0)} 元</b>
          <span>剩余现金 · 不足一手不产生分红</span>
        </div>
      </div>

      <p className="calc-note" id="calc-rule">
        A 股按整手（100 股）成交：{fmt(calc.amt, 0)} 元只能买 {calc.lots} 手，剩 {fmt(calc.rest, 0)} 元买不起一手。
        分红为税前、按最近 3 年均值估算（{years.map((y) => `${y.fy} 年 ${y.dps.toFixed(3)} 元`).join(" / ")}）；
        该股最近 3 年有未分红年份时均值会被拉低，属保守估计。持股满 1 年免征红利税，1 个月至 1 年扣 10%，
        1 个月内扣 20%；除权日股价会等额下调。
      </p>
    </div>
  );
}
