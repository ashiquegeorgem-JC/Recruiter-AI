"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Download,
  FileJson,
  FileText,
  FileSpreadsheet,
  Check,
  Filter,
  Columns3,
  Eye,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import type { ExportFormat, ExportPreset, ExportColumn } from "@/lib/types";
import { cn, scoreColor, formatScore, formatDate, statusColor } from "@/lib/utils";

// â”€â”€ FastAPI response shape â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ApiRankingEntry {
  rank: number;
  candidate_id: string;
  name: string;
  title: string;
  match_score: number;
  experience: number;
}

// â”€â”€ Internal row shape (only fields needed for export) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ExportRow {
  rank: number;
  id: string;
  name: string;
  title: string;
  matchScore: number;
  hireabilityScore: number;
  riskScore: number;
  status: string;
  appliedDate: string;
}

// â”€â”€ Deterministic defaults (mirrors rankings page logic) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function deriveRow(entry: ApiRankingEntry): ExportRow {
  const hireabilityScore = Math.min(99, Math.max(40, Math.round(entry.match_score * 0.88 - entry.rank * 0.3)));
  const riskScore = Math.min(40, Math.max(4, Math.round(6 + (entry.rank % 17) * 2)));
  const statusPool = [
    "shortlisted", "shortlisted", "interview", "shortlisted", "interview",
    "screening", "new", "shortlisted", "interview", "offer",
  ];
  const status = statusPool[entry.rank % statusPool.length];
  const daysAgo = (entry.rank % 28) + 1;
  const applied = new Date();
  applied.setDate(applied.getDate() - daysAgo);
  const appliedDate = applied.toISOString().split("T")[0];

  return {
    rank: entry.rank,
    id: entry.candidate_id,
    name: entry.name,
    title: entry.title ?? "AI / ML Engineer",
    matchScore: Math.round(entry.match_score * 10) / 10,
    hireabilityScore,
    riskScore,
    status,
    appliedDate,
  };
}

// â”€â”€ Column / preset / format config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const defaultColumns: ExportColumn[] = [
  { key: "rank", label: "Rank", enabled: true },
  { key: "id", label: "Candidate ID", enabled: true },
  { key: "name", label: "Name", enabled: true },
  { key: "title", label: "Title", enabled: true },
  { key: "matchScore", label: "Match Score", enabled: true },
  { key: "hireabilityScore", label: "Hireability", enabled: true },
  { key: "riskScore", label: "Risk Score", enabled: true },
  { key: "status", label: "Status", enabled: true },
  { key: "appliedDate", label: "Applied Date", enabled: true },
];

const presets: { value: ExportPreset; label: string; description: string }[] = [
  { value: "all", label: "All Candidates", description: "Export all ranked candidates" },
  { value: "top100", label: "Top 100", description: "Top 100 by match score" },
  { value: "shortlisted", label: "Shortlisted", description: "Only shortlisted candidates" },
  { value: "high-risk", label: "High Risk", description: "Risk score â‰¥ 25" },
];

const formatOptions: { value: ExportFormat; label: string; icon: typeof FileJson; description: string }[] = [
  { value: "csv", label: "CSV", icon: FileSpreadsheet, description: "Comma-separated values" },
  { value: "json", label: "JSON", icon: FileJson, description: "JavaScript Object Notation" },
  { value: "pdf", label: "PDF", icon: FileText, description: "Portable Document Format" },
];

