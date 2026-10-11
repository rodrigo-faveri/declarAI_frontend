"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { HistoryCardDensity } from "@/types/chat";

type HistoryItem = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  confidenceLevel?: "high" | "medium" | "low" | null;
  confidenceReason?: string | null;
  messageCount?: number;
};

type SidebarPanelsProps = {
  historyItems: HistoryItem[];
  activeHistoryId?: string | null;
  highlightedHistoryId?: string | null;
  onNewConversation?: () => void;
  onSelectHistory: (historyId: string) => void;
  onRenameHistory?: (historyId: string) => void;
  onDeleteHistory?: (historyId: string) => void;
  showHistoryBadges?: boolean;
  historyCardDensity?: HistoryCardDensity;
  onChangeHistoryCardDensity?: (density: HistoryCardDensity) => void;
  isDark?: boolean;
  triageProfile?: Record<string, string>;
  activeTaxYear?: string;
  onCollapse?: () => void;
};

function getHistoryGroupLabel(updatedAt: number) {
  const now = new Date();
  const itemDate = new Date(updatedAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const itemTime = itemDate.getTime();

  if (itemTime >= startOfToday) return "Hoje";
  if (itemTime >= startOfYesterday) return "Ontem";
  return "Anteriores";
}

function getHistoryPriority(item: HistoryItem) {
  if (item.confidenceReason === "triagem_concluida") return 4;
  if (item.confidenceReason === "base_oficial_forte") return 3;
  if (item.confidenceReason === "triagem_em_andamento") return 2;
  if (item.confidenceReason === "base_parcial") return 1;
  return 0;
}

function highlightMatch(text: string, query: string, isDark: boolean) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = normalizedQuery.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) return text;

  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + normalizedQuery.length);
  const after = text.slice(matchIndex + normalizedQuery.length);

  return (
    <>
      {before}
      <mark
        className={`rounded px-1 ${isDark
            ? "bg-emerald-400/20 text-emerald-100"
            : "bg-emerald-100 text-emerald-800"
          }`}
      >
        {match}
      </mark>
      {after}
    </>
  );
}

function getConfidenceBadge(
  confidenceReason: string | null | undefined,
  confidenceLevel: string | null | undefined
) {
  if (
    confidenceReason === "triagem_em_andamento" ||
    confidenceReason === "triagem_concluida"
  ) {
    return {
      label: "Triagem",
      tone: "sky" as const,
    };
  }

  if (confidenceReason === "base_oficial_forte" || confidenceLevel === "high") {
    return {
      label: "Base forte",
      tone: "emerald" as const,
    };
  }

  if (confidenceReason === "base_parcial" || confidenceLevel === "medium") {
    return {
      label: "Base parcial",
      tone: "sky" as const,
    };
  }

  if (confidenceReason === "tema_relacionado") {
    return {
      label: "Tema relacionado",
      tone: "amber" as const,
    };
  }

  if (confidenceReason === "sem_base_suficiente" || confidenceLevel === "low") {
    return {
      label: "Contexto limitado",
      tone: "slate" as const,
    };
  }

  return null;
}

