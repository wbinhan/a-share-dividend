"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onPicksChange, readPicks, writePicks, type Picked } from "./compare-store";

export default function CompareBar() {
  const [picks, setPicks] = useState<Picked[]>([]);

  useEffect(() => {
    const sync = () => setPicks(readPicks());
    sync();
    return onPicksChange(sync);
  }, []);

  if (picks.length === 0) return null;

  return (
    <div className="compare-bar" role="region" aria-label="对比栏">
      <div className="shown">
        <span className="muted" style={{ border: 0, padding: 0 }}>
          对比
        </span>
        {picks.map((p) => (
          <span key={p.code}>
            {p.name}
            <button
              type="button"
              aria-label={`移除 ${p.name}`}
              onClick={() => writePicks(readPicks().filter((x) => x.code !== p.code))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <Link className="btn-quiet" href={`/compare?codes=${picks.map((p) => p.code).join(",")}`}>
        对比 {picks.length} 只
      </Link>
    </div>
  );
}
