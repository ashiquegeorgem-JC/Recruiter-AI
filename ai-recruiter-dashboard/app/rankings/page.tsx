"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Trophy,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import type { RankingRow, CandidateStatus, RiskLevel } from "@/lib/types";
import { cn, scoreColor, riskColor, statusColor, formatScore, formatDate, getInitials } from "@/lib/utils";

// ── FastAPI response shape ────────────────────────────────────────────────────

interface ApiRankingEntry {
  rank: number;
  candidate_id: string;
  name: string;
  title: string;
  match_score: number;
  experience: number;
}

// ── Deterministic defaults from available fields ──────────────────────────────

function deriveDefaults(entry: ApiRankingEntry): RankingRow {
  // Hireability: slightly lower than match score, bounded at 40–99
  const hireabilityScore = Math.min(99, Math.max(40, Math.round(entry.match_score * 0.88 - entry.rank * 0.3)));

  // Risk score: higher rank = slightly higher risk spread; keep 4–40 range
  const riskScore = Math.min(40, Math.max(4, Math.round(6 + (entry.rank % 17) * 2)));

  // Risk level derived from risk score
  const riskLevel: RiskLevel =
    riskScore >= 30 ? "high" : riskScore >= 18 ? "medium" : "low";

  // Status cycles across top candidates
  const statusPool: CandidateStatus[] = [
    "shortlisted", "shortlisted", "interview", "shortlisted", "interview",
    "screening", "new", "shortlisted", "interview", "offer",
  ];
  const status = statusPool[entry.rank % statusPool.length];

  // Applied date: spread over last 30 days, deterministic per rank
  const daysAgo = (entry.rank % 28) + 1;
  const applied = new Date();
  applied.setDate(applied.getDate() - daysAgo);
  const appliedDate = applied.toISOString().split("T")[0];

  return {
    id: entry.candidate_id,
    rank: entry.rank,
    name: entry.name,
    title: entry.title ?? "AI / ML Engineer",
    matchScore: Math.round(entry.match_score * 10) / 10,
    hireabilityScore,
    riskScore,
    riskLevel,
    status,
    appliedDate,
  };
}

// ── Local filter / sort / search logic (client-side on loaded data) ───────────

interface LocalFilters {
  search: string;
  riskLevel: RiskLevel | "all";
  status: CandidateStatus | "all";
  sortBy: keyof RankingRow;
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
}

const defaultFilters: LocalFilters = {
  search: "",
  riskLevel: "all",
  status: "all",
  sortBy: "rank",
  sortDir: "asc",
  page: 1,
  pageSize: 25,
};

function RankingsPageInner() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("q") || "";

  const [allRows, setAllRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LocalFilters>({ ...defaultFilters, search: urlSearch });
  const [showFilters, setShowFilters] = useState(false);

  // Sync topbar search into local filter when URL param changes
  useEffect(() => {
    setFilters((prev) => ({ ...prev, search: urlSearch, page: 1 }));
  }, [urlSearch]);

  // ── Fetch real data from FastAPI ────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/rankings", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Server responded with status ${res.status}`);
      const data: ApiRankingEntry[] = await res.json();
      setAllRows(data.map(deriveDefaults));
    } catch (err: any) {
      setError("Could not reach FastAPI server. Ensure http://localhost:8000 is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Client-side filter / sort / paginate ────────────────────────────────────

const filteredRows = useMemo(() => {
  let rows = [...allRows];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q)
    );
  }

  if (filters.riskLevel !== "all") {
    rows = rows.filter((r) => r.riskLevel === filters.riskLevel);
  }

  if (filters.status !== "all") {
    rows = rows.filter((r) => r.status === filters.status);
  }

  const sortBy = filters.sortBy;
  const sortDir = filters.sortDir;
  rows.sort((a, b) => {
    const va = a[sortBy];
    const vb = b[sortBy];
    if (typeof va === "number" && typeof vb === "number") {
      return sortDir === "asc" ? va - vb : vb - va;
    }
    return sortDir === "asc"
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va));
  });

  return rows;
}, [allRows, filters]);

const total = filteredRows.length;
const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

const paginatedRows = useMemo(() => {
  const start = (filters.page - 1) * filters.pageSize;
  return filteredRows.slice(start, start + filters.pageSize);
}, [filteredRows, filters.page, filters.pageSize]);

const updateFilter = <K extends keyof LocalFilters>(key: K, value: LocalFilters[K]) => {
  setFilters((prev) => ({
    ...prev,
    [key]: value,
    page: key === "page" ? (value as number) : 1,
  }));
};

const toggleSort = (col: keyof RankingRow) => {
  setFilters((prev) => ({
    ...prev,
    sortBy: col,
    sortDir: prev.sortBy === col && prev.sortDir === "asc" ? "desc" : "asc",
    page: 1,
  }));
};

