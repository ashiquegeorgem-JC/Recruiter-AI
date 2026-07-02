// =========================================
// Core TypeScript Types — AI Recruiter Dashboard
// =========================================

export interface Stats {
  totalCandidates: number;
  averageMatchScore: number;
  topRankedCount: number;
  highRiskCount: number;
  shortlistedCount: number;
  newThisWeek: number;
  scoreChange: number; // % change from last period
  riskChange: number;
}

export interface Candidate {
  id: string;
  rank: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  avatarUrl?: string;
  title: string;
  yearsOfExperience: number;
  matchScore: number;       // 0–100
  hireabilityScore: number; // 0–100
  riskScore: number;        // 0–100 (higher = more risk)
  status: CandidateStatus;
  appliedDate: string;      // ISO date
  skills: Skill[];
  careerHistory: CareerEntry[];
  education: EducationEntry[];
  behavioralSignals: BehavioralSignal[];
  matchExplanation: MatchExplanation;
  summary: string;
}

export type CandidateStatus =
  | "new"
  | "screening"
  | "shortlisted"
  | "interview"
  | "offer"
  | "rejected";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface Skill {
  name: string;
  proficiency: number; // 0–100
  yearsUsed: number;
  category: SkillCategory;
}

export type SkillCategory =
  | "technical"
  | "soft"
  | "domain"
  | "language"
  | "tool";

export interface CareerEntry {
  company: string;
  role: string;
  startDate: string;
  endDate: string | null; // null = current
  description: string;
  highlights: string[];
  logoUrl?: string;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  field: string;
  startYear: number;
  endYear: number | null;
  gpa?: number;
  honors?: string;
}

export interface BehavioralSignal {
  trait: string;
  score: number;    // 0–100
  confidence: number; // 0–100
  sentiment: "positive" | "neutral" | "negative";
}

export interface MatchExplanation {
  overallScore: number;
  dimensions: MatchDimension[];
  strengths: string[];
  gaps: string[];
  aiNarrative: string;
}

export interface MatchDimension {
  name: string;
  score: number;
  weight: number;
  description: string;
}

// =========================================
// Rankings
// =========================================

export interface RankingRow {
  rank: number;
  id: string;
  name: string;
  title: string;
  matchScore: number;
  hireabilityScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  status: CandidateStatus;
  appliedDate: string;
}

export interface RankingFilters {
  search: string;
  minMatchScore: number;
  maxMatchScore: number;
  riskLevel: RiskLevel | "all";
  status: CandidateStatus | "all";
  sortBy: keyof RankingRow;
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
}

// =========================================
// Analytics
// =========================================

export interface AnalyticsData {
  skillDistribution: SkillDistributionItem[];
  experienceDistribution: ExperienceDistributionItem[];
  scoreHistogram: ScoreHistogramItem[];
  recruiterActivity: RecruiterActivityItem[];
}

export interface SkillDistributionItem {
  skill: string;
  count: number;
  avgProficiency: number;
}

export interface ExperienceDistributionItem {
  range: string;
  count: number;
  percentage: number;
}

export interface ScoreHistogramItem {
  range: string;
  count: number;
  label: string;
}

export interface RecruiterActivityItem {
  date: string;
  reviews: number;
  shortlisted: number;
  interviews: number;
  offers: number;
}

// =========================================
// API Response Wrappers
// =========================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =========================================
// Export
// =========================================

export type ExportFormat = "csv" | "json" | "pdf";

export type ExportPreset = "all" | "top100" | "shortlisted" | "high-risk";

export interface ExportColumn {
  key: keyof RankingRow;
  label: string;
  enabled: boolean;
}
