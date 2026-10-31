"use client";

import { useRouter } from "next/navigation";
import { readPicks, writePicks } from "./compare-store";

/** 从对比中移除一只股票：同步 localStorage 与 URL，避免两边不一致 */
export function CompareRemove({ code, id, children }: { code: string; id?: string; children?: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={id ? `移除 ${id}` : `移除 ${code}`}
      onClick={() => {
        const next = readPicks().filter((p) => p.code !== code);
        writePicks(next);
        router.push(next.length ? `/compare?codes=${next.map((p) => p.code).join(",")}` : "/compare");
      }}
    >
      {children ?? "×"}
    </button>
  );
}

export default function CompareClear({ codes }: { codes: string[] }) {
  const router = useRouter();
  if (codes.length === 0) return null;
  return (
    <button
      type="button"
      className="btn-quiet"
      onClick={() => {
        writePicks([]);
        router.push("/");
      }}
    >
      清空对比
    </button>
  );
}
