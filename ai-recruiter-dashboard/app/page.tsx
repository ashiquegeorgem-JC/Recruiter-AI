"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Layers,
  UserCheck,
  Target,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  fetchStats,
  fetchTop100,
  fetchCandidateDetails,
  type BackendStats,
  type BackendTop100Entry,
  type BackendCandidate,
} from "@/lib/api";
import { cn, scoreBg, formatScore, getInitials } from "@/lib/utils";

function DashboardPageInner() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [stats, setStats] = useState<BackendStats | null>(null);
  const [top100, setTop100] = useState<BackendTop100Entry[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<BackendCandidate | null>(null);
  const [selectedEntryScore, setSelectedEntryScore] = useState<number>(0);

  // Local cache of fetched candidate profiles to prevent duplicate network calls
  const [candidateCache, setCandidateCache] = useState<Record<string, BackendCandidate>>({});
  const [loadingCacheIds, setLoadingCacheIds] = useState<Record<string, boolean>>({});

  // AI Job Matching State
  const [jobDescription, setJobDescription] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [matchSuccess, setMatchSuccess] = useState(false);
  const [matchingStep, setMatchingStep] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("match");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // ═════════════════════════════════════════════════════════════════════════════
  // Data Loaders
  // ═════════════════════════════════════════════════════════════════════════════

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t] = await Promise.all([fetchStats(), fetchTop100()]);
      setStats(s);
      setTop100(t);

      // Auto-select first candidate in pipeline
      if (t.length > 0) {
        const firstId = t[0].candidate_id;
        setSelectedEntryScore(t[0].score);
        setLoadingDetails(true);
        try {
          const details = await fetchCandidateDetails(firstId);
          setCandidateCache((prev) => ({ ...prev, [firstId]: details }));
          setSelectedCandidate(details);
        } catch (err: any) {
          console.error("Failed to load first candidate details:", err);
        } finally {
          setLoadingDetails(false);
        }
      }
    } catch (err: any) {
      setError("FastAPI server is currently offline or unreachable. Please verify that the backend is running at http://127.0.0.1:8000");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleMatchCandidates = async () => {
    if (!jobDescription.trim()) return;
    setIsMatching(true);
    setMatchSuccess(false);
    setError(null);

    try {
      setMatchingStep("Parsing job description and extracting tags...");
      const response = await fetch("http://localhost:8000/match-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          job_description: jobDescription,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to match candidates: ${response.status}`);
      }

      setMatchingStep("Re-scoring candidate profiles against job requirements...");
      const matchedData: { candidate_id: string; score: number }[] = await response.json();

      setMatchingStep("Sorting and ranking candidate matches...");

      // Update Top 100 candidate ranking state
      setTop100(matchedData);
      setPage(1); // Reset table page to 1

      // Update Dashboard Stats card top_candidates count
      if (stats) {
        setStats({
          ...stats,
          top_candidates: matchedData.length,
        });
      }

      // Auto-select Rank 1 candidate and fetch details
      if (matchedData.length > 0) {
        const first = matchedData[0];
        setSelectedEntryScore(first.score);
        setLoadingDetails(true);
        try {
          const details = await fetchCandidateDetails(first.candidate_id);
          setCandidateCache((prev) => ({ ...prev, [first.candidate_id]: details }));
          setSelectedCandidate(details);
        } catch (err) {
          console.error("Failed to load details for first matched candidate:", err);
        } finally {
          setLoadingDetails(false);
        }
      }

      setIsMatching(false);
      setMatchSuccess(true);
      setTimeout(() => setMatchSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      setError("Failed to communicate with match endpoint. Ensure FastAPI server is running on http://localhost:8000");
      setIsMatching(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // Helper calculations for dynamic properties
  // ═════════════════════════════════════════════════════════════════════════════

  const getNoticeDays = (cand: BackendCandidate | undefined): number => {
    return Number(cand?.redrob_signals?.notice_period_days ?? 60) || 60;
  };

  const getResponseRate = (cand: BackendCandidate | undefined): number => {
    return Number(cand?.redrob_signals?.recruiter_response_rate ?? 0.8) || 0.8;
  };

  const calculateHireability = (score: number, cand: BackendCandidate | undefined): number => {
    const s = Number(score) || 0;
    const notice = getNoticeDays(cand);
    const response = getResponseRate(cand);
    const deduction = (notice > 60 ? 8 : 0) + (response < 0.6 ? 10 : 0);
    const result = Math.max(50, Math.round(s - deduction));
    return isNaN(result) ? 50 : result;
  };

  const calculateRisk = (cand: BackendCandidate | undefined): number => {
    if (!cand) return 4;
    const completeness = Number(cand.redrob_signals?.profile_completeness_score ?? 80) || 80;
    const completionRate = Number(cand.redrob_signals?.interview_completion_rate ?? 0.8) || 0.8;
    const risk = Math.round(100 - (completeness * 0.4 + completionRate * 60));
    const result = Math.max(2, Math.min(95, risk));
    return isNaN(result) ? 4 : result;
  };

  const calculateAIExplainabilityGauges = (cand: BackendCandidate | undefined, score: number) => {
    if (!cand) {
      return { aiSkills: 80, retrievalRanking: 80, productionMl: 80, behavioral: 80, risk: 10 };
    }
    const skillList = cand.skills || [];
    const hasSkill = (k: string) => skillList.some(s => s.name.toLowerCase().includes(k));

    const aiScore = 60 + (hasSkill("llm") || hasSkill("transformer") ? 20 : 0) + (hasSkill("nlp") ? 15 : 0);
    const retrievalScore = 55 + (hasSkill("retrieval") || hasSkill("vector") ? 25 : 0) + (hasSkill("ranking") ? 15 : 0);
    const productionScore = 50 + (hasSkill("production") || hasSkill("deploy") ? 25 : 0) + (hasSkill("kafka") ? 15 : 0);
    const behavioralRaw = Number(cand.redrob_signals?.interview_completion_rate ?? 0.8) || 0.8;
    const behavioralVal = Math.round(behavioralRaw * 100);
    const riskVal = calculateRisk(cand);

    return {
      aiSkills: Math.min(100, Math.max(40, aiScore)),
      retrievalRanking: Math.min(100, Math.max(40, retrievalScore)),
      productionMl: Math.min(100, Math.max(40, productionScore)),
      behavioral: isNaN(behavioralVal) ? 80 : behavioralVal,
      risk: isNaN(riskVal) ? 4 : riskVal,
    };
  };

  // Background profile resolver for visible page entries
  const visibleEntries = useMemo(() => {
    const start = (page - 1) * pageSize;
    return top100.slice(start, start + pageSize);
  }, [top100, page]);

  useEffect(() => {
    visibleEntries.forEach((entry) => {
      const id = entry.candidate_id;
      if (!candidateCache[id] && !loadingCacheIds[id]) {
        setLoadingCacheIds((prev) => ({ ...prev, [id]: true }));
        fetchCandidateDetails(id)
          .then((details) => {
            setCandidateCache((prev) => ({ ...prev, [id]: details }));
          })
          .catch((err) => {
            console.error(`Failed loading detail row for candidate ${id}:`, err);
          })
          .finally(() => {
            setLoadingCacheIds((prev) => ({ ...prev, [id]: false }));
          });
      }
    });
  }, [visibleEntries, candidateCache, loadingCacheIds]);

  // ═════════════════════════════════════════════════════════════════════════════
  // Filter & Search calculations
  // ═════════════════════════════════════════════════════════════════════════════

  const sortedAndFilteredRows = useMemo(() => {
    return top100
      .map((entry, idx) => {
        const cached = candidateCache[entry.candidate_id];
        const riskRaw = calculateRisk(cached);
        const hireRaw = calculateHireability(entry.score, cached);
        return {
          rank: idx + 1,
          candidate_id: entry.candidate_id,
          score: Number(entry.score) || 0,
          name: cached?.profile?.anonymized_name ?? "Resolving profile...",
          title: cached?.profile?.headline ?? "AI Specialist",
          status: cached?.redrob_signals?.open_to_work_flag ? "shortlisted" : "interview",
          risk: isNaN(riskRaw) ? 4 : riskRaw,
          hireability: isNaN(hireRaw) ? 50 : hireRaw,
        };
      })
      .filter((row) => {
        const matchesSearch =
          row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          row.candidate_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          row.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || row.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
  }, [top100, candidateCache, searchQuery, statusFilter]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedAndFilteredRows.slice(start, start + pageSize);
  }, [sortedAndFilteredRows, page]);

  const totalPages = Math.ceil(sortedAndFilteredRows.length / pageSize);

  const handleRowClick = async (entry: BackendTop100Entry) => {
    setSelectedEntryScore(entry.score);
    const cached = candidateCache[entry.candidate_id];
    if (cached) {
      setSelectedCandidate(cached);
      return;
    }

    setLoadingDetails(true);
    try {
      const details = await fetchCandidateDetails(entry.candidate_id);
      setCandidateCache((prev) => ({ ...prev, [entry.candidate_id]: details }));
      setSelectedCandidate(details);
    } catch (err: any) {
      console.error("Failed to load candidate details click:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Dynamic dashboard stats from the live candidate list
  const averageMatch = useMemo(() => {
    if (top100.length === 0) return 82.7;
    const sum = top100.reduce((acc, entry) => acc + (Number(entry.score) || 0), 0);
    const avg = sum / top100.length;
    return isNaN(avg) ? 0 : Math.round(avg * 10) / 10;
  }, [top100]);

  const averageHireability = useMemo(() => {
    if (top100.length === 0) return 74.3;
    const sum = top100.reduce((acc, entry) => {
      const cached = candidateCache[entry.candidate_id];
      const h = calculateHireability(entry.score, cached);
      return acc + (isNaN(h) ? 0 : h);
    }, 0);
    const avg = sum / top100.length;
    return isNaN(avg) ? 0 : Math.round(avg * 10) / 10;
  }, [top100, candidateCache]);

  const honeypotRisk = useMemo(() => {
    if (top100.length === 0) return "4.2%";
    let highRiskCount = 0;
    top100.forEach((entry) => {
      const cached = candidateCache[entry.candidate_id];
      if (calculateRisk(cached) >= 40) highRiskCount++;
    });
    const pct = Math.round((highRiskCount / top100.length) * 100 * 10) / 10;
    return `${isNaN(pct) ? 0 : pct}%`;
  }, [top100, candidateCache]);



  // Explainability narrative helper
  const explainabilitySummary = useMemo(() => {
    if (!selectedCandidate) return [];
    const list: string[] = [];
    const hasSkill = (k: string) => (selectedCandidate.skills || []).some(s => s.name.toLowerCase().includes(k));

    if (hasSkill("embedding")) list.push("✓ Strong embeddings experience");
    else list.push("✓ Standard embeddings alignment");

    if (hasSkill("retrieval") || hasSkill("vector")) list.push("✓ Built retrieval and ranking systems");
    else list.push("✓ Core databases understanding");

    if (hasSkill("production") || hasSkill("deploy")) list.push("✓ Production ML deployment experience");
    else list.push("✓ Software development foundations");

    if ((selectedCandidate.redrob_signals?.saved_by_recruiters_30d ?? 0) >= 3) {
      list.push("✓ High recruiter engagement");
    }
    const years = selectedCandidate.profile?.years_of_experience ?? 5;
    list.push(`✓ ${years} years experience matches JD`);
    return list;
  }, [selectedCandidate]);

  const computedGauges = useMemo(() => {
    return calculateAIExplainabilityGauges(selectedCandidate ?? undefined, selectedEntryScore);
  }, [selectedCandidate, selectedEntryScore]);

  // ═════════════════════════════════════════════════════════════════════════════
  // Error handling render state
  // ═════════════════════════════════════════════════════════════════════════════

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] p-6">
        <div className="max-w-md w-full border border-red-500/30 bg-[#0D1220]/80 rounded-2xl p-6 text-center space-y-4 shadow-xl shadow-red-950/20">
          <AlertCircle className="w-12 h-12 text-[#EF4444] mx-auto animate-bounce" />
          <h2 className="text-lg font-bold text-[#F8FAFC]">FastAPI Connection Error</h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">{error}</p>
          <button
            onClick={loadDashboardData}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-violet-600 text-white font-semibold text-xs transition-transform active:scale-95 shadow-md shadow-[#7C4DFF]/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-10">

      {/* ── AI JOB MATCHING CARD ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-[#1F2942] bg-[#0D1220]/60 p-5 shadow-xl">
        <div className="absolute right-0 top-0 w-64 h-64 bg-[#7C4DFF]/3 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#7C4DFF]" />
          <h2 className="text-xs font-semibold tracking-wider text-[#F8FAFC] uppercase">AI Job Matching</h2>
        </div>
        <div className="space-y-3">
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste job description here..."
            className="w-full h-24 px-4 py-3 rounded-xl border border-[#1F2942] bg-[#070B14] text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#7C4DFF] focus:ring-1 focus:ring-[#7C4DFF]/30 resize-none transition-all duration-300"
          />
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleMatchCandidates}
              disabled={isMatching || !jobDescription.trim()}
              className="flex items-center justify-center gap-2 h-9 px-4 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-violet-600 hover:from-violet-600 hover:to-[#7C4DFF] text-white font-semibold text-xs transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-[#7C4DFF]/15"
            >
              {isMatching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Matching candidates...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Match Candidates</span>
                </>
              )}
            </button>
            {isMatching && (
              <p className="text-[10px] text-[#94A3B8] animate-pulse italic">
                {matchingStep}
              </p>
            )}
            {matchSuccess && (
              <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                100 candidates successfully re-ranked!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 1: JOB DESCRIPTION HERO ────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-[#1F2942] bg-gradient-to-br from-[#0D1220] to-[#070B14] p-6 shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#7C4DFF]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-md text-[10px] font-semibold tracking-wider bg-[#7C4DFF]/15 text-[#7C4DFF] border border-[#7C4DFF]/25 uppercase">
                Active Search Context
              </span>
              <span className="text-xs text-[#94A3B8]">F.R.I.D.A.Y – Founding Team</span>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">Senior AI Engineer</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#94A3B8] mt-1">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Pune / Noida (Hybrid)</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#1F2942]" />
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 5–9 Years Experience</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {["Embeddings", "Retrieval", "Ranking", "LLMs", "Vector Databases", "Production ML", "Evaluation", "Python"].map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[#1F2942] bg-[#070B14] text-[#F8FAFC]">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          {/* Right illustration */}
          <div className="hidden lg:block shrink-0 w-80 h-32 relative">
            <svg viewBox="0 0 320 120" className="w-full h-full opacity-80">
              <defs>
                <linearGradient id="vectorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7C4DFF" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <circle cx="40" cy="60" r="4" fill="#7C4DFF" className="animate-pulse" />
              <circle cx="120" cy="30" r="5" fill="#10B981" />
              <circle cx="120" cy="90" r="3" fill="#F59E0B" />
              <circle cx="200" cy="60" r="6" fill="#7C4DFF" />
              <circle cx="280" cy="40" r="4" fill="#10B981" />
              <path d="M 40 60 L 120 30" stroke="url(#vectorGrad)" strokeWidth="1.5" strokeDasharray="4 2" />
              <path d="M 40 60 L 120 90" stroke="url(#vectorGrad)" strokeWidth="1.5" />
              <path d="M 120 30 L 200 60" stroke="url(#vectorGrad)" strokeWidth="1.5" />
              <path d="M 120 90 L 200 60" stroke="url(#vectorGrad)" strokeWidth="1.5" strokeDasharray="3 3" />
              <path d="M 200 60 L 280 40" stroke="url(#vectorGrad)" strokeWidth="2" />
              <circle cx="200" cy="60" r="14" stroke="#7C4DFF" strokeWidth="1" strokeOpacity="0.3" fill="none" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: KEY METRICS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Candidates", value: stats?.total_candidates?.toLocaleString() ?? "100,000", desc: "FastAPI dataset matches", glow: "shadow-[#7C4DFF]/5 border-t-[#7C4DFF]/40", icon: Layers },
          { label: "Top Candidates Selected", value: stats?.top_candidates?.toString() ?? "100", desc: "Top matched quota", glow: "shadow-emerald-500/5 border-t-emerald-500/40", icon: UserCheck },
          { label: "Average Match Score", value: Number(averageMatch ?? 0).toFixed(1), desc: "Direct calculated coefficient", glow: "shadow-indigo-500/5 border-t-indigo-500/40", icon: Target },
          { label: "Average Hireability", value: Number(averageHireability ?? 0).toFixed(1), desc: "Derived signals index", glow: "shadow-amber-500/5 border-t-amber-500/40", icon: ShieldCheck },
          { label: "Honeypot Risk Ratio", value: honeypotRisk, desc: "Profile validation alerts", glow: "shadow-red-500/5 border-t-red-500/40", icon: AlertTriangle },
        ].map((card, idx) => (
          <div key={idx} className={cn("glow-card-purple relative overflow-hidden rounded-xl border border-[#1F2942] bg-[#0D1220]/60 p-4 shadow-lg", card.glow)}>
            <div className="flex justify-between items-start">
              <span className="text-[10px] tracking-wider text-[#94A3B8] font-bold uppercase">{card.label}</span>
              <card.icon className="w-4 h-4 text-[#94A3B8]" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-[#F8FAFC] mt-2">{card.value}</p>
            <p className="text-[10px] text-[#94A3B8] mt-1">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* ── SECTION 3: MAIN CONTENT (SPLIT LAYOUT) ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT 55%: Top Ranked Candidates Table */}
        <div className="lg:col-span-7 border border-[#1F2942] bg-[#0D1220]/60 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-wider text-[#F8FAFC] uppercase">Candidate Pipeline Rankings</h2>
              <p className="text-xs text-[#94A3B8]">Real FastAPI entries filtered by match score</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-[#1F2942] bg-[#070B14] text-[10px] text-[#94A3B8] focus:outline-none"
              >
                <option value="all">All Stages</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview">Interview</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto min-h-[420px]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F2942] text-[10px] tracking-wider text-[#94A3B8] uppercase">
                  <th className="py-2.5 px-3 text-left font-bold">Rank</th>
                  <th className="py-2.5 px-3 text-left font-bold">ID</th>
                  <th className="py-2.5 px-3 text-left font-bold">Name</th>
                  <th className="py-2.5 px-3 text-left font-bold">Title</th>
                  <th className="py-2.5 px-3 text-right font-bold">Match Score</th>
                  <th className="py-2.5 px-3 text-right font-bold">Hireability</th>
                  <th className="py-2.5 px-3 text-right font-bold">Risk</th>
                  <th className="py-2.5 px-3 text-center font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2942]/30">
                {paginatedRows.map((row) => (
                  <tr
                    key={row.candidate_id}
                    onClick={() => handleRowClick({ candidate_id: row.candidate_id, score: row.score })}
                    className={cn(
                      "cursor-pointer hover:bg-[#151C30]/40 transition-colors group",
                      selectedCandidate?.candidate_id === row.candidate_id ? "bg-[#7C4DFF]/5 text-white" : ""
                    )}
                  >
                    <td className="py-3 px-3">
                      <span className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold",
                        row.rank <= 3 ? "bg-[#7C4DFF]/20 text-[#7C4DFF] border border-[#7C4DFF]/30" : "bg-[#070B14] text-[#94A3B8]"
                      )}>
                        {row.rank}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono text-[#94A3B8]">{row.candidate_id}</td>
                    <td className="py-3 px-3 text-xs font-semibold text-[#F8FAFC] group-hover:text-[#7C4DFF] transition-colors">
                      {row.name}
                    </td>
                    <td className="py-3 px-3 text-xs text-[#94A3B8] truncate max-w-[120px]">{row.title}</td>
                    <td className="py-3 px-3 text-right text-xs font-bold">
                      <span className={cn("inline-block px-1.5 py-0.5 rounded", scoreBg(row.score))}>
                        {formatScore(row.score)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-bold text-[#F8FAFC]">{String(row.hireability)}</td>
                    <td className="py-3 px-3 text-right text-xs font-bold text-[#EF4444]">{String(row.risk)}%</td>
                    <td className="py-3 px-3 text-center">
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-[9px] font-bold capitalize tracking-wider border",
                        row.status === "shortlisted" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" :
                          row.status === "interview" ? "border-[#7C4DFF]/20 bg-[#7C4DFF]/10 text-[#7C4DFF]" :
                            "border-slate-800 bg-slate-900 text-slate-400"
                      )}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between border-t border-[#1F2942] pt-4">
            <span className="text-[10px] text-[#94A3B8]">
              Showing {Math.min(sortedAndFilteredRows.length, (page - 1) * pageSize + 1)}–
              {Math.min(sortedAndFilteredRows.length, page * pageSize)} of {sortedAndFilteredRows.length} entries
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-[#1F2942] text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-[#1F2942] text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT 45%: Selected Candidate Panel */}
        <div className="lg:col-span-5 border border-[#1F2942] bg-[#0D1220]/60 rounded-2xl p-5 shadow-xl flex flex-col justify-between relative min-h-[500px]">

          {loadingDetails && (
            <div className="absolute inset-0 bg-[#0D1220]/80 rounded-2xl flex items-center justify-center z-10">
              <div className="w-6 h-6 border-2 border-[#7C4DFF]/20 border-t-[#7C4DFF] rounded-full animate-spin" />
            </div>
          )}

          {selectedCandidate ? (
            <div className="space-y-6">

              {/* Header block */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7C4DFF] to-violet-900 border border-[#7C4DFF]/30 flex items-center justify-center text-base font-bold text-white shadow-md shadow-[#7C4DFF]/25">
                    {getInitials(selectedCandidate.profile?.anonymized_name || "CN")}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F8FAFC]">{selectedCandidate.profile?.anonymized_name}</h3>
                    <p className="text-xs text-[#94A3B8] line-clamp-1">{selectedCandidate.profile?.headline}</p>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5">{selectedCandidate.profile?.location} • {selectedCandidate.profile?.years_of_experience !== undefined && !isNaN(Number(selectedCandidate.profile.years_of_experience)) ? String(selectedCandidate.profile.years_of_experience) : "0"} yrs exp</p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[9px] tracking-wider text-[#94A3B8] uppercase font-bold">MATCH score</span>
                  <span className="text-3xl font-black tracking-tighter text-[#7C4DFF]">
                    {formatScore(selectedEntryScore)}
                  </span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex gap-1.5 overflow-x-auto border-b border-[#1F2942] pb-2">
                {[
                  { id: "match", label: "Match Analysis" },
                  { id: "profile", label: "Profile details" },
                  { id: "skills", label: "Core Skills" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                      activeTab === t.id
                        ? "bg-[#7C4DFF]/15 text-[#7C4DFF]"
                        : "text-[#94A3B8] hover:text-[#F8FAFC]"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Content: MATCH BREAKDOWN */}
              {activeTab === "match" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] tracking-wider text-[#94A3B8] uppercase font-bold mb-3">AI Explainability Gauges</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: "AI Skills", val: computedGauges.aiSkills, color: "stroke-[#7C4DFF]" },
                        { label: "Retrieval", val: computedGauges.retrievalRanking, color: "stroke-[#10B981]" },
                        { label: "Prod ML", val: computedGauges.productionMl, color: "stroke-indigo-500" },
                        { label: "Behavioral", val: computedGauges.behavioral, color: "stroke-pink-500" },
                        { label: "Risk Score", val: computedGauges.risk, color: "stroke-red-500" },
                      ].map((gauge, i) => (
                        <div key={i} className="flex flex-col items-center text-center space-y-1.5">
                          <div className="relative w-11 h-11 flex items-center justify-center">
                            <svg className="w-11 h-11 circular-progress">
                              <circle cx="22" cy="22" r="16" fill="transparent" stroke="#151C30" strokeWidth="2.5" />
                              <circle
                                cx="22"
                                cy="22"
                                r="16"
                                fill="transparent"
                                strokeWidth="3"
                                strokeLinecap="round"
                                className={cn("circular-progress-circle", gauge.color)}
                                style={{ strokeDashoffset: 100.5 - (100.5 * (isNaN(Number(gauge.val)) ? 0 : Number(gauge.val))) / 100 }}
                              />
                            </svg>
                            <span className="absolute text-[8px] font-bold text-[#F8FAFC]">{String(isNaN(gauge.val) ? 0 : gauge.val)}%</span>
                          </div>
                          <span className="text-[8px] text-[#94A3B8] font-bold tracking-tight line-clamp-1">{gauge.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* WHY SELECTED */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] tracking-wider text-[#94A3B8] uppercase font-bold">Why Selected</h4>
                    <div className="space-y-2 bg-[#070B14] p-4 rounded-xl border border-[#1F2942]/60">
                      {explainabilitySummary.map((bullet, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-[#F8FAFC]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{bullet}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Explanation block */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] tracking-wider text-[#94A3B8] uppercase font-bold">Explainability narrative</h4>
                    <p className="text-xs text-[#94A3B8] leading-relaxed italic bg-[#070B14] p-3 rounded-lg border border-[#1F2942]/40">
                      &ldquo;{selectedCandidate.profile?.summary}&rdquo;
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "profile" && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] tracking-wider text-[#94A3B8] uppercase font-bold mb-1">Executive Summary</h4>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">{selectedCandidate.profile?.summary}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] tracking-wider text-[#94A3B8] uppercase font-bold mb-1.5">Employment Profile</h4>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {selectedCandidate.career_history?.map((job, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-[#070B14] border border-[#1F2942] space-y-1">
                          <div className="flex justify-between text-xs">
                            <h5 className="font-semibold text-[#F8FAFC]">{job.title}</h5>
                            <span className="text-[10px] text-[#94A3B8]">{job.start_date}</span>
                          </div>
                          <p className="text-[10px] text-[#7C4DFF] font-medium">{job.company}</p>
                          <p className="text-[10px] text-[#94A3B8] leading-relaxed">{job.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "skills" && (
                <div className="space-y-3">
                  <h4 className="text-[10px] tracking-wider text-[#94A3B8] uppercase font-bold">Verified Skills & Proficiency</h4>
                  <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {selectedCandidate.skills?.map((s) => (
                      <div key={s.name} className="p-2.5 rounded-xl bg-[#070B14] border border-[#1F2942] flex justify-between items-center">
                        <span className="text-xs text-[#F8FAFC] font-medium">{s.name}</span>
                        <span className="text-[10px] font-bold text-[#7C4DFF] capitalize">
                          {s.proficiency} ({String(s.endorsements || 0)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="py-20 text-center text-xs text-[#94A3B8]">
              Select a candidate card from the rankings pipeline grid to view parameters.
            </div>
          )}
        </div>
      </div>



    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh] text-[#94A3B8] text-xs">Loading Dashboard...</div>}>
      <DashboardPageInner />
    </Suspense>
  );
}
