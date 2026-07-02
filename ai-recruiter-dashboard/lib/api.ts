// =============================================
// API Client — Redrob AI Talent Intelligence
// Dashboard: Real FastAPI (http://127.0.0.1:8000)
// Other pages: Mock data shims for compatibility
// =============================================

// ── Legacy type imports for secondary pages ──────────────────────────────────

import type {
  Stats,
  Candidate,
  RankingRow,
  AnalyticsData,
  PaginatedResponse,
  RankingFilters,
} from "./types";

import {
  mockStats,
  mockTop100,
  mockRankingRows,
  mockAnalytics,
} from "./mock-data";

// ── FastAPI Backend Config ────────────────────────────────────────────────────

const API_BASE_URL = "http://localhost:8000";

// ── FastAPI Response Types ────────────────────────────────────────────────────

export interface BackendStats {
  total_candidates: number;
  top_candidates: number;
}

export interface BackendTop100Entry {
  candidate_id: string;
  score: number;
}

export interface BackendCandidateProfile {
  anonymized_name: string;
  headline: string;
  summary: string;
  location: string;
  country?: string;
  years_of_experience: number;
  current_title?: string;
  current_company?: string;
  current_industry?: string;
}

export interface BackendSkill {
  name: string;
  proficiency: string;
  endorsements: number;
}

export interface BackendCareerEntry {
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description: string;
}

export interface BackendEducationEntry {
  institution: string;
  degree: string;
  field_of_study: string;
  start_year: number;
  end_year: number | null;
  grade?: string;
  tier?: string;
}

export interface BackendRedrobSignals {
  github_activity_score?: number;
  saved_by_recruiters_30d?: number;
  interview_completion_rate?: number;
  recruiter_response_rate?: number;
  open_to_work_flag?: boolean;
  notice_period_days?: number;
  profile_completeness_score?: number;
  connection_count?: number;
  endorsements_received?: number;
  preferred_work_mode?: string;
  willing_to_relocate?: boolean;
}

export interface BackendCandidate {
  candidate_id: string;
  profile: BackendCandidateProfile;
  skills: BackendSkill[];
  career_history: BackendCareerEntry[];
  education: BackendEducationEntry[];
  redrob_signals: BackendRedrobSignals;
  error?: string;
}

// ── Shared FastAPI fetch utility ──────────────────────────────────────────────

async function directFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `FastAPI server error (status: ${res.status}). Is http://127.0.0.1:8000 running?`
    );
  }
  return res.json();
}

// ═════════════════════════════════════════════════════════════════════════════
// Real FastAPI Endpoints — used by the main dashboard (app/page.tsx)
// ═════════════════════════════════════════════════════════════════════════════

export async function fetchStats(): Promise<BackendStats> {
  return directFetch<BackendStats>("/stats");
}

export async function fetchTop100(): Promise<BackendTop100Entry[]> {
  return directFetch<BackendTop100Entry[]>("/top100");
}

export async function fetchCandidateDetails(
  candidateId: string
): Promise<BackendCandidate> {
  const candidate = await directFetch<BackendCandidate>(
    `/candidate/${candidateId}`
  );
  if (candidate.error) {
    throw new Error(candidate.error);
  }
  return candidate;
}

// ═════════════════════════════════════════════════════════════════════════════
// Legacy shim functions — mock data for secondary pages
// (rankings, analytics, export, candidates/[id])
// ═════════════════════════════════════════════════════════════════════════════

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getStats(): Promise<Stats> {
  await delay(300);
  return mockStats;
}

export async function getTop100(): Promise<Candidate[]> {
  await delay(350);
  return mockTop100;
}

export async function getCandidate(id: string): Promise<Candidate> {
  await delay(200);
  const candidate = mockTop100.find((c) => c.id === id);
  if (!candidate) throw new Error(`Candidate ${id} not found`);
  return candidate;
}

export async function getAnalytics(): Promise<AnalyticsData> {
  await delay(300);
  return mockAnalytics;
}

export async function getRankedCandidates(
  filters: Partial<RankingFilters>
): Promise<PaginatedResponse<RankingRow>> {
  await delay(250);

  let rows = [...mockRankingRows];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q)
    );
  }

  if (filters.riskLevel && filters.riskLevel !== "all") {
    rows = rows.filter((r) => r.riskLevel === filters.riskLevel);
  }

  if (filters.status && filters.status !== "all") {
    rows = rows.filter((r) => r.status === filters.status);
  }

  if (filters.minMatchScore !== undefined) {
    rows = rows.filter((r) => r.matchScore >= filters.minMatchScore!);
  }

  if (filters.maxMatchScore !== undefined) {
    rows = rows.filter((r) => r.matchScore <= filters.maxMatchScore!);
  }

  const sortBy = (filters.sortBy ?? "rank") as keyof RankingRow;
  const sortDir = filters.sortDir ?? "asc";
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

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const total = rows.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);

  return { data: paged, total, page, pageSize, totalPages };
}
