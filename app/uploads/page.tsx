"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useTheme } from "@/components/theme/ThemeProvider";
import { getAuthStatus, getUploadDetail, getUploadInsights, listUploads } from "@/services/api";
import {
  AuthUser,
  UploadFragilityItem,
  UploadFieldActionItem,
  UploadFieldReviewItem,
  UploadRecordDetail,
  UploadRecordSummary,
} from "@/types/chat";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function humanizeGluedUpperName(value: string | null | undefined) {
  if (!value) return value || "";
  const trimmed = value.trim();
  if (trimmed.includes(" ") || !/^[A-ZÀ-Ý]+$/.test(trimmed) || trimmed.length < 12) {
    return trimmed;
  }

  const dictionary = [
    "rodrigo",
    "lopes",
    "faveri",
    "favari",
    "silva",
    "santos",
    "souza",
    "oliveira",
    "pereira",
    "ferreira",
    "rodrigues",
    "almeida",
    "martins",
    "barbosa",
    "teixeira",
  ].sort((a, b) => b.length - a.length);

  const compact = trimmed.toLowerCase();
  const memo = new Map<number, string[] | null>();

  function segment(index: number): string[] | null {
    if (index >= compact.length) return [];
    if (memo.has(index)) return memo.get(index) ?? null;

    let best: string[] | null = null;
    for (const part of dictionary) {
      if (!compact.startsWith(part, index)) continue;
      const tail = segment(index + part.length);
      if (!tail) continue;
      const candidate = [part.toUpperCase(), ...tail];
      if (!best || candidate.length < best.length) {
        best = candidate;
      }
    }

    memo.set(index, best);
    return best;
  }

  const segmented = segment(0);
  if (segmented && segmented.join("").toLowerCase() === compact) {
    return segmented.join(" ");
  }
  return trimmed;
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildNormalizedIndexMap(value: string) {
  let normalized = "";
  const indexMap: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const normalizedChar = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    normalized += normalizedChar;
    for (let innerIndex = 0; innerIndex < normalizedChar.length; innerIndex += 1) {
      indexMap.push(index);
    }
  }

  return { normalized, indexMap };
}

function findContextSnippet(rawText: string, searchTerms: string[]) {
  const cleanedTerms = searchTerms.map((term) => normalizeText(term)).filter(Boolean);
  if (!rawText.trim() || !cleanedTerms.length) return null;

  const { normalized, indexMap } = buildNormalizedIndexMap(rawText);

  for (const term of cleanedTerms) {
    const matchIndex = normalized.indexOf(term);
    if (matchIndex < 0) continue;

    const rawStartIndex = indexMap[Math.max(0, matchIndex - 140)] ?? 0;
    const rawEndIndex = indexMap[Math.min(indexMap.length - 1, matchIndex + term.length + 220)] ?? rawText.length;
    const snippet = collapseWhitespace(rawText.slice(rawStartIndex, rawEndIndex + 1));

    if (snippet) {
      const prefix = rawStartIndex > 0 ? "..." : "";
      const suffix = rawEndIndex < rawText.length - 1 ? "..." : "";
      return {
        snippet: `${prefix}${snippet}${suffix}`,
        matchedTerm: rawText.slice(
          indexMap[matchIndex] ?? rawStartIndex,
          (indexMap[Math.min(indexMap.length - 1, matchIndex + term.length - 1)] ?? rawEndIndex) + 1
        ),
      };
    }
  }

  return null;
}

function renderHighlightedSnippet(
  snippet: string,
  highlight: string | null | undefined,
  isDark: boolean
) {
  if (!highlight) {
    return <>{snippet}</>;
  }

  const normalizedSnippet = normalizeText(snippet);
  const normalizedHighlight = normalizeText(highlight);
  const startIndex = normalizedSnippet.indexOf(normalizedHighlight);

  if (startIndex < 0) {
    return <>{snippet}</>;
  }

  const { indexMap } = buildNormalizedIndexMap(snippet);
  const rawStart = indexMap[startIndex] ?? 0;
  const rawEnd = indexMap[Math.min(indexMap.length - 1, startIndex + normalizedHighlight.length - 1)] ?? rawStart;

  const before = snippet.slice(0, rawStart);
  const match = snippet.slice(rawStart, rawEnd + 1);
  const after = snippet.slice(rawEnd + 1);

  return (
    <>
      {before}
      <mark
        className={`rounded px-1 ${
          isDark ? "bg-emerald-500/20 text-emerald-100" : "bg-emerald-100 text-emerald-900"
        }`}
      >
        {match}
      </mark>
      {after}
    </>
  );
}

