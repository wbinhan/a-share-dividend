import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 是原生模块，必须交给 Node 运行时加载，不能被 bundler 打包
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
