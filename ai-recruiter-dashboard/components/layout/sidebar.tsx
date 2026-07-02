"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Terminal,
  Download,
  Brain,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rankings", label: "Candidates", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/export", label: "Export Results", icon: Download },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen flex flex-col border-r transition-all duration-300 ease-in-out",
          "bg-[#070B14] border-[#151C30]",
          collapsed ? "w-[68px]" : "w-[280px]",
          "max-md:hidden"
        )}
      >
        {/* Logo Section */}
        <div className="flex items-center gap-3 px-5 h-[72px] border-b border-[#151C30]">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C4DFF] shadow-lg shadow-[#7C4DFF]/25 shrink-0">
            <Brain className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-[#F8FAFC] truncate">Recruiter AI</h1>
              <p className="text-[10px] font-medium text-[#94A3B8] uppercase tracking-wider truncate">Talent Intelligence</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-[#7C4DFF]/10 text-[#7C4DFF] shadow-sm"
                    : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151C30]"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#7C4DFF] rounded-r-full" />
                )}
                <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive && "text-[#7C4DFF]")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-[#151C30]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full h-9 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151C30] transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Bottom Section (User Profile & Status) */}
        <div className="p-4 border-t border-[#151C30] bg-[#070B14]">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-lg bg-[#151C30] border border-[#1F2942] flex items-center justify-center text-xs font-bold text-[#F8FAFC]">
                <User className="w-4 h-4 text-[#94A3B8]" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#070B14]" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#F8FAFC] truncate">AGM</p>
                <p className="text-[10px] text-emerald-400 font-medium">Founding Team • Online</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Spacer */}
      <div className={cn("shrink-0 max-md:hidden transition-all duration-300", collapsed ? "w-[68px]" : "w-[280px]")} />
    </>
  );
}