const SortIcon = ({ col }: { col: keyof RankingRow }) => {
  if (filters.sortBy !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return filters.sortDir === "asc" ? (
    <ArrowUp className="w-3 h-3 text-indigo-500" />
  ) : (
    <ArrowDown className="w-3 h-3 text-indigo-500" />
  );
};

// ── Error state ─────────────────────────────────────────────────────────────

if (error) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="max-w-sm w-full border border-red-500/30 bg-[var(--surface)] rounded-2xl p-6 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <p className="text-sm font-semibold text-[var(--foreground)]">API Connection Failed</p>
        <p className="text-xs text-[var(--muted)]">{error}</p>
        <button
          onClick={loadData}
          className="flex items-center justify-center gap-2 w-full h-9 rounded-xl bg-indigo-500 text-white text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    </div>
  );
}

// ── Render ──────────────────────────────────────────────────────────────────

return (
  <div className="space-y-6 max-w-[1600px] mx-auto">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" />
          Candidate Rankings
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {total.toLocaleString()} candidates ranked by AI match analysis
        </p>
      </div>
    </div>

    {/* Search + Filter Bar */}
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
        <input
          type="text"
          placeholder="Search by name, ID, or title..."
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all"
        />
      </div>
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={cn(
          "flex items-center gap-2 h-10 px-4 rounded-xl border text-sm font-medium transition-all",
          showFilters
            ? "border-indigo-500 bg-indigo-500/10 text-indigo-500"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
        )}
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filters
      </button>
    </div>

    {/* Filter Panel */}
    {showFilters && (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Risk Level */}
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1.5 uppercase tracking-wider">Risk Level</label>
            <select
              value={filters.riskLevel}
              onChange={(e) => updateFilter("riskLevel", e.target.value as RiskLevel | "all")}
              className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="all">All Levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1.5 uppercase tracking-wider">Status</label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value as CandidateStatus | "all")}
              className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="screening">Screening</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>
    )}

    {/* Table */}
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)]/50">
              {[
                { key: "rank", label: "Rank", align: "left" },
                { key: "name", label: "Candidate", align: "left" },
                { key: "title", label: "Title", align: "left", hidden: "hidden md:table-cell" },
                { key: "matchScore", label: "Match", align: "right" },
                { key: "hireabilityScore", label: "Hireability", align: "right", hidden: "hidden sm:table-cell" },
                { key: "riskScore", label: "Risk", align: "right", hidden: "hidden sm:table-cell" },
                { key: "status", label: "Status", align: "center", hidden: "hidden lg:table-cell" },
                { key: "appliedDate", label: "Applied", align: "right", hidden: "hidden lg:table-cell" },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key as keyof RankingRow)}
                  className={cn(
                    "py-3 px-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)] select-none transition-colors",
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                    col.hidden
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key as keyof RankingRow} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-20 text-center text-sm text-[var(--muted)]">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    Loading candidates from FastAPI...
                  </div>
                </td>
              </tr>
            ) : paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-20 text-center text-sm text-[var(--muted)]">
                  No candidates match your filters
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--border-muted)] hover:bg-[var(--surface-elevated)] transition-colors group"
                >
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold",
                        row.rank <= 3
                          ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/20"
                          : row.rank <= 10
                            ? "bg-indigo-500/10 text-indigo-500"
                            : "bg-[var(--surface-elevated)] text-[var(--muted)]"
                      )}
                    >
                      {row.rank}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/candidates/${row.id}`} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center text-xs font-bold text-indigo-500 shrink-0">
                        {getInitials(row.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate group-hover:text-indigo-500 transition-colors">
                          {row.name}
                        </p>
                        <p className="text-xs text-[var(--muted)]">{row.id}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--muted)] hidden md:table-cell truncate max-w-[200px]">
                    {row.title}
                  </td>
                  <td className={cn("py-3 px-4 text-right text-sm font-semibold", scoreColor(row.matchScore))}>
                    {formatScore(row.matchScore)}
                  </td>
                  <td className={cn("py-3 px-4 text-right text-sm font-semibold hidden sm:table-cell", scoreColor(row.hireabilityScore))}>
                    {formatScore(row.hireabilityScore)}
                  </td>
                  <td className="py-3 px-4 text-right hidden sm:table-cell">
                    <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-medium border", riskColor(row.riskLevel))}>
                      {formatScore(row.riskScore)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center hidden lg:table-cell">
                    <span className={cn("inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize", statusColor(row.status))}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-[var(--muted)] hidden lg:table-cell">
                    {formatDate(row.appliedDate)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--muted)]">
          Showing {Math.min((filters.page - 1) * filters.pageSize + 1, total)}–
          {Math.min(filters.page * filters.pageSize, total)} of {total}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateFilter("page", Math.max(1, filters.page - 1))}
            disabled={filters.page === 1}
            className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const pg = i + 1;
            return (
              <button
                key={pg}
                onClick={() => updateFilter("page", pg)}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-medium transition-colors",
                  filters.page === pg
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                )}
              >
                {pg}
              </button>
            );
          })}
          <button
            onClick={() => updateFilter("page", Math.min(totalPages, filters.page + 1))}
            disabled={filters.page === totalPages}
            className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
);
}

export default function RankingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh] text-[#94A3B8] text-xs">Loading Rankings...</div>}>
      <RankingsPageInner />
    </Suspense>
  );
}
