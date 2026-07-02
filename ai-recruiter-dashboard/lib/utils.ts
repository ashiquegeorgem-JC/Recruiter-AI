import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-500";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

export function scoreBg(score: number): string {
  if (score >= 75) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  if (score >= 50) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-red-500/10 text-red-500 border-red-500/20";
}

export function riskColor(level: string): string {
  switch (level) {
    case "low": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "medium": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "high": return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    case "critical": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    default: return "bg-slate-500/10 text-slate-600 border-slate-500/20";
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "new": return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    case "screening": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "shortlisted": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "interview": return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
    case "offer": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "rejected": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-slate-100 text-slate-600";
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatScore(n: number | undefined | null) {
  return Number(n ?? 0).toFixed(1)
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function chartGradient(id: string, color: string) {
  return { id, color };
}