export default function SidebarPanels({
  historyItems,
  activeHistoryId,
  highlightedHistoryId,
  onNewConversation,
  onSelectHistory,
  onRenameHistory,
  onDeleteHistory,
  showHistoryBadges = true,
  historyCardDensity = "comfortable",
  onChangeHistoryCardDensity,
  isDark = true,
  triageProfile,
  activeTaxYear,
  onCollapse,
}: SidebarPanelsProps) {
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState<
    "all" | "strong" | "triage" | "review"
  >("all");

  const historyFilterCounts = useMemo(
    () => ({
      all: historyItems.length,
      strong: historyItems.filter(
        (item) => item.confidenceReason === "base_oficial_forte"
      ).length,
      triage: historyItems.filter(
        (item) =>
          item.confidenceReason === "triagem_em_andamento" ||
          item.confidenceReason === "triagem_concluida"
      ).length,
      review: historyItems.filter(
        (item) =>
          item.confidenceReason === "tema_relacionado" ||
          item.confidenceReason === "sem_base_suficiente"
      ).length,
    }),
    [historyItems]
  );

  const filteredHistoryItems = useMemo(() => {
    const normalizedQuery = historyQuery.trim().toLowerCase();

    return historyItems.filter((item) => {
      const matchesQuery = normalizedQuery
        ? `${item.title} ${item.preview}`.toLowerCase().includes(normalizedQuery)
        : true;

      const matchesFilter =
        historyFilter === "all"
          ? true
          : historyFilter === "strong"
            ? item.confidenceReason === "base_oficial_forte"
            : historyFilter === "triage"
              ? item.confidenceReason === "triagem_em_andamento" ||
              item.confidenceReason === "triagem_concluida"
              : item.confidenceReason === "tema_relacionado" ||
              item.confidenceReason === "sem_base_suficiente";

      return matchesQuery && matchesFilter;
    });
  }, [historyFilter, historyItems, historyQuery]);

  const groupedHistoryItems = useMemo<Array<[string, HistoryItem[]]>>(() => {
    const groups = new Map<string, HistoryItem[]>();

    filteredHistoryItems.forEach((item) => {
      const label = getHistoryGroupLabel(item.updatedAt);
      const existing = groups.get(label) ?? [];
      existing.push(item);
      groups.set(label, existing);
    });

    return Array.from(groups.entries()).map(([label, items]) => {
      const sortedItems = [...items].sort((a, b) => {
        const timeDelta = b.updatedAt - a.updatedAt;
        const withinSameWindow = Math.abs(timeDelta) < 1000 * 60 * 60 * 18;

        if (withinSameWindow) {
          const priorityDelta = getHistoryPriority(b) - getHistoryPriority(a);
          if (priorityDelta !== 0) return priorityDelta;
        }

        return timeDelta;
      });
      return [label, sortedItems];
    });
  }, [filteredHistoryItems]);

  const panelClassName = isDark
    ? "sticky top-4 rounded-[1.3rem] border border-white/10 bg-slate-900/84 p-4 shadow-[0_16px_34px_rgba(2,6,23,0.14)]"
    : "sticky top-4 rounded-[1.3rem] border border-slate-200 bg-white/96 p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]";

  const titleClassName = isDark ? "text-white" : "text-slate-900";
  const mutedTextClassName = isDark ? "text-slate-400" : "text-slate-600";
  const subtleTextClassName = isDark ? "text-slate-500" : "text-slate-400";
  const isCompactHistory = historyCardDensity === "compact";
  const historyCardClassName = isCompactHistory
    ? "rounded-[0.9rem] px-3 py-2"
    : "rounded-[0.95rem] px-3 py-2.5";
  const historyTitleClassName = isCompactHistory
    ? `text-[13px] font-medium leading-5 ${titleClassName}`
    : `text-sm font-medium leading-6 ${titleClassName}`;
  const historyPreviewClassName = isCompactHistory
    ? `mt-1 line-clamp-1 text-[11px] leading-[1.15rem] ${mutedTextClassName}`
    : `mt-1 line-clamp-2 text-xs leading-5 ${mutedTextClassName}`;
  const historyMetaClassName = isCompactHistory
    ? `mt-1.5 flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] ${subtleTextClassName}`
    : `mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] ${subtleTextClassName}`;

  return (
    <aside className="hidden space-y-4 xl:block">
      <div className={panelClassName}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className={`text-base font-semibold ${titleClassName}`}>Histórico</h3>
            <span className={`text-xs ${subtleTextClassName}`}>
              {historyItems.length} conversa{historyItems.length === 1 ? "" : "s"}
            </span>
            {activeTaxYear ? (
              <div className="mt-2 space-y-1">
                <div
                  className={`text-[10px] font-medium uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-400"
                    }`}
                >
                  Base ativa das respostas
                </div>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                >
                  IRPF {activeTaxYear}
                </span>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
          {onChangeHistoryCardDensity ? (
            <div
              className={`inline-flex rounded-full border p-1 ${isDark
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-slate-200 bg-slate-50"
                }`}
            >
              {([
                ["compact", "Min"],
                ["comfortable", "Max"],
              ] as const).map(([density, label]) => {
                const active = historyCardDensity === density;
                return (
                  <button
                    key={density}
                    type="button"
                    onClick={() => onChangeHistoryCardDensity(density)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${active
                        ? isDark
                          ? "bg-emerald-400/15 text-emerald-100"
                          : "bg-emerald-50 text-emerald-700"
                        : isDark
                          ? "text-slate-300 hover:bg-white/[0.08]"
                          : "text-slate-600 hover:bg-white"
                      }`}
                    aria-label={
                      density === "compact"
                        ? "Minimizar cards do Histórico"
                        : "Aumentar cards do Histórico"
                    }
                    title={
                      density === "compact"
                        ? "Cards compactos"
                        : "Cards confortaveis"
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : null}
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              className={`rounded-full border p-2 transition ${isDark ? "border-white/10 text-slate-300 hover:bg-white/10" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}
              aria-label="Recolher histórico de conversas"
              title="Recolher histórico"
            >
              <ChevronLeft size={15} />
            </button>
          ) : null}
          </div>
        </div>

        {onNewConversation ? (
          <button
            type="button"
            onClick={onNewConversation}
            className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${isDark
                ? "border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.09]"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
          >
            <RotateCcw size={16} />
            Nova conversa
          </button>
        ) : null}

        <input
          type="text"
          value={historyQuery}
          onChange={(e) => setHistoryQuery(e.target.value)}
          placeholder="Buscar conversa..."
          className={`mt-4 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-emerald-400/30 focus-visible:ring-2 focus-visible:ring-emerald-300/30 ${isDark
              ? "border-white/10 bg-black/20 text-white placeholder:text-slate-500"
              : "border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400"
            }`}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { key: "all", label: "Todas" },
            { key: "strong", label: "Base forte" },
            { key: "triage", label: "Triagem" },
            { key: "review", label: "A revisar" },
          ].map((filter) => {
            const isActive = historyFilter === filter.key;

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() =>
                  setHistoryFilter(
                    filter.key as "all" | "strong" | "triage" | "review"
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/30 ${isActive
                    ? isDark
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : isDark
                      ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
              >
                {filter.label} ({historyFilterCounts[filter.key as keyof typeof historyFilterCounts]})
              </button>
            );
          })}
        </div>

        {historyItems.length === 0 ? (
          <p className={`mt-4 text-sm leading-6 ${mutedTextClassName}`}>
            Suas conversas salvas vao aparecer aqui conforme voce usar o chat.
          </p>
        ) : filteredHistoryItems.length === 0 ? (
          <p className={`mt-4 text-sm leading-6 ${mutedTextClassName}`}>
            Nenhuma conversa encontrada para essa busca.
          </p>
        ) : (
          <div className="mt-4 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
            {groupedHistoryItems.map(([label, items]) => (
              <div key={label} className="space-y-2">
                <div className={`px-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${subtleTextClassName}`}>
                  {label}
                </div>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`${historyCardClassName} border transition duration-200 ${item.id === activeHistoryId
                        ? isDark
                          ? "border-emerald-400/25 bg-emerald-500/9"
                          : "border-emerald-200 bg-emerald-50/80"
                        : item.id === highlightedHistoryId
                          ? isDark
                            ? "border-sky-400/25 bg-sky-500/8"
                            : "border-sky-200 bg-sky-50/80"
                          : isDark
                            ? "border-white/8 bg-white/[0.02] hover:bg-white/[0.05]"
                            : "border-slate-200 bg-slate-50/70 hover:bg-slate-100/80"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onSelectHistory(item.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <div className={historyTitleClassName}>
                            {highlightMatch(item.title, historyQuery, isDark)}
                          </div>
                          {showHistoryBadges ? (() => {
                            const badge = getConfidenceBadge(
                              item.confidenceReason,
                              item.confidenceLevel
                            );
                            if (!badge) return null;

                            return (
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${badge.tone === "emerald"
                                    ? isDark
                                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : badge.tone === "sky"
                                      ? isDark
                                        ? "border-sky-400/20 bg-sky-500/10 text-sky-200"
                                        : "border-sky-200 bg-sky-50 text-sky-700"
                                      : badge.tone === "amber"
                                        ? isDark
                                          ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                                          : "border-amber-200 bg-amber-50 text-amber-700"
                                        : isDark
                                          ? "border-white/10 bg-white/[0.04] text-slate-300"
                                          : "border-slate-200 bg-slate-100 text-slate-600"
                                  }`}
                              >
                                {badge.label}
                              </span>
                            );
                          })() : null}
                        </div>
                        <div className={historyPreviewClassName}>
                          {highlightMatch(item.preview, historyQuery, isDark)}
                        </div>
                        <div className={historyMetaClassName}>
                          <span>
                            {new Date(item.updatedAt).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {typeof item.messageCount === "number" ? (
                            <span>{item.messageCount} msg</span>
                          ) : null}
                        </div>
                      </button>
                      {onRenameHistory || onDeleteHistory ? (
                      <details className="group/actions relative">
                        <summary
                          className={`flex cursor-pointer list-none rounded-xl border p-2 transition [&::-webkit-details-marker]:hidden ${isDark ? "border-white/10 bg-black/20 text-slate-400 hover:bg-white/10" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"}`}
                          aria-label={`Ações da conversa ${item.title}`}
                        >
                          <MoreHorizontal size={15} />
                        </summary>
                        <div className={`absolute right-0 z-20 mt-1 w-36 rounded-xl border p-1 shadow-xl ${isDark ? "border-white/10 bg-slate-900" : "border-slate-200 bg-white"}`}>
                        {onRenameHistory ? (
                          <button
                            type="button"
                            onClick={() => onRenameHistory(item.id)}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${isDark
                                ? "text-slate-200 hover:bg-white/10"
                                : "text-slate-700 hover:bg-slate-100"
                              }`}
                            aria-label={`Renomear conversa ${item.title}`}
                            title="Renomear conversa"
                          >
                            <Pencil size={14} /> Renomear
                          </button>
                        ) : null}
                        {onDeleteHistory ? (
                          <button
                            type="button"
                            onClick={() => onDeleteHistory(item.id)}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${isDark
                                ? "text-rose-200 hover:bg-rose-500/10"
                                : "text-rose-700 hover:bg-rose-50"
                              }`}
                            aria-label={`Excluir conversa ${item.title}`}
                            title="Excluir conversa"
                          >
                            <Trash2 size={14} /> Excluir
                          </button>
                        ) : null}
                        </div>
                      </details>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {triageProfile && Object.keys(triageProfile).length > 0 ? (
        <div className={panelClassName}>
          <h3 className={`text-xs font-semibold uppercase tracking-[0.2em] ${subtleTextClassName}`}>Perfil identificado</h3>
          <ul className={`mt-3 space-y-2 text-sm ${mutedTextClassName}`}>
            {Object.entries(triageProfile).map(([key, value]) => (
              <li key={key} className="leading-6">
                <strong className={titleClassName}>{key}:</strong> {String(value)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
