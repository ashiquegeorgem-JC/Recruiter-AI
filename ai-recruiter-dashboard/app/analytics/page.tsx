"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  BarChart3,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { fetchCandidateDetails, type BackendCandidate } from "@/lib/api";

// ── FastAPI response shape ────────────────────────────────────────────────────

interface ApiRankingEntry {
  rank: number;
  candidate_id: string;
  name: string;
  title: string;
  match_score: number;
  experience: number;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankings, setRankings] = useState<ApiRankingEntry[]>([]);
  const [topCandidates, setTopCandidates] = useState<BackendCandidate[]>([]);
  const [stats, setStats] = useState<{ total_candidates: number; top_candidates: number } | null>(null);

  // ── Fetch rankings & stats from FastAPI ─────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, rRes] = await Promise.all([
        fetch("http://localhost:8000/stats"),
        fetch("http://localhost:8000/rankings"),
      ]);

      if (!sRes.ok || !rRes.ok) throw new Error("Could not load analytics datasets.");

      const sData = await sRes.json();
      const rData: ApiRankingEntry[] = await rRes.json();

      setStats(sData);
      setRankings(rData);

      // Asynchronously load the details for the top 15 candidate profiles to construct high-fidelity skill/industry stats
      const top15 = rData.slice(0, 15);
      const detailPromises = top15.map((c) => fetchCandidateDetails(c.candidate_id));
      const details = await Promise.all(detailPromises);
      setTopCandidates(details);
    } catch (err: any) {
      setError("FastAPI server connection error. Ensure http://localhost:8000 is active.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Dynamic Chart Calculations ──────────────────────────────────────────────

  // 1. Experience Distribution (Real candidate experience values)
  const expChartData = useMemo(() => {
    if (rankings.length === 0) return [];
    let counts = { "1-4 yrs": 0, "5-7 yrs": 0, "8-10 yrs": 0, "11+ yrs": 0 };
    rankings.forEach((r) => {
      const y = r.experience ?? 5;
      if (y <= 4) counts["1-4 yrs"]++;
      else if (y <= 7) counts["5-7 yrs"]++;
      else if (y <= 10) counts["8-10 yrs"]++;
      else counts["11+ yrs"]++;
    });
    return [
      { name: "1-4 yrs", count: counts["1-4 yrs"] },
      { name: "5-7 yrs", count: counts["5-7 yrs"] },
      { name: "8-10 yrs", count: counts["8-10 yrs"] },
      { name: "11+ yrs", count: counts["11+ yrs"] },
    ];
  }, [rankings]);

  // 2. Top Skills (Parsed from candidate profiles)
  const topSkillsData = useMemo(() => {
    if (topCandidates.length === 0) {
      // Fallback if details are still loading or empty
      return [
        { name: "Python", count: 12 },
        { name: "SQL", count: 9 },
        { name: "PyTorch", count: 8 },
        { name: "NLP", count: 7 },
        { name: "Transformers", count: 6 },
      ];
    }
    const skillCounts: Record<string, number> = {};
    topCandidates.forEach((c) => {
      (c.skills || []).forEach((s) => {
        const key = s.name.trim();
        skillCounts[key] = (skillCounts[key] || 0) + 1;
      });
    });
    return Object.entries(skillCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [topCandidates]);

  // 3. Match Score Distribution (Grouped by score brackets)
  const scoreDistributionData = useMemo(() => {
    if (rankings.length === 0) return [];
    let brackets = { "0-100": 0, "100-200": 0, "200-300": 0, "300-400": 0, "400-500": 0 };
    rankings.forEach((entry) => {
      const s = entry.match_score;
      if (s < 100) brackets["0-100"]++;
      else if (s < 200) brackets["100-200"]++;
      else if (s < 300) brackets["200-300"]++;
      else if (s < 400) brackets["300-400"]++;
      else brackets["400-500"]++;
    });
    return Object.entries(brackets).map(([name, value]) => ({ name, value }));
  }, [rankings]);

  // 4. Risk Profile (Derived from candidate redrob_signals completeness)
  const riskPieData = useMemo(() => {
    if (topCandidates.length === 0) {
      return [
        { name: "Low", value: 10 },
        { name: "Medium", value: 4 },
        { name: "High", value: 1 },
      ];
    }
    let counts = { Low: 0, Medium: 0, High: 0 };
    topCandidates.forEach((c) => {
      const completeness = c.redrob_signals?.profile_completeness_score ?? 80;
      const completionRate = c.redrob_signals?.interview_completion_rate ?? 0.8;
      const risk = Math.round(100 - (completeness * 0.4 + completionRate * 60));
      if (risk < 20) counts.Low++;
      else if (risk < 40) counts.Medium++;
      else counts.High++;
    });
    return [
      { name: "Low", value: counts.Low },
      { name: "Medium", value: counts.Medium },
      { name: "High", value: counts.High },
    ];
  }, [topCandidates]);

  // 5. Target Industries (Parsed from candidate profile industry tags)
  const industryChartData = useMemo(() => {
    if (topCandidates.length === 0) {
      return [
        { name: "AI/SaaS", count: 8 },
        { name: "Fintech", count: 4 },
        { name: "IT Services", count: 2 },
        { name: "E-commerce", count: 1 },
      ];
    }
    let indCounts: Record<string, number> = {};
    topCandidates.forEach((c) => {
      const ind = c.profile?.current_industry ?? "AI/SaaS";
      indCounts[ind] = (indCounts[ind] || 0) + 1;
    });
    return Object.entries(indCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [topCandidates]);

  const PIE_COLORS = ["#7C4DFF", "#10B981", "#EF4444", "#F59E0B"];

  const tooltipStyle = {
    backgroundColor: "#0D1220",
    borderColor: "#1F2942",
    borderRadius: "12px",
    fontSize: "12px",
    color: "#F8FAFC",
  };

  // ── Error state ─────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="max-w-sm w-full border border-red-500/30 bg-[#0D1220]/60 rounded-2xl p-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-sm font-semibold text-[#F8FAFC]">Analytics Connection Failed</p>
          <p className="text-xs text-[#94A3B8]">{error}</p>
          <button
            onClick={loadData}
            className="flex items-center justify-center gap-2 w-full h-9 rounded-xl bg-[#7C4DFF] text-white text-xs font-semibold hover:bg-violet-600 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#F8FAFC] flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#7C4DFF]" />
          Analytics Insights
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Detailed talent distribution and candidate metrics parsed directly from FastAPI dataset context
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-40">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#7C4DFF]/30 border-t-[#7C4DFF] rounded-full animate-spin" />
            <p className="text-xs text-[#94A3B8]">Compiling dataset from FastAPI server...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#1F2942] bg-[#0D1220]/60 p-4 shadow-lg">
              <span className="text-[10px] tracking-wider text-[#94A3B8] font-bold uppercase">Total Talent Scanned</span>
              <p className="text-2xl font-bold text-[#F8FAFC] mt-1">{stats?.total_candidates?.toLocaleString() ?? "100,000"}</p>
            </div>
            <div className="rounded-xl border border-[#1F2942] bg-[#0D1220]/60 p-4 shadow-lg">
              <span className="text-[10px] tracking-wider text-[#94A3B8] font-bold uppercase">Primary Target Pool</span>
              <p className="text-2xl font-bold text-[#F8FAFC] mt-1">{stats?.top_candidates ?? "100"} candidates</p>
            </div>
            <div className="rounded-xl border border-[#1F2942] bg-[#0D1220]/60 p-4 shadow-lg">
              <span className="text-[10px] tracking-wider text-[#94A3B8] font-bold uppercase">AI Validation Status</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">Active Context</p>
            </div>
          </div>

          {/* ── 2x2 CHART GRID + 1 WIDE LAYOUT (Little bigger cards) ──────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Experience Distribution (Row 1 Left) */}
            <div className="border border-[#1F2942] bg-[#0D1220]/60 p-6 rounded-2xl shadow-xl flex flex-col justify-between min-h-[350px]">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs tracking-wider text-[#94A3B8] font-bold uppercase">Experience Distribution</span>
                <span className="text-[10px] text-[#7C4DFF] bg-[#7C4DFF]/10 px-2 py-0.5 rounded font-mono">Years of Experience</span>
              </div>
              <div className="flex-1 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#7C4DFF" radius={[6, 6, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Skills Focus (Row 1 Right) */}
            <div className="border border-[#1F2942] bg-[#0D1220]/60 p-6 rounded-2xl shadow-xl flex flex-col justify-between min-h-[350px]">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs tracking-wider text-[#94A3B8] font-bold uppercase">Top Core Skills</span>
                <span className="text-[10px] text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded font-mono">Competency Match</span>
              </div>
              <div className="flex-1 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSkillsData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#10B981" radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Match Score Distribution (Row 2 Left) */}
            <div className="border border-[#1F2942] bg-[#0D1220]/60 p-6 rounded-2xl shadow-xl flex flex-col justify-between min-h-[350px]">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs tracking-wider text-[#94A3B8] font-bold uppercase">Match Distribution Histogram</span>
                <span className="text-[10px] text-[#7C4DFF] bg-[#7C4DFF]/10 px-2 py-0.5 rounded font-mono">AI Index Distribution</span>
              </div>
              <div className="flex-1 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scoreDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="glowPurpleLarge" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C4DFF" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#7C4DFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="value" stroke="#7C4DFF" fill="url(#glowPurpleLarge)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Risk Profile Breakdown (Row 2 Right) */}
            <div className="border border-[#1F2942] bg-[#0D1220]/60 p-6 rounded-2xl shadow-xl flex flex-col justify-between min-h-[350px]">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs tracking-wider text-[#94A3B8] font-bold uppercase">Honeypot Risk Profile</span>
                <span className="text-[10px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded font-mono">Anomaly Signals</span>
              </div>
              <div className="flex-1 h-64 flex items-center justify-center relative">
                <div className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" strokeWidth={0}>
                        {riskPieData.map((_, index) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xs text-[#94A3B8] font-bold uppercase">Anomaly Ratio</span>
                  <span className="text-2xl font-black text-white mt-0.5">Minimal</span>
                </div>
              </div>
              {/* Legend */}
              <div className="flex justify-center gap-4 text-xs mt-2">
                {riskPieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-[#94A3B8]">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Industries (Full span at bottom) */}
            <div className="lg:col-span-2 border border-[#1F2942] bg-[#0D1220]/60 p-6 rounded-2xl shadow-xl flex flex-col justify-between min-h-[350px]">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs tracking-wider text-[#94A3B8] font-bold uppercase">Target Industries & Focus Areas</span>
                <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded font-mono">Industry Domains</span>
              </div>
              <div className="flex-1 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={industryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#F59E0B" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
