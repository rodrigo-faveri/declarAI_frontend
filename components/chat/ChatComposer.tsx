"use client";

import { useEffect } from "react";
import { Paperclip, RefreshCcw, SendHorizonal, X } from "lucide-react";

import { UploadedDocument } from "@/types/chat";

type ChatComposerProps = {
  message: string;
  isDark?: boolean;
  loading: boolean;
  resetting: boolean;
  error: string;
  rateLimitMessage: string;
  rateLimitRemainingSeconds: number;
  maxMessageLength: number;
  placeholder?: string;
  uploadedDocuments?: UploadedDocument[];
  uploadedDocumentOverrides?: Record<string, string>;
  uploadedDocumentKindOptions?: Record<string, string[]>;
  uploadingDocument?: boolean;
  activeGuidedQuestion?: string | null;
  guidedDocumentLabel?: string | null;
  guidedSheetLabel?: string | null;
  remainingGuidedQuestions?: number;
  guidedQuickReplies?: string[];
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  onQuickReply?: (reply: string) => void;
  canUploadDocuments?: boolean;
  uploadBlockedMessage?: string;
  onPickDocument: (file: File) => void;
  onRemoveUploadedDocument: (documentId: string) => void;
  onConfirmUploadedDocumentKind?: (documentId: string, kind: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

export default function ChatComposer({
  message,
  isDark = true,
  loading,
  resetting,
  error,
  rateLimitMessage,
  rateLimitRemainingSeconds,
  maxMessageLength,
  placeholder = "Pergunte sobre imposto de renda ou peca uma triagem guiada...",
  uploadedDocuments = [],
  uploadedDocumentOverrides = {},
  uploadedDocumentKindOptions = {},
  uploadingDocument = false,
  activeGuidedQuestion = null,
  guidedDocumentLabel = null,
  guidedSheetLabel = null,
  remainingGuidedQuestions = 0,
  guidedQuickReplies = [],
  onChange,
  onKeyDown,
  onSend,
  onRetry,
  onCancel,
  onQuickReply,
  canUploadDocuments = true,
  uploadBlockedMessage = "",
  onPickDocument,
  onRemoveUploadedDocument,
  onConfirmUploadedDocumentKind,
  textareaRef,
}: ChatComposerProps) {
  const isRateLimited = rateLimitRemainingSeconds > 0;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 176)}px`;
  }, [message, textareaRef]);

  return (
    <div
      className={`border-t p-4 backdrop-blur ${
        isDark
          ? "border-white/10 bg-slate-950/55"
          : "border-slate-200/80 bg-white/80"
      }`}
    >
      <div
        className={`rounded-[1.9rem] border p-3 shadow-[0_-8px_30px_rgba(2,6,23,0.10)] transition-all duration-200 focus-within:-translate-y-0.5 focus-within:shadow-[0_-12px_38px_rgba(2,6,23,0.12)] ${
          isDark
            ? "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.025))]"
            : "border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))]"
        }`}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium ${
              isDark
                ? "border-white/10 bg-white/[0.04] text-slate-300"
                : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isDark ? "bg-emerald-300" : "bg-emerald-500"
              }`}
            />
            {loading ? "Preparando resposta..." : "Pronto para conversar"}
          </div>
          <div
            className={`text-[11px] ${
              message.length > maxMessageLength * 0.9
                ? isDark
                  ? "text-amber-200"
                  : "text-amber-700"
                : isDark
                  ? "text-slate-500"
                  : "text-slate-400"
            }`}
          >
            {message.length}/{maxMessageLength}
          </div>
        </div>

        {!!uploadedDocuments.length && (
          <div className="mb-3 flex flex-wrap gap-2 px-1">
            {uploadedDocuments.map((document) => (
              (() => {
                const needsConfirmation = !!uploadedDocumentKindOptions[document.id]?.length;
                const selectedKind =
                  uploadedDocumentOverrides[document.id] || document.document_kind;

                return (
              <div
                key={document.id}
                className={`inline-flex max-w-full items-start gap-2 rounded-2xl border px-3 py-2 text-xs ${
                  needsConfirmation
                    ? isDark
                      ? "border-amber-300/25 bg-amber-500/10 text-slate-100"
                      : "border-amber-200 bg-amber-50 text-slate-700"
                    : isDark
                      ? "border-white/10 bg-white/[0.04] text-slate-200"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{document.filename}</div>
                    <div className={isDark ? "text-slate-400" : "text-slate-500"}>
                      {[
                        document.status === "ocr_required" ? "OCR necessario" : null,
                        selectedKind,
                        document.base_year ? `ano-base ${document.base_year}` : null,
                        ...document.signals,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Arquivo pronto para analise"}
                    </div>
                    {needsConfirmation && (
                      <div
                        className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                          isDark
                            ? "border-amber-300/25 bg-white/[0.06] text-amber-100"
                            : "border-amber-200 bg-white text-amber-700"
                        }`}
                      >
                        Classificacao precisa de confirmacao
                      </div>
                    )}
                    {!!uploadedDocumentKindOptions[document.id]?.length && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={isDark ? "text-slate-300" : "text-slate-600"}>
                          Confirme o tipo:
                        </span>
                        {uploadedDocumentKindOptions[document.id].map((kind) => {
                          const isSelected = uploadedDocumentOverrides[document.id] === kind;
                          return (
                            <button
                              key={`${document.id}-${kind}`}
                              type="button"
                              onClick={() => onConfirmUploadedDocumentKind?.(document.id, kind)}
                              className={`rounded-full border px-2.5 py-1 text-[11px] transition hover:-translate-y-0.5 ${
                                isSelected
                                  ? isDark
                                    ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                                    : "border-emerald-200 bg-white text-emerald-700"
                                  : isDark
                                    ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {kind}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                <button
                  type="button"
                  onClick={() => onRemoveUploadedDocument(document.id)}
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
                    isDark
                      ? "text-slate-400 hover:bg-white/10 hover:text-white"
                      : "text-slate-500 hover:bg-white hover:text-slate-800"
                  }`}
                  aria-label={`Remover ${document.filename}`}
                  title={`Remover ${document.filename}`}
                >
                  <X size={13} />
                </button>
              </div>
                );
              })()
            ))}
          </div>
        )}

        {activeGuidedQuestion && !uploadedDocuments.length && (
          <div
            className={`mb-3 rounded-[1.35rem] border px-3 py-3 ${
              isDark
                ? "border-violet-400/15 bg-violet-500/10"
                : "border-violet-200 bg-violet-50"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                  isDark
                    ? "border-violet-300/20 bg-white/[0.05] text-violet-100"
                    : "border-violet-200 bg-white text-violet-700"
                }`}
              >
                Continuando leitura do documento
              </span>
              {guidedDocumentLabel ? (
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] ${
                    isDark
                      ? "border-white/10 bg-white/[0.04] text-slate-300"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {guidedDocumentLabel}
                </span>
              ) : null}
              {guidedSheetLabel ? (
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] ${
                    isDark
                      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                      : "border-emerald-200 bg-white text-emerald-700"
                  }`}
                >
                  Ficha em foco: {guidedSheetLabel}
                </span>
              ) : null}
            </div>
            <div
              className={`mt-2 text-sm font-medium leading-6 ${
                isDark ? "text-slate-100" : "text-slate-800"
              }`}
            >
              {activeGuidedQuestion}
            </div>
            <div
              className={`mt-2 text-xs ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {remainingGuidedQuestions > 0
                ? `Me confirme isso e eu sigo para o proximo ponto util. Depois disso, ainda restam ${remainingGuidedQuestions} confirmacao(oes).`
                : "Me confirme isso e eu ajusto a analise com base no que voce responder."}
            </div>
            {!!guidedQuickReplies.length && (
              <div className="mt-3 flex flex-wrap gap-2">
                {guidedQuickReplies.map((reply) => (
                  <button
                    key={`guided-reply-${reply}`}
                    type="button"
                    onClick={() => onQuickReply?.(reply)}
                    disabled={loading || resetting || isRateLimited}
                    className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                      isDark
                        ? "border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
                        : "border-violet-200 bg-white text-violet-700 hover:bg-violet-100/70"
                    }`}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <label htmlFor="chat-message" className="sr-only">
          Mensagem para o DeclarIA
        </label>
        <textarea
          id="chat-message"
          ref={textareaRef}
          className={`min-h-[52px] max-h-44 w-full resize-none overflow-y-auto bg-transparent px-1 text-sm leading-6 outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isDark
              ? "text-white placeholder:text-slate-500"
              : "text-slate-800 placeholder:text-slate-400"
          }`}
          placeholder={placeholder}
          value={message}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          maxLength={maxMessageLength}
          disabled={loading || resetting}
        />

        <div
          className={`mt-3 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-end sm:justify-between ${
            isDark ? "border-white/10" : "border-slate-200"
          }`}
        >
          <div className="flex flex-1 flex-col gap-3">
            <div
              className={`flex flex-1 items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-xs ${
                isDark
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <span className={isDark ? "text-amber-200/90" : "text-amber-700"}>
                Evite enviar CPF, dados bancarios ou outras informacoes sensiveis.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-1">
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition hover:-translate-y-0.5 ${
                  isDark
                    ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                } ${
                  uploadingDocument || !canUploadDocuments
                    ? "pointer-events-none opacity-60"
                    : ""
                }`}
              >
                <Paperclip size={14} />
                {uploadingDocument
                  ? "Enviando arquivo..."
                  : canUploadDocuments
                    ? "Anexar arquivo"
                    : "Upload no Premium"}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.md,.csv,.json,application/pdf,text/plain,text/markdown,text/csv,application/json"
                  disabled={
                    loading ||
                    resetting ||
                    uploadingDocument ||
                    !canUploadDocuments
                  }
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0];
                    if (selectedFile) {
                      onPickDocument(selectedFile);
                    }
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <span className={isDark ? "text-[11px] text-slate-500" : "text-[11px] text-slate-400"}>
                {canUploadDocuments
                  ? "MVP: PDF, TXT, MD, CSV e JSON ate 2 MB. Um arquivo por vez."
                  : uploadBlockedMessage || "Upload liberado no plano Premium."}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            {loading && onCancel ? (
              <button
                type="button"
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition sm:w-auto ${isDark ? "border-rose-300/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20" : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
                onClick={onCancel}
              >
                <X size={16} /> Cancelar resposta
              </button>
            ) : (
              <button
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.28)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                onClick={onSend}
                disabled={
                  loading ||
                  resetting ||
                  isRateLimited ||
                  (!message.trim() && uploadedDocuments.length === 0)
                }
              >
                <SendHorizonal size={16} />
                {isRateLimited
                  ? `Aguarde ${rateLimitRemainingSeconds}s`
                  : "Enviar"}
              </button>
            )}
            <span className="text-center text-[11px] text-slate-500">
              Enter envia · Shift+Enter quebra a linha
            </span>
          </div>
        </div>

        {rateLimitMessage && (
          <div
            className={`mt-3 rounded-2xl border px-3 py-2 text-sm ${
              isDark
                ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
                : "border-amber-300 bg-amber-50 text-amber-800"
            }`}
          >
            {rateLimitMessage}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className={`mt-3 rounded-2xl border px-3 py-2 text-sm ${
              isDark
                ? "border-red-400/20 bg-red-500/10 text-red-200"
                : "border-red-300 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 rounded-xl border border-current/20 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10"
                >
                  <RefreshCcw size={13} />
                  Tentar novamente
                </button>
              ) : null}
            </div>
          </div>
        )}

        {uploadingDocument ? (
          <div className="mt-3" role="status" aria-live="polite">
            <div className={`mb-1 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Enviando e preparando documento…
            </div>
            <div className={`h-1.5 overflow-hidden rounded-full ${isDark ? "bg-white/10" : "bg-slate-200"}`}>
              <div className="h-full w-2/3 animate-pulse rounded-full bg-emerald-400" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
