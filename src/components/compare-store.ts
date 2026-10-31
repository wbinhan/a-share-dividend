export type Picked = { code: string; name: string };

export const MAX_PICKS = 4;
const KEY = "astock:compare";
const EVENT = "astock:compare-change";

export function readPicks(): Picked[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Picked[];
    return Array.isArray(list) ? list.filter((p) => p && typeof p.code === "string") : [];
  } catch {
    return [];
  }
}

export function writePicks(list: Picked[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_PICKS)));
  } catch {
    /* 隐私模式写入失败时静默降级为仅本次会话可用 */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function onPicksChange(fn: () => void) {
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", fn);
  };
}
