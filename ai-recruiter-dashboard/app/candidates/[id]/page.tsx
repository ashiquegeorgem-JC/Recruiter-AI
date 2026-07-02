"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  GraduationCap,
  Brain,
  Star,
  TrendingUp,
  Shield,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { getCandidate } from "@/lib/api";
import type { Candidate } from "@/lib/types";
import { cn, scoreColor, scoreBg, formatScore, formatDate, getInitials } from "@/lib/utils";

export default function CandidateDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const c = await getCandidate(id);
        setCandidate(c);
      } catch {
        // handle not found
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-[var(--muted)]">Loading candidate...</p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-[var(--muted-foreground)]" />
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Candidate Not Found</h2>
        <p className="text-sm text-[var(--muted)]">The candidate ID &ldquo;{id}&rdquo; does not exist.</p>
        <Link href="/rankings" className="text-sm text-indigo-500 hover:underline">
          ← Back to Rankings
        </Link>
      </div>
    );
  }

  const c = candidate;

  const skillRadarData = c.skills.slice(0, 8).map((s) => ({
    skill: s.name,
    proficiency: s.proficiency,
    fullMark: 100,
  }));

  const matchDimensions = c.matchExplanation.dimensions.map((d) => ({
    name: d.name,
    score: d.score,
    weighted: Math.round(d.score * d.weight * 100) / 100,
  }));

  const dimensionColors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Back link */}
      <Link
        href="/rankings"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Rankings
      </Link>

      {/* Profile Header */}
      <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden animate-fade-in">
        {/* Gradient banner */}
        <div className="h-32 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.2) 0%, transparent 50%)"
            }}
          />
        </div>

        <div className="px-6 pb-6 -mt-12 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl font-bold text-white border-4 border-[var(--surface)] shadow-xl">
              {getInitials(c.name)}
            </div>

            <div className="flex-1 min-w-0 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-[var(--foreground)]">{c.name}</h1>
                  <p className="text-sm text-[var(--muted)]">{c.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold border", scoreBg(c.matchScore))}>
                    <Star className="w-3.5 h-3.5" />
                    Match: {formatScore(c.matchScore)}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    Rank #{c.rank}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{c.location}</span>
            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{c.email}</span>
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{c.phone}</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{c.yearsOfExperience} yrs exp</span>
          </div>

          {/* Score pills */}
          <div className="flex flex-wrap gap-3 mt-4">
            {[
              { label: "Hireability", value: c.hireabilityScore, icon: TrendingUp },
              { label: "Risk", value: c.riskScore, icon: Shield },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]">
                <s.icon className="w-4 h-4 text-[var(--muted)]" />
                <span className="text-xs text-[var(--muted)]">{s.label}:</span>
                <span className={cn("text-sm font-semibold", s.label === "Risk" ? scoreColor(100 - s.value) : scoreColor(s.value))}>
                  {formatScore(s.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 animate-fade-in stagger-1">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="text-base font-semibold text-[var(--foreground)]">Profile Summary</h2>
        </div>
        <p className="text-sm text-[var(--muted)] leading-relaxed">{c.summary}</p>
      </div>

      {/* Skills + Match Explanation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skills Radar */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 animate-fade-in stagger-2">
          <h2 className="text-base font-semibold text-[var(--foreground)] mb-4">Skills Profile</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={skillRadarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: "var(--muted)" }} />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                />
                <Radar
                  name="Proficiency"
                  dataKey="proficiency"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* Skill pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            {c.skills.map((s) => (
              <span
                key={s.name}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border",
                  s.category === "technical" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                  s.category === "soft" ? "bg-violet-500/10 text-violet-500 border-violet-500/20" :
                  s.category === "domain" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                  s.category === "tool" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                  "bg-slate-500/10 text-slate-500 border-slate-500/20"
                )}
              >
                {s.name}
                <span className="opacity-60">{s.proficiency}%</span>
              </span>
            ))}
          </div>
        </div>

        {/* Match Explanation */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 animate-fade-in stagger-3">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-indigo-500" />
            <h2 className="text-base font-semibold text-[var(--foreground)]">Match Explanation</h2>
          </div>

          {/* Score Breakdown Bar Chart */}
          <div className="h-[200px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={matchDimensions} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-elevated)",
                    borderColor: "var(--border)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={18}>
                  {matchDimensions.map((_, i) => (
                    <Cell key={i} fill={dimensionColors[i % dimensionColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* AI Narrative */}
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 mb-4">
            <p className="text-xs font-medium text-indigo-500 mb-1.5 flex items-center gap-1">
              <Brain className="w-3 h-3" /> AI Analysis
            </p>
            <p className="text-sm text-[var(--muted)] leading-relaxed">{c.matchExplanation.aiNarrative}</p>
          </div>

          {/* Strengths & Gaps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-medium text-emerald-500 uppercase tracking-wider mb-2">Strengths</h3>
              <ul className="space-y-1.5">
                {c.matchExplanation.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--muted)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-medium text-amber-500 uppercase tracking-wider mb-2">Gaps</h3>
              <ul className="space-y-1.5">
                {c.matchExplanation.gaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--muted)]">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Career History + Education + Behavioral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Career History */}
        <div className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 animate-fade-in stagger-4">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-4 h-4 text-indigo-500" />
            <h2 className="text-base font-semibold text-[var(--foreground)]">Career History</h2>
          </div>
          <div className="space-y-4">
            {c.careerHistory.map((entry, i) => (
              <div key={i} className="relative pl-6 border-l-2 border-indigo-500/20">
                {/* Dot */}
                <div className={cn(
                  "absolute left-[-7px] top-1 w-3 h-3 rounded-full border-2 border-[var(--surface)]",
                  !entry.endDate ? "bg-indigo-500 shadow-lg shadow-indigo-500/30" : "bg-[var(--muted-foreground)]"
                )} />
                <div className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">{entry.role}</h3>
                      <p className="text-sm text-indigo-500 font-medium">{entry.company}</p>
                    </div>
                    <span className="text-xs text-[var(--muted)] whitespace-nowrap ml-2">
                      {entry.startDate.split("-").slice(0, 2).join("/")} — {entry.endDate ? entry.endDate.split("-").slice(0, 2).join("/") : "Present"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-1.5">{entry.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {entry.highlights.map((h, j) => (
                      <span key={j} className="px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--muted)]">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Education + Behavioral Signals */}
        <div className="space-y-6">
          {/* Education */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 animate-fade-in stagger-4">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-4 h-4 text-violet-500" />
              <h2 className="text-base font-semibold text-[var(--foreground)]">Education</h2>
            </div>
            <div className="space-y-3">
              {c.education.map((edu, i) => (
                <div key={i} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">{edu.degree}</h3>
                  <p className="text-sm text-violet-500 font-medium">{edu.institution}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">{edu.field} • {edu.startYear}–{edu.endYear}</p>
                  {edu.gpa && (
                    <p className="text-xs text-[var(--muted)] mt-0.5">GPA: {edu.gpa}</p>
                  )}
                  {edu.honors && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-xs font-medium">
                      {edu.honors}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Behavioral Signals */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 animate-fade-in stagger-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <h2 className="text-base font-semibold text-[var(--foreground)]">Behavioral Signals</h2>
            </div>
            <div className="space-y-3">
              {c.behavioralSignals.map((signal, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[var(--foreground)]">{signal.trait}</span>
                    <span className={cn("text-xs font-semibold", scoreColor(signal.score))}>{signal.score}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        signal.score >= 75 ? "bg-emerald-500" : signal.score >= 50 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${signal.score}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                    Confidence: {signal.confidence}% • {signal.sentiment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
