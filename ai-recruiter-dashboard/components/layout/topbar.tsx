"use client";

import { useState, useEffect } from "react";
import { Bell, Search, Settings, Brain } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchVal, setSearchVal] = useState("");

  // Sync state with URL parameter changes
  useEffect(() => {
    setSearchVal(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearch = (val: string) => {
    setSearchVal(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set("q", val);
    } else {
      params.delete("q");
    }
    // Update URL to trigger React state updates in pages
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-30 h-[72px] border-b border-[#151C30] bg-[#070B14]/80 backdrop-blur-xl">
      <div className="flex items-center justify-between h-full px-6 gap-6">
        {/* Left Side: Search Bar */}
        <div className="flex items-center flex-1 max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search candidates, skills, technologies..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#1F2942] bg-[#0D1220]/50 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] transition-all"
            />
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151C30] transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-[#070B14]" />
          </button>

          {/* Settings */}
          <button className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151C30] transition-colors">
            <Settings className="w-5 h-5" />
          </button>

          {/* Divider */}
          <div className="w-[1px] h-6 bg-[#151C30]" />

          {/* User Avatar */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C4DFF] to-[#6C3BEF] flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-[#7C4DFF]/20 cursor-pointer">
              AR
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
