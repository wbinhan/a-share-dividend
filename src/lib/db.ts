import Database from "better-sqlite3";
import path from "node:path";

const g = globalThis as unknown as { __astockDb?: Database.Database };

/**
 * SQLite 只读连接（单例，dev 下 hot-reload 复用）。
 * 数据由 scripts/fetch_data.py 生成，构建时不需要数据库。
 */
export function getDb(): Database.Database {
  if (g.__astockDb) return g.__astockDb;
  const file = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(process.cwd(), "data", "stocks.db");
  const db = new Database(file, { readonly: true, fileMustExist: true });
  g.__astockDb = db;
  return db;
}

export type MetaMap = Record<string, string>;

export function getMeta(): MetaMap {
  const rows = getDb().prepare("SELECT k, v FROM meta").all() as { k: string; v: string }[];
  return Object.fromEntries(rows.map((r) => [r.k, r.v]));
}