// â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ExportPage() {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [preset, setPreset] = useState<ExportPreset>("all");
  const [columns, setColumns] = useState<ExportColumn[]>(defaultColumns);
  const [allRows, setAllRows] = useState<ExportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  // â”€â”€ Fetch from FastAPI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      setAllRows(data.map(deriveRow));
    } catch {
      setError("Could not reach FastAPI server. Ensure http://localhost:8000 is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // â”€â”€ Apply preset filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const previewData: ExportRow[] = (() => {
    let rows = [...allRows];
    if (preset === "top100") rows = rows.slice(0, 100);
    if (preset === "shortlisted") rows = rows.filter((r) => r.status === "shortlisted");
    if (preset === "high-risk") rows = rows.filter((r) => r.riskScore >= 25);
    return rows;
  })();

  // â”€â”€ Column helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const toggleColumn = (key: string) => {
    setColumns((prev) => prev.map((c) => (c.key === key ? { ...c, enabled: !c.enabled } : c)));
  };

  const enabledColumns = columns.filter((c) => c.enabled);

  // â”€â”€ Export handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleExport = async () => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 800));

    const exportData = previewData.map((row) => {
      const obj: Record<string, unknown> = {};
      const r = row as unknown as Record<string, unknown>;
      enabledColumns.forEach((col) => { obj[col.label] = r[col.key]; });
      return obj;
    });

    if (format === "json") {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      downloadBlob(blob, "candidates.json");
    } else if (format === "csv") {
      const headers = enabledColumns.map((c) => c.label).join(",");
      const rows = exportData.map((row) =>
        enabledColumns.map((c) => `"${String(row[c.label] ?? "")}"`).join(",")
      );
      const csv = [headers, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      downloadBlob(blob, "candidates.csv");
    } else {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      downloadBlob(blob, "candidates_data.json");
    }

    setExporting(false);
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // â”€â”€ Error state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
          <Download className="w-6 h-6 text-indigo-500" />
          Export Results
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Export candidate data in your preferred format
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Config */}
        <div className="space-y-6">
          {/* Format */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 animate-fade-in">
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--muted)]" />
              Export Format
            </h2>
            <div className="space-y-2">
              {formatOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                    format === opt.value
                      ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/20"
                      : "border-[var(--border)] hover:bg-[var(--surface-elevated)]"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    format === opt.value ? "bg-indigo-500/10 text-indigo-500" : "bg-[var(--surface-elevated)] text-[var(--muted)]"
                  )}>
                    <opt.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--foreground)]">{opt.label}</p>
                    <p className="text-xs text-[var(--muted)]">{opt.description}</p>
                  </div>
                  {format === opt.value && <Check className="w-4 h-4 text-indigo-500" />}
                </button>
              ))}
            </div>
          </div>

          {/* Preset */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 animate-fade-in stagger-1">
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--muted)]" />
              Filter Preset
            </h2>
            <div className="space-y-2">
              {presets.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPreset(p.value)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                    preset === p.value
                      ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/20"
                      : "border-[var(--border)] hover:bg-[var(--surface-elevated)]"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{p.label}</p>
                    <p className="text-xs text-[var(--muted)]">{p.description}</p>
                  </div>
                  {preset === p.value && <Check className="w-4 h-4 text-indigo-500" />}
                </button>
              ))}
            </div>
          </div>

          {/* Columns */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 animate-fade-in stagger-2">
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <Columns3 className="w-4 h-4 text-[var(--muted)]" />
              Columns
            </h2>
            <div className="space-y-1.5">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--surface-elevated)] cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={col.enabled}
                    onChange={() => toggleColumn(col.key)}
                    className="w-4 h-4 accent-indigo-500 rounded"
                  />
                  <span className="text-sm text-[var(--foreground)]">{col.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exporting || enabledColumns.length === 0 || loading}
            className={cn(
              "w-full flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold transition-all shadow-lg",
              exported
                ? "bg-emerald-500 text-white shadow-emerald-500/25"
                : "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]",
              (exporting || enabledColumns.length === 0 || loading) && "opacity-60 cursor-not-allowed hover:scale-100"
            )}
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting...
              </>
            ) : exported ? (
              <>
                <Check className="w-4 h-4" />
                Exported Successfully!
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {previewData.length} candidates
              </>
            )}
          </button>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden animate-fade-in stagger-3 flex flex-col h-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[var(--muted)]" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Preview</h2>
            </div>
            <span className="text-xs text-[var(--muted)]">
              {previewData.length} rows &bull; {enabledColumns.length} columns
            </span>
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  Loading from FastAPI...
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-[var(--surface-elevated)]">
                  <tr className="border-b border-[var(--border)]">
                    {enabledColumns.map((col) => (
                      <th
                        key={col.key}
                        className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 25).map((row) => {
                    const r = row as unknown as Record<string, unknown>;
                    return (
                      <tr key={row.id} className="border-b border-[var(--border-muted)] hover:bg-[var(--surface-elevated)] transition-colors">
                        {enabledColumns.map((col) => (
                          <td key={col.key} className="py-2.5 px-4 text-sm text-[var(--foreground)] whitespace-nowrap">
                            {col.key === "matchScore" || col.key === "hireabilityScore" ? (
                              <span className={cn("font-semibold", scoreColor(r[col.key] as number))}>
                                {formatScore(r[col.key] as number)}
                              </span>
                            ) : col.key === "riskScore" ? (
                              <span className={cn("font-semibold", scoreColor(100 - (r[col.key] as number)))}>
                                {formatScore(r[col.key] as number)}
                              </span>
                            ) : col.key === "status" ? (
                              <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", statusColor(r[col.key] as string))}>
                                {String(r[col.key])}
                              </span>
                            ) : col.key === "appliedDate" ? (
                              formatDate(r[col.key] as string)
                            ) : col.key === "name" ? (
                              <span className="font-medium">{String(r[col.key])}</span>
                            ) : (
                              String(r[col.key])
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {previewData.length > 25 && (
            <div className="px-5 py-3 border-t border-[var(--border)] text-center text-xs text-[var(--muted)]">
              Showing 25 of {previewData.length} rows in preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

