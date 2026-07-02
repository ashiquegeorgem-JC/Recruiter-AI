"use client";

import { Suspense } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Suspense fallback={<header className="sticky top-0 z-30 h-[72px] border-b border-[#151C30] bg-[#070B14]/80 backdrop-blur-xl" />}>
          <Topbar />
        </Suspense>
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