function getMatchBadge(
  matchType: "strong" | "approximate" | "missing",
  isDark: boolean
) {
  if (matchType === "strong") {
    return (
      <span
        className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${
          isDark
            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}
      >
        match forte
      </span>
    );
  }

  if (matchType === "approximate") {
    return (
      <span
        className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${
          isDark
            ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
            : "border-amber-200 bg-amber-50 text-amber-700"
        }`}
      >
        match aproximado
      </span>
    );
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${
        isDark ? "border-white/10 bg-white/[0.04] text-slate-300" : "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      sem match direto
    </span>
  );
}

function getReviewTone(needsReview: boolean, isDark: boolean) {
  return needsReview
    ? isDark
      ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
      : "border-amber-200 bg-amber-50 text-amber-700"
    : isDark
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function canAccessTechnicalUploads(role?: string | null) {
  return role === "technical" || role === "admin";
}

function SectionCard({
  title,
  children,
  isDark,
  compact = false,
}: {
  title: string;
  children: React.ReactNode;
  isDark: boolean;
  compact?: boolean;
}) {
  return (
    <section
      className={`rounded-[1.35rem] border ${compact ? "px-4 py-4" : "px-5 py-5"} ${
        isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
          isDark ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function FieldPills({
  items,
  isDark,
  emptyLabel,
}: {
  items: UploadFieldReviewItem[];
  isDark: boolean;
  emptyLabel: string;
}) {
  if (!items.length) {
    return <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={`${item.label}-${item.value}-${item.status}`}
          className={`inline-flex rounded-full border px-3 py-1 text-xs ${
            isDark
              ? "border-white/10 bg-white/[0.05] text-slate-200"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {item.label}: {item.value || item.status}
        </span>
      ))}
    </div>
  );
}

function ActionCard({
  action,
  isDark,
  isActive = false,
  onClick,
}: {
  action: UploadFieldActionItem & { created_at?: string | null };
  isDark: boolean;
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
        isActive
          ? isDark
            ? "border-sky-400/30 bg-sky-500/10"
            : "border-sky-200 bg-sky-50"
          : isDark
            ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]"
            : "border-slate-200 bg-slate-50 hover:bg-white"
      }`}
    >
      <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
        {action.label}: {action.value}
      </div>
      <div className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
        <strong>Declarar em:</strong> {action.target_sheet}
      </div>
      {action.target_field ? (
        <div className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
          <strong>Campo principal:</strong> {action.target_field}
        </div>
      ) : null}
      <div className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
        <strong>Ação sugerida:</strong> {action.action_title}
      </div>
      <p className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
        {action.action_description}
      </p>
      {action.entry_steps?.length ? (
        <ol className={`mt-3 list-decimal space-y-1 pl-5 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
          {action.entry_steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}
    </button>
  );
}

function buildExtractionMatches(detail: UploadRecordDetail) {
  const preview = detail.extraction?.text_preview || "";
  if (!preview.trim()) return [];

  const lines = preview
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 300);

  const used = new Set<number>();
  const comparisons: Array<{
    label: string;
    value: string;
    targetSheet?: string | null;
    targetField?: string | null;
    rawLine: string | null;
    matchedTerm: string | null;
    matchType: "strong" | "approximate" | "missing";
  }> = [];

  for (const fact of detail.facts) {
    const normalizedLabel = normalizeText(fact.label);
    const normalizedValue = normalizeText(fact.value);
    const action = detail.field_actions.find(
      (item) =>
        normalizeText(item.label) === normalizedLabel ||
        normalizeText(item.value || "") === normalizedValue
    );

    const rawLineIndex = lines.findIndex((line, index) => {
      if (used.has(index)) return false;
      const normalizedLine = normalizeText(line);
      return (
        (normalizedValue && normalizedLine.includes(normalizedValue)) ||
        normalizedLine.includes(normalizedLabel)
      );
    });

    if (rawLineIndex >= 0) {
      used.add(rawLineIndex);
    }

    const contextualSnippet =
      rawLineIndex >= 0
        ? { snippet: lines[rawLineIndex], matchedTerm: fact.value || fact.label }
        : findContextSnippet(preview, [fact.value, fact.label, action?.target_field || "", action?.target_sheet || ""]);

    const matchType =
      rawLineIndex >= 0
        ? "strong"
        : contextualSnippet?.snippet
          ? "approximate"
          : "missing";

    comparisons.push({
      label: fact.label,
      value: fact.value,
      targetSheet: action?.target_sheet,
      targetField: action?.target_field,
      rawLine: contextualSnippet?.snippet || null,
      matchedTerm: contextualSnippet?.matchedTerm || null,
      matchType,
    });
  }

  return comparisons;
}

export default function UploadsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [items, setItems] = useState<UploadRecordSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UploadRecordDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldFragility, setFieldFragility] = useState<UploadFragilityItem[]>([]);
  const [actionFragility, setActionFragility] = useState<UploadFragilityItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [documentKindFilter, setDocumentKindFilter] = useState("");
  const [baseYearFilter, setBaseYearFilter] = useState("");
  const [matchFilter, setMatchFilter] = useState<"all" | "strong" | "approximate" | "missing">("all");
  const [reviewFilter, setReviewFilter] = useState<"all" | "needs_review" | "stable">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedFieldLabel, setFocusedFieldLabel] = useState("");
  const [detailMode, setDetailMode] = useState<"essential" | "technical">("essential");
  const canViewUploads = canAccessTechnicalUploads(authUser?.role);

  useEffect(() => {
    let active = true;

    async function loadAuth() {
      try {
        const authStatus = await getAuthStatus();
        if (!active) return;
        setAuthUser(authStatus.user);
      } catch {
        if (!active) return;
        setAuthUser(null);
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    void loadAuth();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (authLoading || !canViewUploads) {
      setLoadingList(false);
      return;
    }

    let active = true;

    async function load() {
      setLoadingList(true);
      setError(null);
      try {
        const response = await listUploads(30, {
          status: statusFilter || undefined,
          documentKind: documentKindFilter || undefined,
          baseYear: baseYearFilter || undefined,
        });
        const insights = await getUploadInsights({
          status: statusFilter || undefined,
          documentKind: documentKindFilter || undefined,
          baseYear: baseYearFilter || undefined,
        });
        if (!active) return;
        setItems(response.items);
        setFieldFragility(insights.field_fragility);
        setActionFragility(insights.action_fragility);
        setSelectedId((current) =>
          current && response.items.some((item) => item.id === current) ? current : (response.items[0]?.id ?? null)
        );
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar uploads.");
      } finally {
        if (active) setLoadingList(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [authLoading, canViewUploads, statusFilter, documentKindFilter, baseYearFilter]);

  useEffect(() => {
    if (authLoading || !canViewUploads) {
      setDetail(null);
      setLoadingDetail(false);
      return;
    }

    if (!selectedId) {
      setDetail(null);
      return;
    }

    let active = true;

    async function loadDetail() {
      setLoadingDetail(true);
      setError(null);
      try {
        const response = await getUploadDetail(selectedId);
        if (!active) return;
        setDetail(response);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o detalhe do upload.");
      } finally {
        if (active) setLoadingDetail(false);
      }
    }

    void loadDetail();
    return () => {
      active = false;
    };
  }, [authLoading, canViewUploads, selectedId]);

  const pageClassName = isDark
    ? "min-h-screen bg-[#111827] text-slate-100"
    : "min-h-screen bg-[#f5f5f7] text-slate-900";

  const selectedSummary = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  const visibleItems = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);
    const filtered = items.filter((item) => {
      const needsReview = Boolean(item.fact_match_summary?.needs_review);
      if (reviewFilter === "needs_review") return needsReview;
      if (reviewFilter === "stable") return !needsReview;
      return true;
    }).filter((item) => {
      if (!normalizedSearch) return true;
      const haystack = normalizeText(
        [
          item.filename,
          item.id,
          item.document_kind || "",
          item.issuer_hint || "",
          item.content_hash || "",
        ].join(" ")
      );
      return haystack.includes(normalizedSearch);
    });

    return filtered.sort((left, right) => {
      const leftSummary = left.fact_match_summary;
      const rightSummary = right.fact_match_summary;
      const leftRisk = (leftSummary?.missing || 0) * 10 + (leftSummary?.approximate || 0);
      const rightRisk = (rightSummary?.missing || 0) * 10 + (rightSummary?.approximate || 0);

      if (leftRisk !== rightRisk) {
        return rightRisk - leftRisk;
      }

      return new Date(right.uploaded_at || 0).getTime() - new Date(left.uploaded_at || 0).getTime();
    });
  }, [items, reviewFilter, searchTerm]);

  const uploadStats = useMemo(() => {
    const summary = {
      total: visibleItems.length,
      needsReview: 0,
      stable: 0,
      approximate: 0,
      missing: 0,
    };

    const kindCounts = new Map<string, number>();
    for (const item of visibleItems) {
      const matchSummary = item.fact_match_summary;
      if (matchSummary?.needs_review) {
        summary.needsReview += 1;
      } else {
        summary.stable += 1;
      }
      summary.approximate += matchSummary?.approximate || 0;
      summary.missing += matchSummary?.missing || 0;

      if (matchSummary?.needs_review) {
        const kind = item.document_kind || "Tipo não identificado";
        kindCounts.set(kind, (kindCounts.get(kind) || 0) + 1);
      }
    }

    const topKinds = Array.from(kindCounts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3);

    return { ...summary, topKinds };
  }, [visibleItems]);

  const availableKinds = useMemo(
    () => Array.from(new Set(items.map((item) => item.document_kind).filter(Boolean) as string[])).sort(),
    [items]
  );

  const availableYears = useMemo(
    () => Array.from(new Set(items.map((item) => item.base_year).filter(Boolean) as string[])).sort().reverse(),
    [items]
  );

  const extractionComparisons = useMemo(() => (detail ? buildExtractionMatches(detail) : []), [detail]);
  const reviewFieldFragility = useMemo(
    () =>
      fieldFragility.filter(
        (item) =>
          item.needs_review_count > 0 ||
          item.approximate > 0 ||
          item.missing > 0
      ),
    [fieldFragility]
  );
  const reviewActionFragility = useMemo(
    () =>
      actionFragility.filter(
        (item) =>
          item.needs_review_count > 0 ||
          item.approximate > 0 ||
          item.missing > 0
      ),
    [actionFragility]
  );
  const hasFragilityHighlights =
    uploadStats.needsReview > 0 ||
    reviewFieldFragility.length > 0 ||
    reviewActionFragility.length > 0;
  const filteredComparisons = useMemo(() => {
    return extractionComparisons.filter((item) => {
      const matchesField = focusedFieldLabel ? item.label === focusedFieldLabel : true;
      const matchesType = matchFilter === "all" ? true : item.matchType === matchFilter;
      return matchesField && matchesType;
    });
  }, [extractionComparisons, matchFilter, focusedFieldLabel]);
  const comparisonStats = useMemo(
    () => ({
      total: extractionComparisons.length,
      strong: extractionComparisons.filter((item) => item.matchType === "strong").length,
      approximate: extractionComparisons.filter((item) => item.matchType === "approximate").length,
      missing: extractionComparisons.filter((item) => item.matchType === "missing").length,
    }),
    [extractionComparisons]
  );
  const factMatchMap = useMemo(() => {
    const map = new Map<string, "strong" | "approximate" | "missing">();
    detail?.facts.forEach((fact) => {
      if (fact.match_type === "strong" || fact.match_type === "approximate" || fact.match_type === "missing") {
        map.set(`${fact.label}::${fact.value}`, fact.match_type);
      }
    });
    extractionComparisons.forEach((item) => {
      if (!map.has(`${item.label}::${item.value}`)) {
        map.set(`${item.label}::${item.value}`, item.matchType);
      }
    });
    return map;
  }, [detail?.facts, extractionComparisons]);
  const filteredFacts = useMemo(
    () => detail?.facts.filter((fact) => !focusedFieldLabel || fact.label === focusedFieldLabel) || [],
    [detail?.facts, focusedFieldLabel]
  );
  const filteredActions = useMemo(
    () => detail?.field_actions.filter((action) => !focusedFieldLabel || action.label === focusedFieldLabel) || [],
    [detail?.field_actions, focusedFieldLabel]
  );
  const detailFactMap = useMemo(() => {
    const map = new Map<string, string>();
    detail?.facts.forEach((fact) => {
      if (fact.label && fact.value) {
        map.set(fact.label, fact.value);
      }
    });
    return map;
  }, [detail?.facts]);
  const beneficiaryDisplayName = useMemo(
    () => humanizeGluedUpperName(detailFactMap.get("Beneficiario dos rendimentos")),
    [detailFactMap]
  );
  const beneficiaryCpfDisplay = useMemo(() => {
    const rawValue = detailFactMap.get("CPF do beneficiario");
    return rawValue ? collapseWhitespace(rawValue) : "";
  }, [detailFactMap]);

  if (authLoading) {
    return (
      <main className={pageClassName}>
        <section className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
          <SectionCard title="Uploads" isDark={isDark}>
            <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
              Carregando permissões...
            </p>
          </SectionCard>
        </section>
      </main>
    );
  }

  if (!canViewUploads) {
    return (
      <main className={pageClassName}>
        <section className="mx-auto w-full max-w-[980px] px-4 py-8 sm:px-6 lg:px-8">
          <SectionCard title="Acesso técnico" isDark={isDark}>
            <div className="space-y-4">
              <p className={isDark ? "text-sm leading-6 text-slate-300" : "text-sm leading-6 text-slate-600"}>
                Esta área é voltada ao time técnico para revisar OCR, parser e mapeamento de facts.
              </p>
              <Link
                href="/chat"
                className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 ${
                  isDark
                    ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                Voltar ao chat
              </Link>
            </div>
          </SectionCard>
        </section>
      </main>
    );
  }

  return (
    <main className={pageClassName}>
      <section className="mx-auto flex min-h-screen w-full max-w-[1700px] flex-col gap-4 px-4 py-4 lg:px-6">
        <header
          className={`rounded-[1.5rem] border px-6 py-5 ${
            isDark ? "border-white/10 bg-[#0f172a]" : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-semibold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                Observabilidade de Uploads
              </h1>
              <p className={`mt-2 max-w-3xl text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Inspecione uploads, extrações, facts, ações de preenchimento e o estado da ficha principal sem depender
                só do chat.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/chat"
                className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 ${
                  isDark
                    ? "border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                }`}
              >
                Voltar ao chat
              </Link>
            </div>
          </div>
        </header>

        {error ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              isDark ? "border-rose-400/20 bg-rose-500/10 text-rose-100" : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SectionCard title="Uploads visíveis" isDark={isDark} compact>
            <div className={`text-3xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
              {uploadStats.total}
            </div>
            <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              considerando os filtros atuais
            </p>
          </SectionCard>
          <SectionCard title="Pedem revisão" isDark={isDark} compact>
            <div className={`text-3xl font-semibold ${isDark ? "text-amber-100" : "text-amber-700"}`}>
              {uploadStats.needsReview}
            </div>
            <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {uploadStats.approximate} match(es) aproximados · {uploadStats.missing} sem match
            </p>
          </SectionCard>
          <SectionCard title="Estáveis" isDark={isDark} compact>
            <div className={`text-3xl font-semibold ${isDark ? "text-emerald-100" : "text-emerald-700"}`}>
              {uploadStats.stable}
            </div>
            <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              uploads com facts sem alerta de revisão
            </p>
          </SectionCard>
          <SectionCard title="Tipos mais frágeis" isDark={isDark} compact>
            {uploadStats.topKinds.length ? (
              <div className="space-y-1">
                {uploadStats.topKinds.map(([kind, count]) => (
                  <div key={kind} className={`text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    <strong>{count}x</strong> {kind}
                  </div>
                ))}
              </div>
            ) : (
              <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                Nenhum tipo crítico no filtro atual.
              </p>
            )}
          </SectionCard>
        </div>

        {hasFragilityHighlights ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard title="Campos que mais pedem revisão" isDark={isDark} compact>
            {reviewFieldFragility.length ? (
              <div className="space-y-2">
                {reviewFieldFragility.slice(0, 6).map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setFocusedFieldLabel(item.label)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      focusedFieldLabel === item.label
                        ? isDark
                          ? "border-amber-400/30 bg-amber-500/10"
                          : "border-amber-200 bg-amber-50"
                        : isDark
                          ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                      {item.label}
                    </div>
                    <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {item.needs_review_count} revisão(ões) em {item.total} ocorrência(s)
                    </div>
                    <div className={`mt-2 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      {item.strong} forte · {item.approximate} aproximado · {item.missing} sem match
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                Nenhum campo frágil no filtro atual.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Ações mais frágeis" isDark={isDark} compact>
            {reviewActionFragility.length ? (
              <div className="space-y-2">
                {reviewActionFragility.slice(0, 6).map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setFocusedFieldLabel(item.label)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      focusedFieldLabel === item.label
                        ? isDark
                          ? "border-amber-400/30 bg-amber-500/10"
                          : "border-amber-200 bg-amber-50"
                        : isDark
                          ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                      {item.label}
                    </div>
                    <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {item.needs_review_count} revisão(ões) em {item.total} ocorrência(s)
                    </div>
                    <div className={`mt-2 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      {item.strong} forte · {item.approximate} aproximado · {item.missing} sem match
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                Nenhuma ação frágil no filtro atual.
              </p>
            )}
          </SectionCard>
        </div>
        ) : (
          <SectionCard title="Revisão do parser" isDark={isDark} compact>
            <p className={isDark ? "text-sm text-slate-300" : "text-sm text-slate-600"}>
              Nenhum campo ou ação com fragilidade real no filtro atual. Esta área só aparece em destaque quando
              houver match aproximado ou sem match direto.
            </p>
          </SectionCard>
        )}

        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside
            className={`rounded-[1.5rem] border p-3 ${
              isDark ? "border-white/10 bg-[#0f172a]" : "border-slate-200 bg-white"
            }`}
          >
            <div className="grid gap-2 px-1 pb-3">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nome, id ou hash..."
                className={`rounded-xl border px-3 py-2 text-sm outline-none ${
                  isDark ? "border-white/10 bg-slate-950/60 text-slate-200 placeholder:text-slate-500" : "border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-400"
                }`}
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={`rounded-xl border px-3 py-2 text-sm outline-none ${
                  isDark ? "border-white/10 bg-slate-950/60 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <option value="">Todos os status</option>
                <option value="ready">ready</option>
                <option value="ocr_applied">ocr_applied</option>
                <option value="ocr_required">ocr_required</option>
              </select>
              <select
                value={documentKindFilter}
                onChange={(event) => setDocumentKindFilter(event.target.value)}
                className={`rounded-xl border px-3 py-2 text-sm outline-none ${
                  isDark ? "border-white/10 bg-slate-950/60 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <option value="">Todos os tipos</option>
                {availableKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
              <select
                value={baseYearFilter}
                onChange={(event) => setBaseYearFilter(event.target.value)}
                className={`rounded-xl border px-3 py-2 text-sm outline-none ${
                  isDark ? "border-white/10 bg-slate-950/60 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <option value="">Todos os anos-base</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setReviewFilter("all")}
                  className={`inline-flex rounded-full border px-3 py-1 text-xs transition ${
                    reviewFilter === "all"
                      ? isDark
                        ? "border-sky-400/30 bg-sky-500/10 text-sky-100"
                        : "border-sky-200 bg-sky-50 text-sky-700"
                      : isDark
                        ? "border-white/10 bg-white/[0.03] text-slate-300"
                        : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter("needs_review")}
                  className={`inline-flex rounded-full border px-3 py-1 text-xs transition ${
                    reviewFilter === "needs_review"
                      ? isDark
                        ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                      : isDark
                        ? "border-white/10 bg-white/[0.03] text-slate-300"
                        : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  Pedem revisão
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter("stable")}
                  className={`inline-flex rounded-full border px-3 py-1 text-xs transition ${
                    reviewFilter === "stable"
                      ? isDark
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : isDark
                        ? "border-white/10 bg-white/[0.03] text-slate-300"
                        : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  Estáveis
                </button>
                {focusedFieldLabel ? (
                  <button
                    type="button"
                    onClick={() => setFocusedFieldLabel("")}
                    className={`inline-flex rounded-full border px-3 py-1 text-xs transition ${
                      isDark
                        ? "border-rose-400/30 bg-rose-500/10 text-rose-100"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                  >
                    Limpar foco: {focusedFieldLabel}
                  </button>
                ) : null}
              </div>
            </div>

            <div
              className={`px-2 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Uploads recentes
            </div>

            <div className="mt-3 space-y-2">
              {loadingList ? (
                <div className={isDark ? "px-2 text-sm text-slate-400" : "px-2 text-sm text-slate-500"}>
                  Carregando uploads...
                </div>
              ) : visibleItems.length === 0 ? (
                <div className={isDark ? "px-2 text-sm text-slate-400" : "px-2 text-sm text-slate-500"}>
                  Nenhum upload encontrado para esse filtro.
                </div>
              ) : (
                visibleItems.map((item) => {
                  const isActive = item.id === selectedId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-[1.2rem] border px-3 py-3 text-left transition ${
                        isActive
                          ? isDark
                            ? "border-emerald-400/30 bg-emerald-500/10"
                            : "border-emerald-200 bg-emerald-50"
                          : isDark
                            ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                            : "border-slate-200 bg-slate-50 hover:bg-white"
                      }`}
                    >
                      <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                        {item.filename}
                      </div>
                      <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {item.document_kind || "Tipo não identificado"} · {formatBytes(item.size_bytes)}
                      </div>
                      <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {formatDateTime(item.uploaded_at)}
                      </div>
                      {item.fact_match_summary ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${getReviewTone(
                              item.fact_match_summary.needs_review,
                              isDark
                            )}`}
                          >
                            {item.fact_match_summary.needs_review ? "revisar parser" : "match estável"}
                          </span>
                          <span className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            {item.fact_match_summary.strong} fortes · {item.fact_match_summary.approximate} aprox. ·{" "}
                            {item.fact_match_summary.missing} sem match
                          </span>
                        </div>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <div className="space-y-4">
            <section
              className={`rounded-[1.5rem] border px-6 py-5 ${
                isDark ? "border-white/10 bg-[#0f172a]" : "border-slate-200 bg-white"
              }`}
            >
              {loadingDetail ? (
                <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                  Carregando detalhe do upload...
                </p>
              ) : !detail ? (
                <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                  Selecione um upload para inspecionar.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className={`text-2xl font-semibold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                        {detail.filename}
                      </h2>
                      <p className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        {detail.summary}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailMode("essential")}
                        className={`inline-flex rounded-full border px-3 py-1 text-xs transition ${
                          detailMode === "essential"
                            ? isDark
                              ? "border-sky-400/30 bg-sky-500/10 text-sky-100"
                              : "border-sky-200 bg-sky-50 text-sky-700"
                            : isDark
                              ? "border-white/10 bg-white/[0.04] text-slate-300"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        Visão essencial
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailMode("technical")}
                        className={`inline-flex rounded-full border px-3 py-1 text-xs transition ${
                          detailMode === "technical"
                            ? isDark
                              ? "border-violet-400/30 bg-violet-500/10 text-violet-100"
                              : "border-violet-200 bg-violet-50 text-violet-700"
                            : isDark
                              ? "border-white/10 bg-white/[0.04] text-slate-300"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        Visão técnica
                      </button>
                      {detail.primary_sheet_label ? (
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                            isDark
                              ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {detail.primary_sheet_ready ? "Ficha pronta" : "Ficha em montagem"}: {detail.primary_sheet_label}
                        </span>
                      ) : null}
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                          isDark
                            ? "border-white/10 bg-white/[0.04] text-slate-200"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {detail.status}
                      </span>
                      {detail.detail_match_summary?.facts ? (
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs ${getReviewTone(
                            detail.detail_match_summary.facts.needs_review,
                            isDark
                          )}`}
                        >
                          {detail.detail_match_summary.facts.needs_review
                            ? `${detail.detail_match_summary.facts.approximate + detail.detail_match_summary.facts.missing} ponto(s) pedem revisão`
                            : "Facts com match estável"}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    <SectionCard title="Identificação" isDark={isDark}>
                      <div className={`space-y-2 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        <div>
                          <strong>ID:</strong> {detail.id}
                        </div>
                        <div>
                          <strong>Tipo:</strong> {detail.document_kind || "—"}
                        </div>
                        <div>
                          <strong>Tipo confirmado:</strong> {detail.user_confirmed_document_kind || "—"}
                        </div>
                        <div>
                          <strong>Ano-base:</strong> {detail.base_year || "—"}
                        </div>
                        <div>
                          <strong>Origem provável:</strong> {detail.issuer_hint || "—"}
                        </div>
                        <div>
                          <strong>Beneficiário:</strong> {beneficiaryDisplayName || "—"}
                        </div>
                        <div>
                          <strong>CPF do beneficiário:</strong> {beneficiaryCpfDisplay || "—"}
                        </div>
                        <div>
                          <strong>Fonte pagadora:</strong> {detailFactMap.get("Fonte pagadora") || "—"}
                        </div>
                        <div>
                          <strong>Natureza do rendimento:</strong> {detailFactMap.get("Natureza do rendimento") || "—"}
                        </div>
                        <div>
                          <strong>Conversation ID:</strong> {detail.conversation_id || "—"}
                        </div>
                        <div>
                          <strong>User ID:</strong> {detail.user_id || "—"}
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard title="Arquivo" isDark={isDark}>
                      <div className={`space-y-2 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        <div>
                          <strong>Tamanho:</strong> {formatBytes(detail.size_bytes)}
                        </div>
                        <div>
                          <strong>Hash:</strong> <span className="break-all">{detail.content_hash}</span>
                        </div>
                        <div>
                          <strong>Enviado em:</strong> {formatDateTime(detail.uploaded_at)}
                        </div>
                        <div>
                          <strong>Sinais:</strong> {detail.signals.join(", ") || "—"}
                        </div>
                      </div>
                    </SectionCard>
                  </div>
                </>
              )}
            </section>

            {detail ? (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <SectionCard title="Campos já identificados" isDark={isDark}>
                    <FieldPills
                      items={detail.sheet_state?.filled_fields || detail.extraction?.analysis?.filled_fields || []}
                      isDark={isDark}
                      emptyLabel="Nenhum campo preenchido salvo."
                    />
                  </SectionCard>
                  <SectionCard title="Campos pendentes" isDark={isDark}>
                    <FieldPills
                      items={detail.sheet_state?.pending_fields || detail.extraction?.analysis?.pending_fields || []}
                      isDark={isDark}
                      emptyLabel="Nenhum campo pendente salvo."
                    />
                  </SectionCard>
                </div>

                {detailMode === "essential" ? (
                  <SectionCard title="Como isso ajuda na declaração" isDark={isDark}>
                    {filteredActions.length ? (
                      <div className="space-y-3">
                        {filteredActions.slice(0, 4).map((action) => (
                          <ActionCard
                            key={`${action.label}-${action.value}-${action.target_sheet}`}
                            action={action}
                            isDark={isDark}
                            isActive={focusedFieldLabel === action.label}
                            onClick={() => setFocusedFieldLabel(action.label)}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                        Nenhuma orientação de preenchimento salva ainda.
                      </p>
                    )}
                  </SectionCard>
                ) : null}

                {detailMode === "technical" ? (
                  <>
                <SectionCard title="Comparação lado a lado" isDark={isDark}>
                  <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
                    <div
                      className={`rounded-2xl border px-4 py-4 ${
                        isDark ? "border-white/10 bg-slate-950/50" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div
                        className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        Extração bruta
                      </div>
                      <div
                        className={`mt-3 max-h-[520px] overflow-y-auto rounded-2xl border px-4 py-3 text-sm leading-6 ${
                          isDark ? "border-white/10 bg-slate-950/70 text-slate-300" : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                          {detail.extraction?.text_preview || selectedSummary?.excerpt || "Nenhuma extração disponível."}
                        </pre>
                      </div>
                    </div>

                    <div
                      className={`rounded-2xl border px-4 py-4 ${
                        isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div
                        className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        Facts normalizados
                      </div>
                      <div className="mt-3 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                        {filteredFacts.length ? (
                          filteredFacts.map((fact) => (
                            <button
                              key={`${fact.label}-${fact.value}`}
                              type="button"
                              onClick={() => setFocusedFieldLabel(fact.label)}
                              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                focusedFieldLabel === fact.label
                                  ? isDark
                                    ? "border-sky-400/30 bg-sky-500/10"
                                    : "border-sky-200 bg-sky-50"
                                  : isDark
                                    ? "border-white/10 bg-slate-950/40 hover:bg-white/[0.04]"
                                    : "border-slate-200 bg-white hover:bg-slate-50"
                              }`}
                            >
                              <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                                {fact.label}
                              </div>
                              <div className={`mt-1 text-sm break-words ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                {fact.value}
                              </div>
                              {fact.source ? (
                                <div className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                  Origem: {fact.source}
                                </div>
                              ) : null}
                            </button>
                          ))
                        ) : (
                          <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                            {focusedFieldLabel
                              ? "Nenhum fact encontrado para o campo em foco."
                              : "Nenhum fact salvo ainda."}
                          </p>
                        )}
                      </div>
                    </div>

                    <div
                      className={`rounded-2xl border px-4 py-4 ${
                        isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div
                        className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        Ações sugeridas
                      </div>
                      <div className="mt-3 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                        {filteredActions.length ? (
                          filteredActions.map((action) => (
                            <button
                              key={`${action.label}-${action.value}-${action.target_sheet}`}
                              type="button"
                              onClick={() => setFocusedFieldLabel(action.label)}
                              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                focusedFieldLabel === action.label
                                  ? isDark
                                    ? "border-sky-400/30 bg-sky-500/10"
                                    : "border-sky-200 bg-sky-50"
                                  : isDark
                                    ? "border-white/10 bg-slate-950/40 hover:bg-white/[0.04]"
                                    : "border-slate-200 bg-white hover:bg-slate-50"
                              }`}
                            >
                              <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                                {action.label}
                              </div>
                              <div className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                {action.value}
                              </div>
                              <div className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                <strong>Declarar em:</strong> {action.target_sheet}
                              </div>
                              {action.target_field ? (
                                <div className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                  <strong>Campo:</strong> {action.target_field}
                                </div>
                              ) : null}
                            </button>
                          ))
                        ) : (
                          <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                            {focusedFieldLabel
                              ? "Nenhuma ação encontrada para o campo em foco."
                              : "Nenhuma ação de preenchimento salva ainda."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div
                          className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Relação entre texto, fact e ação
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setMatchFilter("all")}
                            className={`inline-flex rounded-full border px-3 py-1 text-xs transition ${
                              matchFilter === "all"
                                ? isDark
                                  ? "border-sky-400/30 bg-sky-500/10 text-sky-100"
                                  : "border-sky-200 bg-sky-50 text-sky-700"
                                : isDark
                                  ? "border-white/10 bg-white/[0.03] text-slate-300"
                                  : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            Todos ({comparisonStats.total})
                          </button>
                          <button
                            type="button"
                            onClick={() => setMatchFilter("strong")}
                            className={`inline-flex rounded-full border px-3 py-1 text-xs transition ${
                              matchFilter === "strong"
                                ? isDark
                                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : isDark
                                  ? "border-white/10 bg-white/[0.03] text-slate-300"
                                  : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            Fortes ({comparisonStats.strong})
                          </button>
                          <button
                            type="button"
                            onClick={() => setMatchFilter("approximate")}
                            className={`inline-flex rounded-full border px-3 py-1 text-xs transition ${
                              matchFilter === "approximate"
                                ? isDark
                                  ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                                : isDark
                                  ? "border-white/10 bg-white/[0.03] text-slate-300"
                                  : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            Aproximados ({comparisonStats.approximate})
                          </button>
                          <button
                            type="button"
                            onClick={() => setMatchFilter("missing")}
                            className={`inline-flex rounded-full border px-3 py-1 text-xs transition ${
                              matchFilter === "missing"
                                ? isDark
                                  ? "border-slate-400/30 bg-white/[0.08] text-slate-100"
                                  : "border-slate-300 bg-slate-100 text-slate-700"
                                : isDark
                                  ? "border-white/10 bg-white/[0.03] text-slate-300"
                                  : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            Sem match ({comparisonStats.missing})
                          </button>
                        </div>
                      </div>
                      <div className={`text-xs leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Priorize primeiro os itens com <strong>match aproximado</strong> e <strong>sem match direto</strong>.
                      </div>
                    </div>
                    <div className="mt-3 overflow-hidden rounded-2xl border">
                      <div className={`grid grid-cols-[minmax(0,1fr)_220px_220px] text-xs font-semibold uppercase tracking-[0.18em] ${
                        isDark ? "border-white/10 bg-white/[0.05] text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}>
                        <div className="px-4 py-3">Trecho bruto</div>
                        <div className="px-4 py-3">Fact</div>
                        <div className="px-4 py-3">Destino sugerido</div>
                      </div>
                      <div className={`${isDark ? "divide-y divide-white/10" : "divide-y divide-slate-200"}`}>
                        {filteredComparisons.length ? (
                          filteredComparisons.map((item) => (
                            <button
                              key={`${item.label}-${item.value}-${item.targetSheet || "no-sheet"}`}
                              type="button"
                              onClick={() => setFocusedFieldLabel(item.label)}
                              className={`grid w-full grid-cols-[minmax(0,1fr)_220px_220px] text-left transition ${
                                focusedFieldLabel === item.label
                                  ? isDark
                                    ? "bg-sky-500/10"
                                    : "bg-sky-50"
                                  : isDark
                                    ? "bg-transparent hover:bg-white/[0.03]"
                                    : "bg-white hover:bg-slate-50"
                              }`}
                            >
                              <div className={`px-4 py-3 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                <div className="mb-2">{getMatchBadge(item.matchType, isDark)}</div>
                                {item.rawLine
                                  ? renderHighlightedSnippet(item.rawLine, item.matchedTerm, isDark)
                                  : "Trecho específico não localizado no preview salvo."}
                              </div>
                              <div className="px-4 py-3">
                                <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                                  {item.label}
                                </div>
                                <div className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                  {item.value}
                                </div>
                              </div>
                              <div className="px-4 py-3">
                                <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                                  {item.targetSheet || "Sem ação normalizada"}
                                </div>
                                <div className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                  {item.targetField || "Campo ainda não definido"}
                                </div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className={`px-4 py-4 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Nenhum item encontrado para esse filtro.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Mapa de preenchimento detalhado" isDark={isDark}>
                  {filteredActions.length ? (
                    <div className="space-y-3">
                      {filteredActions.map((action) => {
                        const matchType =
                          factMatchMap.get(`${action.label}::${action.value}`) ?? "missing";

                        return (
                          <div key={`${action.label}-${action.value}-${action.target_sheet}`}>
                            <div className="mb-2">{getMatchBadge(matchType, isDark)}</div>
                            <ActionCard
                              action={action}
                              isDark={isDark}
                              isActive={focusedFieldLabel === action.label}
                              onClick={() => setFocusedFieldLabel(action.label)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                      {focusedFieldLabel
                        ? "Nenhuma ação encontrada para o campo em foco."
                        : "Nenhuma ação de preenchimento salva ainda."}
                    </p>
                  )}
                </SectionCard>

                <div className="grid gap-4 lg:grid-cols-2">
                  <SectionCard title="Facts normalizados" isDark={isDark}>
                    {filteredFacts.length ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {filteredFacts.map((fact) => {
                          const matchType =
                            factMatchMap.get(`${fact.label}::${fact.value}`) ?? "missing";

                          return (
                            <button
                              key={`${fact.label}-${fact.value}`}
                              type="button"
                              onClick={() => setFocusedFieldLabel(fact.label)}
                              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                focusedFieldLabel === fact.label
                                  ? isDark
                                    ? "border-sky-400/30 bg-sky-500/10"
                                    : "border-sky-200 bg-sky-50"
                                  : isDark
                                    ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]"
                                    : "border-slate-200 bg-slate-50 hover:bg-white"
                              }`}
                            >
                              <div className="mb-2">{getMatchBadge(matchType, isDark)}</div>
                              <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                                {fact.label}
                              </div>
                              <div className={`mt-1 text-sm break-words ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                {fact.value}
                              </div>
                              {fact.source ? (
                                <div className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                  Origem: {fact.source}
                                </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                        {focusedFieldLabel
                          ? "Nenhum fact encontrado para o campo em foco."
                          : "Nenhum fact salvo ainda."}
                      </p>
                    )}
                  </SectionCard>

                  <SectionCard title="Confirmações do usuário" isDark={isDark}>
                    {detail.confirmations.length ? (
                      <div className="space-y-3">
                        {detail.confirmations.map((item) => (
                          <div
                            key={`${item.question}-${item.answer}-${item.created_at}`}
                            className={`rounded-2xl border px-4 py-3 ${
                              isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
                            }`}
                          >
                            <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                              {item.question}
                            </div>
                            <div className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                              {item.answer}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                        Nenhuma confirmação salva ainda.
                      </p>
                    )}
                  </SectionCard>

                  <SectionCard title="Preview da extração" isDark={isDark}>
                    <div
                      className={`max-h-[420px] overflow-y-auto rounded-2xl border px-4 py-3 text-sm leading-6 ${
                        isDark ? "border-white/10 bg-slate-950/50 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                        {detail.extraction?.text_preview || selectedSummary?.excerpt || "Nenhuma extração disponível."}
                      </pre>
                    </div>
                  </SectionCard>
                </div>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
