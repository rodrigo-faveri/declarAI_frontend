"use client";

import Image from "next/image";
import { ReactNode, useState } from "react";
import { Check, Copy, ExternalLink, ThumbsDown, ThumbsUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getSourceDocumentUrl } from "@/services/api";
import { UiMessage } from "@/types/chat";

type MessageBubbleProps = {
  message: UiMessage;
  isDark?: boolean;
  userAvatarDataUrl?: string | null;
  userInitials?: string;
  copiedId: string | null;
  formatTime: (date: Date) => string;
  onCopyText: (text: string, id?: string) => void;
  onCopyChecklist: (items?: string[], risks?: string[], messageId?: string) => void;
  onPromptAction?: (prompt: string) => void;
  onWebSourceFeedback?: (
    message: UiMessage,
    feedback: "like" | "dislike" | "clear"
  ) => void | Promise<void>;
  webFeedbackLoadingId?: string | null;
};

function RobotAvatar({ isDark = true }: { isDark?: boolean }) {
  return (
    <div
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
        isDark
          ? "bg-[radial-gradient(circle_at_top,_rgba(110,231,183,0.25),rgba(16,185,129,0.14))]"
          : "bg-[radial-gradient(circle_at_top,_rgba(167,243,208,0.95),rgba(209,250,229,0.92))]"
      }`}
    >
      <svg
        viewBox="0 0 40 40"
        className="h-7 w-7"
        aria-hidden="true"
        fill="none"
      >
        <path
          d="M20 6.5v4"
          stroke={isDark ? "#6ee7b7" : "#10b981"}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx="20"
          cy="5"
          r="2"
          fill={isDark ? "#7dd3fc" : "#0ea5e9"}
        />
        <rect
          x="9"
          y="12"
          width="22"
          height="16"
          rx="6"
          fill={isDark ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.96)"}
          stroke={isDark ? "rgba(110,231,183,0.35)" : "rgba(16,185,129,0.35)"}
          strokeWidth="1.5"
        />
        <circle
          cx="16"
          cy="19"
          r="2"
          fill={isDark ? "#6ee7b7" : "#10b981"}
        />
        <circle
          cx="24"
          cy="19"
          r="2"
          fill={isDark ? "#7dd3fc" : "#0ea5e9"}
        />
        <path
          d="M15 24h10"
          stroke={isDark ? "rgba(226,232,240,0.75)" : "rgba(71,85,105,0.7)"}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M12 29.5v2.5M28 29.5v2.5"
          stroke={isDark ? "rgba(110,231,183,0.7)" : "rgba(16,185,129,0.7)"}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function MarkdownMessage({ content, isDark = true }: { content: string; isDark?: boolean }) {
  return (
    <div
      className={`prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-headings:mb-2 prose-headings:mt-4 prose-code:text-emerald-300 prose-table:block prose-table:overflow-x-auto ${
        isDark
          ? "prose-invert prose-strong:text-white prose-pre:border-white/10 prose-pre:bg-slate-950/70 prose-th:text-slate-200 prose-td:text-slate-300"
          : "prose-slate prose-strong:text-slate-900 prose-pre:border-slate-200 prose-pre:bg-slate-100 prose-th:text-slate-700 prose-td:text-slate-600"
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-300 underline underline-offset-4"
            />
          ),
          code({
            inline,
            className,
            children,
            ...props
          }: {
            inline?: boolean;
            className?: string;
            children?: ReactNode;
          }) {
            if (inline) {
              return (
                <code
                  {...props}
                  className={`rounded px-1.5 py-0.5 text-[0.9em] text-emerald-300 ${
                    isDark ? "bg-white/10" : "bg-slate-200"
                  }`}
                >
                  {children}
                </code>
              );
            }

            return (
              <code {...props} className={className}>
                {children}
              </code>
            );
          },
          table: ({ ...props }) => (
            <div className={`my-4 overflow-x-auto rounded-2xl border ${isDark ? "border-white/10" : "border-slate-200"}`}>
              <table {...props} className="min-w-full border-collapse text-sm" />
            </div>
          ),
          th: ({ ...props }) => (
            <th
              {...props}
              className={`border-b px-3 py-2 text-left font-semibold ${
                isDark
                  ? "border-white/10 bg-white/5 text-slate-200"
                  : "border-slate-200 bg-slate-100 text-slate-700"
              }`}
            />
          ),
          td: ({ ...props }) => (
            <td
              {...props}
              className={`border-b px-3 py-2 align-top ${
                isDark
                  ? "border-white/5 text-slate-300"
                  : "border-slate-200 text-slate-600"
              }`}
            />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              {...props}
              className={`my-3 border-l-4 border-emerald-400/40 pl-4 italic ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
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

function formatSourceDateLabel(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getSourceOriginLabel(source: {
  origin?: string | null;
  source_type?: string | null;
  publisher?: string | null;
}) {
  if (source.origin === "web") return "Web";
  if (source.origin === "mcp") return "MCP";
  if (source.source_type === "official") return "Oficial";
  if (source.source_type === "secondary") return "Secundaria";
  if (source.source_type === "curated") return "Curada";
  if (source.publisher?.toLowerCase().includes("receita")) return "Oficial";
  return "Base";
}

function formatFileSize(sizeBytes?: number) {
  if (!sizeBytes) return null;
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (sizeBytes >= 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }
  return `${sizeBytes} B`;
}

function hasVisibleUploadAnalysis(message: UiMessage) {
  const analysis = message.uploadAnalysis;
  if (!analysis) return false;

  return Boolean(
    analysis.document_count ||
      analysis.next_question ||
      analysis.summary_label ||
      analysis.document_names?.length ||
      analysis.document_groups?.length ||
      analysis.answered_items?.length ||
      analysis.facts?.length ||
      analysis.document_playbook?.length ||
      analysis.priority_actions?.length ||
      analysis.field_actions?.length ||
      analysis.filing_roadmap?.length ||
      analysis.topics?.length ||
      analysis.conflicts?.length ||
      analysis.sheet_draft?.length ||
      analysis.pending_questions?.length ||
      analysis.video_recommendations?.length
  );
}

function getUploadFactValue(message: UiMessage, label: string) {
  return (
    message.uploadAnalysis?.facts?.find((fact) => fact.label === label)?.value || null
  );
}

function CollapsibleUploadSection({
  title,
  children,
  isDark,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  isDark?: boolean;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className={`mt-4 rounded-2xl border px-3 py-3 ${
        isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white"
      }`}
    >
      <summary
        className={`cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.18em] ${
          isDark ? "text-slate-300" : "text-slate-600"
        }`}
      >
        <span>{title}</span>
        <span className={`ml-2 text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          toque para expandir
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export function MessageBubble({
  message,
  isDark = true,
  userAvatarDataUrl,
  userInitials = "U",
  copiedId,
  formatTime,
  onCopyText,
  onCopyChecklist,
  onPromptAction,
  onWebSourceFeedback,
  webFeedbackLoadingId,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [showSources, setShowSources] = useState(false);
  const shouldRenderStructuredUploadAnalysis = hasVisibleUploadAnalysis(message);
  const isFocusedReviewMode =
    (message.uploadAnalysis?.summary_label || "").toLowerCase().startsWith("revisao do documento:");
  const beneficiaryName = humanizeGluedUpperName(
    getUploadFactValue(message, "Beneficiario dos rendimentos")
  );
  const beneficiaryCpf = getUploadFactValue(message, "CPF do beneficiario");
  const sourceName = getUploadFactValue(message, "Fonte pagadora");
  const incomeNature = getUploadFactValue(message, "Natureza do rendimento");
  const documentScope = getUploadFactValue(message, "Escopo do documento");

  function formatSourceLabel(source: string) {
    const filename = source.split(/[\\/]/).pop() || source;
    const withoutExtension = filename.replace(/\.[^.]+$/, "");
    const normalized = withoutExtension
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized) return "Fonte consultada";

    return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function getSourceTone(score: number | null) {
    if (score === null) return "neutral";
    if (score >= 0.82) return "strong";
    if (score >= 0.55) return "moderate";
    return "light";
  }

  function formatSourceScore(score: number | null) {
    if (score === null) return "Relevancia nao informada";
    if (score >= 0.82) return "Alta aderencia";
    if (score >= 0.55) return "Boa aderencia";
    return "Aderencia complementar";
  }

  function getSourceHref(source: {
    source: string;
    url?: string | null;
    path?: string | null;
    tax_year?: string | null;
  }) {
    if (source.url) return source.url;
    if (source.path) return getSourceDocumentUrl(source.path, source.tax_year);
    return /^https?:\/\//i.test(source.source) ? source.source : null;
  }

  const webSources = (message.sources ?? []).filter(
    (source) => source.origin === "web" && source.web_result_id
  );
  const likedWebSource = webSources.find((source) => source.feedback_status === "liked");
  const blockedWebSource = webSources.find(
    (source) => source.feedback_status === "blocked"
  );
  const webFeedbackKey = webSources
    .map((source) => source.web_result_id)
    .filter(Boolean)
    .join("|");

  return (
    <div
      className={`flex w-full gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <RobotAvatar isDark={isDark} />
      )}

      <div
        className={`group max-w-[92%] rounded-[1.4rem] border px-4 py-3 shadow-[0_8px_20px_rgba(2,6,23,0.08)] transition sm:max-w-[86%] lg:max-w-[72%] ${
          isUser
            ? isDark
              ? "border-emerald-400/18 bg-[linear-gradient(180deg,rgba(16,185,129,0.18),rgba(16,185,129,0.10))]"
              : "border-emerald-200 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(16,185,129,0.06))]"
            : isDark
              ? "border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))]"
              : "border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,250,250,0.96))]"
        }`}
      >
        <div
          className={`mb-2 flex items-center gap-2 ${
            isUser ? "justify-end" : "justify-between"
          }`}
        >
          <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-300" : "text-slate-500"}`}>
            {isUser ? "Voce" : "DeclarIA"}
          </div>

          {!isUser && message.kind !== "triage_result" && !message.isStreaming && (
            <button
              onClick={() => onCopyText(message.content, message.id)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-xl transition hover:scale-105 ${
                isDark
                  ? "text-slate-400 hover:bg-white/10 hover:text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
              title="Copiar mensagem"
              aria-label="Copiar mensagem"
            >
              {copiedId === message.id ? <Check size={15} /> : <Copy size={15} />}
            </button>
          )}
        </div>

        {message.kind === "triage_result" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${isDark ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                  Triagem concluida
                </span>
                <h3 className={`mt-2 text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                  Resumo da sua analise
                </h3>
              </div>

              <button
                className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition ${isDark ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-slate-200 bg-slate-100 hover:bg-slate-200"}`}
                onClick={() =>
                  onCopyChecklist(message.checklist, message.riskFlags, message.id)
                }
              >
                {copiedId === message.id ? <Check size={16} /> : <Copy size={16} />}
                Copiar checklist
              </button>
            </div>

            {!!message.checklist?.length && (
              <div className={`rounded-2xl border p-4 ${isDark ? "border-emerald-400/15 bg-emerald-500/10" : "border-emerald-200 bg-emerald-50"}`}>
                <h4 className={`mb-3 text-sm font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                  Checklist
                </h4>
                <ul className={`space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  {message.checklist.map((item, index) => (
                    <li key={`check-${index}`} className="flex gap-2">
                      <span className={`mt-[2px] ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>-</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!!message.riskFlags?.length && (
              <div className={`rounded-2xl border p-4 ${isDark ? "border-amber-400/15 bg-amber-500/10" : "border-amber-200 bg-amber-50"}`}>
                <h4 className={`mb-3 text-sm font-semibold ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                  Pontos de atencao
                </h4>
                <ul className={`space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  {message.riskFlags.map((item, index) => (
                    <li key={`risk-${index}`} className="flex gap-2">
                      <span className={`mt-[2px] ${isDark ? "text-amber-300" : "text-amber-700"}`}>-</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : isUser ? (
          <div className="space-y-3">
            {!!message.uploadedDocuments?.length && (
              <div className="flex flex-wrap gap-2">
                {message.uploadedDocuments.map((document) => (
                  <div
                    key={`user-upload-${document.id}`}
                    className={`rounded-2xl border px-3 py-2 text-xs ${
                      isDark
                        ? "border-white/10 bg-white/[0.06] text-slate-200"
                        : "border-white/70 bg-white/70 text-slate-700"
                    }`}
                  >
                    <div className="font-medium">{document.filename}</div>
                    <div className={isDark ? "text-slate-300/80" : "text-slate-500"}>
                      {[formatFileSize(document.size_bytes), ...document.signals].filter(Boolean).join(" • ") ||
                        "Arquivo anexado"}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!!message.content && (
              <div className={`whitespace-pre-wrap break-words text-sm leading-7 ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                {message.content}
              </div>
            )}
          </div>
        ) : !shouldRenderStructuredUploadAnalysis ? (
          <div className={`text-sm leading-7 ${isDark ? "text-slate-100" : "text-slate-800"}`}>
            <MarkdownMessage content={message.content} isDark={isDark} />
            {message.isStreaming && (
              <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-emerald-300 align-middle" />
            )}
          </div>
        ) : null}

        {!isUser && !message.isStreaming && (!!message.nextSteps?.length || !!message.followUpPrompts?.length) && (
          <div className="mt-4 space-y-3">
            {!!message.nextSteps?.length && (
              <div
                className={`rounded-2xl border px-3 py-3 ${
                  isDark ? "border-white/10 bg-white/[0.035]" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Proximos passos
                </div>
                <ul className={`mt-2 space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  {message.nextSteps.map((item, index) => (
                    <li key={`next-${message.id}-${index}`} className="flex gap-2">
                      <span className={isDark ? "text-emerald-300" : "text-emerald-700"}>-</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!!message.followUpPrompts?.length && (
              <div>
                <div className={`mb-2 text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Continuar daqui
                </div>
                <div className="flex flex-wrap gap-2">
                  {message.followUpPrompts.map((prompt) => (
                    <button
                      key={`follow-${message.id}-${prompt}`}
                      type="button"
                      onClick={() => onPromptAction?.(prompt)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
                        isDark
                          ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!message.isStreaming && !!message.uploadedDocuments?.length && !isUser && (
          <div
            className={`mt-4 rounded-2xl border px-3 py-3 ${
              isDark ? "border-white/10 bg-white/[0.035]" : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Arquivos considerados
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {message.uploadedDocuments.map((document) => (
                <div
                  key={`assistant-upload-${document.id}`}
                  className={`max-w-full rounded-2xl border px-3 py-2 text-xs ${
                    isDark
                      ? "border-white/10 bg-white/[0.04] text-slate-200"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <div className="font-medium">{document.filename}</div>
                  <div className={isDark ? "text-slate-400" : "text-slate-500"}>
                    {document.signals.length
                      ? document.signals.join(", ")
                      : "Sem sinal especifico extraido"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!message.isStreaming && shouldRenderStructuredUploadAnalysis && !isUser && (
          <div className="mt-4 space-y-3">
            <div
              className={`rounded-2xl border px-3 py-3 ${
                isDark ? "border-emerald-400/15 bg-emerald-500/10" : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
                {message.uploadAnalysis.summary_label || "Leitura do documento"}
              </div>

              {message.uploadAnalysis.assistant_summary && (
                <div
                  className={`mt-3 rounded-2xl border px-3 py-3 text-sm leading-6 ${
                    isDark
                      ? "border-white/10 bg-white/[0.05] text-slate-100"
                      : "border-white bg-white text-slate-800"
                  }`}
                >
                  {message.uploadAnalysis.assistant_summary}
                </div>
              )}

              {(beneficiaryName || beneficiaryCpf || sourceName || incomeNature) && (
                <div
                  className={`mt-3 rounded-2xl border px-3 py-3 ${
                    isDark ? "border-white/10 bg-white/[0.04]" : "border-white bg-white"
                  }`}
                >
                  <div
                    className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                      isDark ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    Identificacao do informe
                  </div>
                  {documentScope && (
                    <div className="mt-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                          isDark
                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {documentScope}
                      </span>
                    </div>
                  )}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {beneficiaryName && (
                      <div className={`rounded-2xl border px-3 py-2 text-xs ${
                        isDark ? "border-white/10 bg-white/[0.05] text-slate-100" : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}>
                        <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Beneficiario</div>
                        <div className={isDark ? "text-slate-300" : "text-slate-600"}>{beneficiaryName}</div>
                      </div>
                    )}
                    {beneficiaryCpf && (
                      <div className={`rounded-2xl border px-3 py-2 text-xs ${
                        isDark ? "border-white/10 bg-white/[0.05] text-slate-100" : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}>
                        <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>CPF do beneficiario</div>
                        <div className={isDark ? "text-slate-300" : "text-slate-600"}>{beneficiaryCpf}</div>
                      </div>
                    )}
                    {sourceName && (
                      <div className={`rounded-2xl border px-3 py-2 text-xs ${
                        isDark ? "border-white/10 bg-white/[0.05] text-slate-100" : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}>
                        <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Fonte pagadora</div>
                        <div className={isDark ? "text-slate-300" : "text-slate-600"}>{sourceName}</div>
                      </div>
                    )}
                    {incomeNature && (
                      <div className={`rounded-2xl border px-3 py-2 text-xs ${
                        isDark ? "border-white/10 bg-white/[0.05] text-slate-100" : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}>
                        <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Natureza do rendimento</div>
                        <div className={isDark ? "text-slate-300" : "text-slate-600"}>{incomeNature}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(message.uploadAnalysis.primary_sheet_label ||
                message.uploadAnalysis.filled_fields?.length ||
                message.uploadAnalysis.pending_fields?.length) && (
                <div
                  className={`mt-3 rounded-2xl border px-3 py-3 ${
                    isDark ? "border-sky-400/15 bg-sky-500/10" : "border-sky-200 bg-sky-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        isDark ? "text-sky-200" : "text-sky-700"
                      }`}
                    >
                      {message.uploadAnalysis.primary_sheet_ready
                        ? "Ficha principal pronta para revisar"
                        : "Ficha principal em montagem"}
                    </div>
                    {message.uploadAnalysis.primary_sheet_label && (
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] ${
                          isDark
                            ? "border-white/10 bg-white/[0.05] text-slate-200"
                            : "border-white bg-white text-slate-700"
                        }`}
                      >
                        {message.uploadAnalysis.primary_sheet_label}
                      </span>
                    )}
                  </div>

                  {!!message.uploadAnalysis.filled_fields?.length && (
                    <div className="mt-3">
                      <div
                        className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          isDark ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        Campos ja identificados
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {message.uploadAnalysis.filled_fields.map((field) => (
                          <div
                            key={`${message.id}-filled-${field.label}`}
                            className={`rounded-2xl border px-3 py-2 text-xs ${
                              isDark
                                ? "border-white/10 bg-white/[0.05] text-slate-100"
                                : "border-white bg-white text-slate-700"
                            }`}
                          >
                            <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                              {field.label}
                            </div>
                            <div className={isDark ? "text-slate-300" : "text-slate-600"}>
                              {field.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!!message.uploadAnalysis.pending_fields?.length && (
                    <div className="mt-3">
                      <div
                        className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          isDark ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        Campos ainda pendentes
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {message.uploadAnalysis.pending_fields.map((field) => (
                          <div
                            key={`${message.id}-pending-${field.label}`}
                            className={`rounded-2xl border px-3 py-2 text-xs ${
                              isDark
                                ? "border-white/10 bg-slate-950/20 text-slate-100"
                                : "border-slate-200 bg-white text-slate-700"
                            }`}
                          >
                            <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                              {field.label}
                            </div>
                            <div className={isDark ? "text-slate-300" : "text-slate-600"}>
                              {field.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!!message.uploadAnalysis.document_count && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] ${
                      isDark
                        ? "border-white/10 bg-white/[0.06] text-slate-200"
                        : "border-white bg-white text-slate-700"
                    }`}
                  >
                    {message.uploadAnalysis.document_count} arquivo
                    {message.uploadAnalysis.document_count > 1 ? "s" : ""} considerado
                    {message.uploadAnalysis.document_count > 1 ? "s" : ""}
                  </span>
                  {message.uploadAnalysis.document_names?.map((name) => (
                    <span
                      key={`${message.id}-doc-${name}`}
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] ${
                        isDark
                          ? "border-white/10 bg-white/[0.04] text-slate-300"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}

              {!!message.uploadAnalysis.document_groups?.length && (
                <CollapsibleUploadSection
                  title="Grupos de documentos"
                  isDark={isDark}
                  defaultOpen={!isFocusedReviewMode}
                >
                  <div className="flex flex-wrap gap-2">
                    {message.uploadAnalysis.document_groups.map((group) => (
                      <div
                        key={`${message.id}-group-${group.label}`}
                        className={`rounded-2xl border px-3 py-2 text-xs ${
                          isDark ? "border-white/10 bg-white/[0.05] text-slate-100" : "border-white bg-white text-slate-700"
                        }`}
                      >
                        <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                          {group.label}
                        </div>
                        <div className={isDark ? "text-slate-300" : "text-slate-600"}>
                          {group.count} arquivo{group.count > 1 ? "s" : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleUploadSection>
              )}

              {!!message.uploadAnalysis.answered_items?.length && (
                <CollapsibleUploadSection
                  title="Contexto confirmado com voce"
                  isDark={isDark}
                  defaultOpen={!isFocusedReviewMode}
                >
                  <div className="space-y-2">
                    {message.uploadAnalysis.answered_items.map((item, index) => (
                      <div
                        key={`${message.id}-answered-${index}`}
                        className={`rounded-2xl border px-3 py-3 text-xs ${
                          isDark ? "border-emerald-400/15 bg-emerald-500/10 text-slate-100" : "border-emerald-200 bg-emerald-50 text-slate-700"
                        }`}
                      >
                        <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{item.question}</div>
                        <div className={`mt-1 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{item.answer}</div>
                      </div>
                    ))}
                  </div>
                </CollapsibleUploadSection>
              )}

              {!!message.uploadAnalysis.facts?.length && (
                <div className="mt-3">
                  <div className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    Dados encontrados no documento
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {message.uploadAnalysis.facts.map((fact) => (
                      <div
                        key={`${message.id}-${fact.label}`}
                        className={`rounded-2xl border px-3 py-2 text-xs ${
                          isDark ? "border-white/10 bg-white/[0.06] text-slate-100" : "border-white bg-white text-slate-700"
                        }`}
                      >
                        <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{fact.label}</div>
                        <div className={isDark ? "text-slate-300" : "text-slate-600"}>{fact.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!!message.uploadAnalysis.priority_actions?.length && (
                <div className="mt-4">
                  <div className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
                    O que declarar agora
                  </div>
                  <div className="space-y-2">
                    {message.uploadAnalysis.priority_actions.map((action, index) => (
                      <div
                        key={`${message.id}-priority-action-${action.label}-${index}`}
                        className={`rounded-2xl border px-3 py-3 text-xs ${
                          isDark ? "border-emerald-400/20 bg-emerald-500/12 text-slate-100" : "border-emerald-200 bg-emerald-50 text-slate-700"
                        }`}
                      >
                        <div className="text-sm font-semibold">
                          {action.label}: {action.value}
                        </div>
                        <div className="mt-2">
                          <strong>Declarar em:</strong> {action.target_sheet}
                        </div>
                        {action.target_field ? (
                          <div className="mt-1">
                            <strong>Campo principal:</strong> {action.target_field}
                          </div>
                        ) : null}
                        <div className="mt-1">
                          <strong>Como declarar:</strong> {action.action_title}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!!message.uploadAnalysis.document_playbook?.length && (
                <CollapsibleUploadSection
                  title="Roteiro do documento"
                  isDark={isDark}
                  defaultOpen={!isFocusedReviewMode}
                >
                  <div className="space-y-2">
                    {message.uploadAnalysis.document_playbook.map((playbook, index) => (
                      <div
                        key={`${message.id}-playbook-${index}`}
                        className={`rounded-2xl border px-3 py-3 text-xs ${
                          isDark ? "border-emerald-400/15 bg-emerald-500/10 text-slate-100" : "border-emerald-200 bg-emerald-50 text-slate-700"
                        }`}
                      >
                        <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                          {playbook.title}
                        </div>
                        <ol className="mt-3 space-y-2">
                          {playbook.steps.map((step, stepIndex) => (
                            <li key={`${message.id}-playbook-${index}-step-${stepIndex}`} className="flex gap-2">
                              <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                                isDark ? "bg-emerald-400/15 text-emerald-100" : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {stepIndex + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                </CollapsibleUploadSection>
              )}

              {!!message.uploadAnalysis.field_actions?.length && (
                <CollapsibleUploadSection
                  title="Mapa de preenchimento sugerido"
                  isDark={isDark}
                  defaultOpen={!isFocusedReviewMode}
                >
                  <div className="space-y-2">
                    {message.uploadAnalysis.field_actions.map((action, index) => (
                      <div
                        key={`${message.id}-field-action-${action.label}-${index}`}
                        className={`rounded-2xl border px-3 py-3 text-xs ${
                          isDark ? "border-emerald-400/15 bg-emerald-500/10 text-slate-100" : "border-emerald-200 bg-emerald-50 text-slate-700"
                        }`}
                      >
                        <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                          {action.label}
                        </div>
                        <div className={`mt-1 text-sm font-medium ${isDark ? "text-emerald-100" : "text-emerald-800"}`}>
                          {action.value}
                        </div>
                        <div className={`mt-2 rounded-xl border px-2.5 py-2 ${
                          isDark ? "border-white/10 bg-slate-950/30 text-slate-200" : "border-slate-200 bg-white text-slate-700"
                        }`}>
                          <div className="font-medium">Declarar em</div>
                          <div className="mt-1">{action.target_sheet}</div>
                          {action.target_field && (
                            <div className={`mt-2 border-t pt-2 ${
                              isDark ? "border-white/10 text-slate-300" : "border-slate-200 text-slate-600"
                            }`}>
                              <span className="font-medium">Campo principal:</span> {action.target_field}
                            </div>
                          )}
                        </div>
                        <div className={`mt-2 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          <span className="font-medium">Como declarar:</span> {action.action_description}
                        </div>
                        <div className={`mt-2 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                          <span className="font-medium">Acao sugerida:</span> {action.action_title}
                        </div>
                        {!!action.entry_steps?.length && (
                          <div className={`mt-3 rounded-xl border px-2.5 py-2 ${
                            isDark ? "border-white/10 bg-white/[0.04] text-slate-200" : "border-slate-200 bg-white text-slate-700"
                          }`}>
                            <div className="font-medium">Passo a passo</div>
                            <ol className="mt-2 space-y-1.5">
                              {action.entry_steps.map((step, stepIndex) => (
                                <li key={`${message.id}-field-action-${action.label}-entry-${stepIndex}`} className="flex gap-2">
                                  <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                                    isDark ? "bg-emerald-400/15 text-emerald-100" : "bg-emerald-100 text-emerald-800"
                                  }`}>
                                    {stepIndex + 1}
                                  </span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleUploadSection>
              )}

              {!!message.uploadAnalysis.filing_roadmap?.length && (
                <CollapsibleUploadSection
                  title="Roteiro de preenchimento sugerido"
                  isDark={isDark}
                  defaultOpen={!isFocusedReviewMode}
                >
                  <div className="space-y-2">
                    {message.uploadAnalysis.filing_roadmap.map((roadmap, index) => (
                      <div
                        key={`${message.id}-roadmap-${index}`}
                        className={`rounded-2xl border px-3 py-3 text-xs ${
                          isDark ? "border-sky-400/15 bg-sky-500/10 text-slate-100" : "border-sky-200 bg-sky-50 text-slate-700"
                        }`}
                      >
                        <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                          {roadmap.title}
                        </div>
                        <div className={`mt-1 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          {roadmap.summary}
                        </div>
                        <ul className={`mt-3 space-y-1.5 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                          {roadmap.steps.map((step, stepIndex) => (
                            <li key={`${message.id}-roadmap-${index}-step-${stepIndex}`} className="flex gap-2">
                              <span className={isDark ? "text-sky-200" : "text-sky-700"}>-</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CollapsibleUploadSection>
              )}

              {!!message.uploadAnalysis.topics?.length && (
                <CollapsibleUploadSection
                  title="Topicos do IRPF relacionados"
                  isDark={isDark}
                  defaultOpen={!isFocusedReviewMode}
                >
                  <div className="space-y-2">
                    {message.uploadAnalysis.topics.map((topic) => (
                      <div
                        key={`${message.id}-${topic.label}`}
                        className={`rounded-2xl border px-3 py-3 text-xs ${
                          isDark ? "border-white/10 bg-white/[0.05] text-slate-200" : "border-white bg-white text-slate-700"
                        }`}
                      >
                        <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{topic.label}</div>
                        <div className={`mt-1 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{topic.description}</div>
                        <div className={`mt-2 rounded-xl border px-2.5 py-2 ${isDark ? "border-white/10 bg-slate-950/30 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                          <div className="font-medium">Onde costuma entrar</div>
                          <div className="mt-1">{topic.declaration_fit}</div>
                        </div>
                        <div className={`mt-2 rounded-xl border px-2.5 py-2 ${isDark ? "border-emerald-400/15 bg-emerald-500/10 text-slate-100" : "border-emerald-200 bg-emerald-50 text-slate-700"}`}>
                          <div className="font-medium">Ficha provavel</div>
                          <div className="mt-1">{topic.irpf_sheet}</div>
                        </div>
                        {!!topic.declaration_steps?.length && (
                          <div className={`mt-2 rounded-xl border px-2.5 py-2 ${
                            isDark ? "border-sky-400/15 bg-sky-500/10 text-slate-100" : "border-sky-200 bg-sky-50 text-slate-700"
                          }`}>
                            <div className="font-medium">Como declarar na pratica</div>
                            <ul className={`mt-2 space-y-1.5 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                              {topic.declaration_steps.map((step, stepIndex) => (
                                <li key={`${message.id}-${topic.label}-step-${stepIndex}`} className="flex gap-2">
                                  <span className={isDark ? "text-sky-200" : "text-sky-700"}>-</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className={`mt-2 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          <span className="font-medium">Confirmar antes de declarar:</span> {topic.check_note}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleUploadSection>
              )}

              {!!message.uploadAnalysis.conflicts?.length && (
                <CollapsibleUploadSection
                  title="Possiveis conflitos para revisar"
                  isDark={isDark}
                  defaultOpen={!isFocusedReviewMode}
                >
                  <div className="space-y-2">
                    {message.uploadAnalysis.conflicts.map((conflict) => (
                      <div
                        key={`${message.id}-conflict-${conflict.label}`}
                        className={`rounded-2xl border px-3 py-3 text-xs ${
                          isDark ? "border-amber-400/15 bg-amber-500/10 text-slate-100" : "border-amber-200 bg-amber-50 text-slate-700"
                        }`}
                      >
                        <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{conflict.label}</div>
                        <div className={`mt-1 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{conflict.details}</div>
                      </div>
                    ))}
                  </div>
                </CollapsibleUploadSection>
              )}

              {!!message.uploadAnalysis.sheet_draft?.length && (
                <CollapsibleUploadSection
                  title="Rascunho por ficha"
                  isDark={isDark}
                  defaultOpen={!isFocusedReviewMode}
                >
                  <div className="space-y-2">
                    {message.uploadAnalysis.sheet_draft.map((draft) => (
                      <div
                        key={`${message.id}-sheet-${draft.sheet}`}
                        className={`rounded-2xl border px-3 py-3 text-xs ${
                          isDark ? "border-sky-400/15 bg-sky-500/10 text-slate-100" : "border-sky-200 bg-sky-50 text-slate-700"
                        }`}
                      >
                        <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{draft.sheet}</div>
                        <div className={`mt-1 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{draft.guidance}</div>
                        {!!draft.derived_from?.length && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {draft.derived_from.map((item) => (
                              <span
                                key={`${message.id}-${draft.sheet}-${item}`}
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] ${
                                  isDark ? "border-white/10 bg-white/[0.04] text-slate-300" : "border-white bg-white text-slate-600"
                                }`}
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleUploadSection>
              )}

              {!!message.uploadAnalysis.pending_questions?.length && (
                <div className="mt-4">
                  <div className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-violet-200" : "text-violet-700"}`}>
                    O que ainda preciso confirmar com voce
                  </div>
                  <div className="space-y-2">
                    {message.uploadAnalysis.pending_questions.map((item, index) => (
                      <div
                        key={`${message.id}-pending-${index}`}
                        className={`rounded-2xl border px-3 py-3 text-xs ${
                          index === 0
                            ? isDark
                              ? "border-violet-300/20 bg-violet-500/15 text-slate-100"
                              : "border-violet-300 bg-violet-100 text-slate-800"
                            : isDark
                              ? "border-violet-400/15 bg-violet-500/10 text-slate-100"
                              : "border-violet-200 bg-violet-50 text-slate-700"
                        }`}
                      >
                        {index === 0 && (
                          <div
                            className={`mb-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                              isDark
                                ? "border-violet-300/20 bg-white/[0.05] text-violet-100"
                                : "border-violet-200 bg-white text-violet-700"
                            }`}
                          >
                            Pergunta atual
                          </div>
                        )}
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {message.uploadAnalysis.next_question && (
                <div
                  className={`mt-4 rounded-2xl border px-3 py-3 text-sm ${
                    isDark ? "border-white/10 bg-white/[0.04] text-slate-100" : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Proxima pergunta util
                  </div>
                  <div className="mt-2">{message.uploadAnalysis.next_question}</div>
                </div>
              )}

              {!!message.uploadAnalysis.video_recommendations?.length && (
                <CollapsibleUploadSection
                  title="Aprenda mais em video"
                  isDark={isDark}
                  defaultOpen={false}
                >
                  <div
                    className={`mb-3 rounded-2xl border px-3 py-2 text-xs leading-5 ${
                      isDark
                        ? "border-white/10 bg-white/[0.04] text-slate-300"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    Estes videos sao apoio educacional opcional. A orientacao principal da declaracao continua no proprio chat.
                  </div>
                  <div className="space-y-3">
                    {message.uploadAnalysis.video_recommendations.map((video, index) => (
                      <a
                        key={`${message.id}-video-${index}-${video.url}`}
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`block rounded-2xl border px-3 py-3 transition ${
                          isDark
                            ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                              {video.title}
                            </div>
                            <div className={`mt-1 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                              {[video.channel, video.duration].filter(Boolean).join(" • ") || "Video recomendado"}
                            </div>
                            {video.is_preferred_channel ? (
                              <div className="mt-2">
                                <span
                                  className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-medium ${
                                    isDark
                                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  }`}
                                >
                                  Canal priorizado
                                </span>
                              </div>
                            ) : null}
                            {video.snippet ? (
                              <div className={`mt-2 text-xs leading-5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                                {video.snippet}
                              </div>
                            ) : null}
                          </div>
                          <ExternalLink
                            size={14}
                            className={isDark ? "text-slate-300" : "text-slate-500"}
                          />
                        </div>
                      </a>
                    ))}
                  </div>
                </CollapsibleUploadSection>
              )}
            </div>
          </div>
        )}

        {!isUser && !message.isStreaming && webSources.length > 0 && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-2xl border px-3 py-2.5 ${
              isDark
                ? "border-white/10 bg-white/[0.04]"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <span className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Essa resposta da web ajudou?
            </span>
            <button
              type="button"
              disabled={webFeedbackLoadingId === webFeedbackKey}
              onClick={() => onWebSourceFeedback?.(message, "like")}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition ${
                likedWebSource
                  ? isDark
                    ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : isDark
                    ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              } disabled:cursor-not-allowed disabled:opacity-60`}
              title="Curtir resposta web"
              aria-label="Curtir resposta web"
            >
              <ThumbsUp size={14} />
            </button>
            <button
              type="button"
              disabled={webFeedbackLoadingId === webFeedbackKey}
              onClick={() => onWebSourceFeedback?.(message, "dislike")}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition ${
                blockedWebSource
                  ? isDark
                    ? "border-rose-400/30 bg-rose-500/15 text-rose-200"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                  : isDark
                    ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              } disabled:cursor-not-allowed disabled:opacity-60`}
              title="Nao gostei da resposta web"
              aria-label="Nao gostei da resposta web"
            >
              <ThumbsDown size={14} />
            </button>
          </div>
        )}

        {!isUser && !message.isStreaming && !!message.sources?.length && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowSources((current) => !current)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                isDark
                  ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Fontes consultadas
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 ${
                  isDark ? "bg-white/10 text-slate-200" : "bg-white text-slate-600"
                }`}
              >
                {message.sources.length}
              </span>
            </button>

            {showSources && (
              <div className="mt-3 space-y-3">
                {message.sources.map((source, index) => {
                  const tone = getSourceTone(source.score);
                  const href = getSourceHref(source);
                  const originLabel = getSourceOriginLabel(source);

                  return (
                    <div
                      key={`${source.source}-${index}`}
                      className={`rounded-2xl border px-3 py-3 ${
                        tone === "strong"
                          ? isDark
                            ? "border-emerald-400/20 bg-emerald-500/10"
                            : "border-emerald-200 bg-emerald-50"
                          : tone === "moderate"
                            ? isDark
                              ? "border-sky-400/20 bg-sky-500/10"
                              : "border-sky-200 bg-sky-50"
                            : isDark
                              ? "border-white/10 bg-white/[0.04]"
                              : "border-slate-200 bg-slate-50"
                          }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                source.origin === "web"
                                  ? isDark
                                    ? "border-sky-400/20 bg-sky-500/10 text-sky-200"
                                    : "border-sky-200 bg-sky-50 text-sky-700"
                                  : source.origin === "mcp"
                                    ? isDark
                                      ? "border-violet-400/20 bg-violet-500/10 text-violet-200"
                                      : "border-violet-200 bg-violet-50 text-violet-700"
                                    : source.source_type === "official"
                                      ? isDark
                                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : isDark
                                        ? "border-white/10 bg-white/[0.04] text-slate-300"
                                        : "border-slate-200 bg-white text-slate-600"
                              }`}
                            >
                              {originLabel}
                            </span>
                            {(source.exercise_label || source.source_exercise) && (
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                                  isDark
                                    ? "border-white/10 bg-white/[0.04] text-slate-300"
                                    : "border-slate-200 bg-white text-slate-600"
                                }`}
                              >
                                {source.exercise_label || source.source_exercise}
                              </span>
                            )}
                          </div>
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className={`inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4 ${
                                isDark ? "text-white" : "text-slate-900"
                              }`}
                            >
                              {source.title || formatSourceLabel(source.source)}
                              <ExternalLink size={14} />
                            </a>
                          ) : (
                            <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                              {source.title || formatSourceLabel(source.source)}
                            </div>
                          )}
                          <div className={`mt-1 text-xs leading-5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                            {source.publisher ? `${source.publisher} | ` : ""}
                            {formatSourceScore(source.score)}
                          </div>
                          {(source.exercise_label || source.source_exercise || source.published_at || source.updated_at) && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {source.published_at && (
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] ${
                                    isDark
                                      ? "border-white/10 bg-white/[0.04] text-slate-300"
                                      : "border-slate-200 bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  Publicado: {formatSourceDateLabel(source.published_at)}
                                </span>
                              )}
                              {source.updated_at && (
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] ${
                                    isDark
                                      ? "border-white/10 bg-white/[0.04] text-slate-300"
                                      : "border-slate-200 bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  Atualizado: {formatSourceDateLabel(source.updated_at)}
                                </span>
                              )}
                            </div>
                          )}
                          {source.snippet && (
                            <p
                              className={`mt-2 max-w-2xl text-xs leading-5 ${
                                isDark ? "text-slate-300/90" : "text-slate-600"
                              }`}
                            >
                              {source.snippet}
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                            tone === "strong"
                              ? isDark
                                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                                : "border-emerald-200 bg-white text-emerald-700"
                              : tone === "moderate"
                                ? isDark
                                  ? "border-sky-400/20 bg-sky-500/10 text-sky-200"
                                  : "border-sky-200 bg-white text-sky-700"
                                : isDark
                                  ? "border-white/10 bg-white/[0.04] text-slate-300"
                                  : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {source.score !== null ? `${Math.round(source.score * 100)}%` : "Info"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className={`mt-3 text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"} ${isUser ? "text-right" : "text-left"}`}>
          {formatTime(message.createdAt)}
        </div>
      </div>

      {isUser && (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${isDark ? "bg-sky-500/20 text-sky-300" : "bg-sky-100 text-sky-700"}`}>
          {userAvatarDataUrl ? (
            <Image
              src={userAvatarDataUrl}
              alt="Avatar do usuario"
              className="h-10 w-10 rounded-2xl object-cover"
              width={40}
              height={40}
              unoptimized
            />
          ) : (
            userInitials
          )}
        </div>
      )}
    </div>
  );
}

export function LoadingMessage({ isDark = true }: { isDark?: boolean }) {
  return (
    <div className="flex w-full justify-start gap-3">
      <RobotAvatar isDark={isDark} />

      <div className={`rounded-[1.75rem] border px-4 py-3 shadow-[0_12px_40px_rgba(2,6,23,0.16)] ${isDark ? "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]" : "border-slate-200 bg-white"}`}>
        <div className={`mb-2 text-xs font-semibold uppercase tracking-wide ${isDark ? "text-slate-300" : "text-slate-500"}`}>
          DeclarIA
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 animate-bounce rounded-full ${isDark ? "bg-slate-300" : "bg-slate-500"} [animation-delay:-0.3s]`} />
          <span className={`h-2 w-2 animate-bounce rounded-full ${isDark ? "bg-slate-300" : "bg-slate-500"} [animation-delay:-0.15s]`} />
          <span className={`h-2 w-2 animate-bounce rounded-full ${isDark ? "bg-slate-300" : "bg-slate-500"}`} />
        </div>
      </div>
    </div>
  );
}
