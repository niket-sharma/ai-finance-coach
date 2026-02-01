"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { href: "/", icon: "📊", label: "Dashboard" },
  { href: "/transactions", icon: "💳", label: "Transactions" },
  { href: "/insights", icon: "🧠", label: "AI Insights" },
  { href: "/investments", icon: "📈", label: "Investments" },
  { href: "/market", icon: "🌍", label: "Market" },
  { href: "/recommendations", icon: "💡", label: "Signals" },
  { href: "/agent", icon: "🤖", label: "Trading Agent" },
  { href: "/settings", icon: "⚙️", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#161822] border-r border-[#2a2f44] z-40 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#2a2f44]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#6366f1] flex items-center justify-center text-lg">
            💰
          </div>
          <div>
            <h1 className="text-white font-semibold text-base leading-tight">Finance Coach</h1>
            <p className="text-[#64748b] text-xs">AI-Powered</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? "bg-[#6366f1]/10 text-[#6366f1] shadow-sm"
                  : "text-[#94a3b8] hover:bg-[#1a1d2e] hover:text-[#eef2ff]"
                }
              `}
            >
              <span className="text-lg w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#6366f1]"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-[#2a2f44]">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-[#6366f1]/20 flex items-center justify-center text-sm">
            👤
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#eef2ff] text-xs font-medium truncate">User</p>
            <p className="text-[#64748b] text-xs">v2.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
