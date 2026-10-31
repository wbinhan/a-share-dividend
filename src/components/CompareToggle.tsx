"use client";

import { useEffect, useState } from "react";
import { MAX_PICKS, onPicksChange, readPicks, writePicks, type Picked } from "./compare-store";

export default function CompareToggle({ code, name }: Picked) {
  const [picks, setPicks] = useState<Picked[]>([]);
  const [full, setFull] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setPicks(readPicks());
    sync();
    setReady(true);
    return onPicksChange(sync);
  }, []);

  const on = picks.some((p) => p.code === code);

  function toggle() {
    const list = readPicks();
    if (list.some((p) => p.code === code)) {
      writePicks(list.filter((p) => p.code !== code));
      return;
    }
    if (list.length >= MAX_PICKS) {
      setFull(true);
      window.setTimeout(() => setFull(false), 2200);
      return;
    }
    writePicks([...list, { code, name }]);
  }

  return (
    <button
      type="button"
      className="pick"
      aria-pressed={on}
      aria-label={`${on ? "从对比中移除" : "加入对比"}：${name}`}
      title={full ? `最多对比 ${MAX_PICKS} 只` : on ? "从对比中移除" : "加入对比"}
      onClick={toggle}
      data-ready={ready ? "1" : "0"}
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {on ? (
          <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}
