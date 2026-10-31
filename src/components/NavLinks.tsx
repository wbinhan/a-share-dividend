"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "分红榜单", match: (p: string) => p === "/" || p.startsWith("/stock") },
  { href: "/about", label: "口径说明", match: (p: string) => p.startsWith("/about") },
];

export default function NavLinks() {
  const pathname = usePathname() ?? "/";
  return (
    <nav aria-label="主导航">
      {LINKS.map((l) => {
        const active = l.match(pathname);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
