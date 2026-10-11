"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useTheme } from "@/components/theme/ThemeProvider";
import { isPremiumPlan as checkPremiumPlan } from "@/lib/access-control";
import { ApiError, getAuthStatus, getMyUploadDetail, listMyUploads } from "@/services/api";
import { AuthUser, UploadRecordDetail, UploadRecordSummary } from "@/types/chat";

function SectionCard({
  title,
  children,
  isDark,
}: {
  title: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <section
      className={`rounded-[1.35rem] border px-5 py-5 ${
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

function CollapsibleDocumentSection({
  title,
  children,
  isDark,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  isDark: boolean;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className={`rounded-[1.35rem] border px-5 py-5 ${
        isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white"
      }`}
    >
      <summary
        className={`cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.22em] ${
          isDark ? "text-slate-400" : "text-slate-500"
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

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function getReadableUploadStatus(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "ocr_applied") return "Leitura do arquivo concluida com OCR";
  if (normalized === "ready") return "Leitura do arquivo concluida";
  if (normalized === "ocr_required") return "Arquivo precisa de OCR";
  if (!normalized) return "Em analise";
  return status || "Em analise";
}

function getReadableSheetState(
  status?: string | null,
  isReady?: boolean,
  pendingCount?: number
) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "ready" || isReady) return "Pronta para revisar";
  if (pendingCount && pendingCount > 0) return "Ainda preciso confirmar alguns pontos";
  if (normalized === "in_progress") return "Em montagem";
  if (normalized === "pending") return "Ainda em montagem";
  return "Ainda em analise";
}

function getPendingFieldGuidance(label: string, value?: string | null) {
  const normalized = (label || "").trim().toLowerCase();

  if (normalized.includes("13o") || normalized.includes("decimo terceiro")) {
    return {
      title: "Revisar quadro de 13o salario",
      description:
        value ||
        "Veja se o informe traz um quadro proprio de 13o para nao misturar esse valor com o rendimento comum.",
    };
  }

  if (normalized.includes("isento")) {
    return {
      title: "Revisar rendimentos isentos",
      description:
        value ||
        "Confira se existe um quadro de rendimentos isentos ou nao tributaveis antes de concluir a ficha principal.",
    };
  }

  if (normalized.includes("cnpj")) {
    return {
      title: "Confirmar CNPJ da fonte",
      description:
        value ||
        "Vale localizar o CNPJ da fonte pagadora no cabecalho do informe para completar a ficha com seguranca.",
    };
  }

  return {
    title: label || "Confirmar campo pendente",
    description:
      value || "Esse ponto ainda precisa de confirmacao antes de considerar a ficha principal pronta para revisar.",
  };
}

function buildChatReviewHref(
  uploadId: string,
  documentLabel: string,
  guidanceTitle: string,
  conversationId?: string | null
) {
  const params = new URLSearchParams();
  const prompt = `Quero continuar a revisão do arquivo ${documentLabel} (${uploadId}) focando em ${guidanceTitle}. Comece sua resposta dizendo que vai continuar a análise desse arquivo com esse foco e, em seguida, me diga exatamente o que preciso confirmar agora.`;
  params.set("prompt", prompt);
  params.set("uploadId", uploadId);
  params.set("reviewLabel", guidanceTitle);
  params.set("documentLabel", documentLabel);
  if (conversationId) {
    params.set("conversationId", conversationId);
  }
  return `/chat?${params.toString()}`;
}

function getFriendlyErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    return "Entre na sua conta para acompanhar seus documentos.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Não foi possível carregar seus documentos agora.";
}

export default function MyDocumentsPage() {
  const { resolvedTheme } = useTheme();
  const searchParams = useSearchParams();
  const isDark = resolvedTheme === "dark";
  const pageClassName = isDark
    ? "min-h-screen bg-[#111827] text-slate-100"
    : "min-h-screen bg-[#f5f5f7] text-slate-900";

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [items, setItems] = useState<UploadRecordSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UploadRecordDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preferredUploadId = searchParams.get("uploadId");

  useEffect(() => {
    let active = true;

    async function loadAuth() {
      try {
        const status = await getAuthStatus();
        if (!active) return;
        setAuthUser(status.user);
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
    if (authLoading || !authUser) {
      setLoadingList(false);
      return;
    }

    let active = true;

    async function loadItems() {
      setLoadingList(true);
      setError(null);
      try {
        const response = await listMyUploads(20);
        if (!active) return;
        setItems(response.items);
        setSelectedId((current) =>
          preferredUploadId &&
          response.items.some((item) => item.id === preferredUploadId)
            ? preferredUploadId
            : current && response.items.some((item) => item.id === current)
            ? current
            : (response.items[0]?.id ?? null)
        );
      } catch (loadError) {
        if (!active) return;
        setError(getFriendlyErrorMessage(loadError));
      } finally {
        if (active) setLoadingList(false);
      }
    }

    void loadItems();
    return () => {
      active = false;
    };
  }, [authLoading, authUser, preferredUploadId]);

  useEffect(() => {
    if (!authUser || !selectedId) {
      setDetail(null);
      return;
    }

    const uploadId = selectedId;
    let active = true;

    async function loadDetail() {
      setLoadingDetail(true);
      setError(null);
      try {
        const response = await getMyUploadDetail(uploadId);
        if (!active) return;
        setDetail(response);
      } catch (loadError) {
        if (!active) return;
        setError(getFriendlyErrorMessage(loadError));
      } finally {
        if (active) setLoadingDetail(false);
      }
    }

    void loadDetail();
    return () => {
      active = false;
    };
  }, [authUser, selectedId]);

  const primaryActions = useMemo(
    () =>
      detail?.extraction?.analysis?.priority_actions?.length
        ? detail.extraction.analysis.priority_actions.slice(0, 3)
        : detail?.field_actions.slice(0, 3) ?? [],
    [detail]
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
  const isPremiumPlan = checkPremiumPlan(authUser?.plan);
  const uploadsAllowed = Boolean(authUser?.usage?.uploads_allowed ?? isPremiumPlan);

  if (authLoading) {
    return (
      <main className={pageClassName}>
        <section className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
          <SectionCard title="Meus documentos" isDark={isDark}>
            <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
              Carregando sua área de documentos...
            </p>
          </SectionCard>
        </section>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className={pageClassName}>
        <section className="mx-auto w-full max-w-[980px] px-4 py-8 sm:px-6 lg:px-8">
          <SectionCard title="Meus documentos" isDark={isDark}>
            <p className={isDark ? "text-sm text-slate-300" : "text-sm text-slate-600"}>
              Entre na sua conta para acompanhar os arquivos enviados e o que já foi identificado para a sua declaração.
            </p>
            <div className="mt-4">
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

  if (!uploadsAllowed) {
    return (
      <main className={pageClassName}>
        <section className="mx-auto w-full max-w-[980px] px-4 py-8 sm:px-6 lg:px-8">
          <SectionCard title="Meus documentos" isDark={isDark}>
            <div className="space-y-4">
              <p className={isDark ? "text-sm text-slate-300" : "text-sm text-slate-600"}>
                O acompanhamento de documentos fica disponivel no plano Premium. Com ele, voce pode enviar arquivos, revisar a ficha principal sugerida e continuar a analise direto no chat.
              </p>
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  isDark
                    ? "border-amber-300/20 bg-amber-500/10 text-amber-100"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                Seu plano atual e Free. Faca upgrade para liberar upload e a trilha guiada por documento.
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/upgrade"
                  className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 ${
                    isDark
                      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-white"
                  }`}
                >
                  Fazer upgrade
                </Link>
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
            </div>
          </SectionCard>
        </section>
      </main>
    );
  }

  return (
    <main className={pageClassName}>
      <section className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-4 px-4 py-4 lg:px-6">
        <header
          className={`rounded-[1.5rem] border px-6 py-5 ${
            isDark ? "border-white/10 bg-[#0f172a]" : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className={`text-[1.7rem] font-semibold tracking-tight lg:text-[2rem] ${isDark ? "text-white" : "text-slate-900"}`}>
                Meus documentos
              </h1>
              <p className={`mt-2 max-w-3xl text-sm leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Acompanhe o que o sistema já identificou no seu arquivo e como isso pode ajudar no preenchimento da declaração.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                  isPremiumPlan
                    ? isDark
                      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : isDark
                      ? "border-white/10 bg-white/[0.04] text-slate-300"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                Plano {isPremiumPlan ? "Premium" : "Free"}
              </span>
              {authUser?.usage ? (
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                    isDark
                      ? "border-white/10 bg-white/[0.04] text-slate-300"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {authUser.usage.chat_interactions_limit == null
                    ? "Chat sem limite"
                    : `${authUser.usage.chat_interactions_remaining ?? 0} interacoes restantes`}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {!isPremiumPlan ? (
                <Link
                  href="/upgrade"
                  className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 ${
                    isDark
                      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-white"
                  }`}
                >
                  Fazer upgrade
                </Link>
              ) : null}
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
          </div>
        </header>

        {error ? (
          <SectionCard title="Aviso" isDark={isDark}>
            <p className={isDark ? "text-sm text-rose-200" : "text-sm text-rose-700"}>{error}</p>
          </SectionCard>
        ) : null}

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside
            className={`rounded-[1.5rem] border px-4 py-4 ${
              isDark ? "border-white/10 bg-[#0f172a]" : "border-slate-200 bg-white"
            }`}
          >
            {!authUser?.usage?.uploads_allowed ? (
              <div
                className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                  isDark
                    ? "border-amber-300/20 bg-amber-500/10 text-amber-100"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                Upload de documentos disponivel apenas no plano Premium.
              </div>
            ) : null}
            <div className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Arquivos recentes
            </div>
            <div className="mt-3 space-y-3">
              {loadingList ? (
                <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                  Carregando documentos...
                </p>
              ) : items.length ? (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      selectedId === item.id
                        ? isDark
                          ? "border-emerald-400/30 bg-emerald-500/10"
                          : "border-emerald-200 bg-emerald-50"
                        : isDark
                          ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                          : "border-slate-200 bg-slate-50 hover:bg-white"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                      {item.filename}
                    </div>
                    <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {item.document_kind || "Documento enviado"} · {formatDateTime(item.uploaded_at)}
                    </div>
                    {item.primary_sheet_label ? (
                      <div className={`mt-2 text-xs ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
                        {item.primary_sheet_label}
                      </div>
                    ) : null}
                  </button>
                ))
              ) : (
                <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                  Você ainda não tem documentos enviados nesta conta.
                </p>
              )}
            </div>
          </aside>

          <div className="space-y-4">
            {loadingDetail ? (
              <SectionCard title="Leitura do documento" isDark={isDark}>
                <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                  Preparando resumo do documento...
                </p>
              </SectionCard>
            ) : detail ? (
              <>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <SectionCard title="Identificação do informe" isDark={isDark}>
                    <div className={`space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                      <p className={isDark ? "text-sm text-slate-300" : "text-sm text-slate-600"}>
                        Entendi este arquivo como um informe de rendimentos e vou focar no que ajuda no preenchimento da declaração.
                      </p>
                      <div><strong>Tipo:</strong> {detail.document_kind || "Documento enviado"}</div>
                      <div><strong>Ano-base:</strong> {detail.base_year || "—"}</div>
                      <div><strong>Origem provável:</strong> {detail.issuer_hint || "—"}</div>
                      <div><strong>Beneficiário:</strong> {detailFactMap.get("Beneficiario dos rendimentos") || "—"}</div>
                      <div><strong>CPF do beneficiário:</strong> {detailFactMap.get("CPF do beneficiario") || "—"}</div>
                      <div><strong>Fonte pagadora:</strong> {detailFactMap.get("Fonte pagadora") || "—"}</div>
                      <div><strong>Natureza do rendimento:</strong> {detailFactMap.get("Natureza do rendimento") || "—"}</div>
                      <div><strong>Leitura do arquivo:</strong> {getReadableUploadStatus(detail.status)}</div>
                    </div>
                  </SectionCard>

                  <SectionCard title="Ficha principal" isDark={isDark}>
                    <div className={`space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                      <p className={isDark ? "text-sm text-slate-300" : "text-sm text-slate-600"}>
                        Esta e a ficha que estou usando como base principal para orientar a sua declaracao.
                      </p>
                      <div><strong>Ficha em foco:</strong> {detail.sheet_state?.primary_sheet_label || detail.primary_sheet_label || "Ainda em analise"}</div>
                      <div>
                        <strong>Estado:</strong>{" "}
                        {getReadableSheetState(
                          detail.sheet_state?.status,
                          detail.primary_sheet_ready,
                          detail.sheet_state?.pending_fields?.length
                        )}
                      </div>
                    </div>
                  </SectionCard>
                </div>

                <SectionCard title="O que declarar agora" isDark={isDark}>
                  {detail.extraction?.analysis?.assistant_summary ? (
                    <p className={`text-sm leading-7 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                      {detail.extraction.analysis.assistant_summary}
                    </p>
                  ) : null}
                  {primaryActions.length ? (
                    <div className="mt-4 space-y-3">
                      {primaryActions.map((action) => (
                        <div
                          key={`${action.label}-${action.target_sheet}-${action.target_field || "no-field"}`}
                          className={`rounded-2xl border px-4 py-3 ${
                            isDark ? "border-emerald-400/15 bg-emerald-500/10" : "border-emerald-200 bg-emerald-50"
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
                            <strong>Como declarar:</strong> {action.action_description}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`mt-3 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Ainda nao ha uma orientacao pratica salva para este documento.
                    </p>
                  )}
                </SectionCard>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <CollapsibleDocumentSection title="Campos já identificados" isDark={isDark}>
                    {detail.sheet_state?.filled_fields?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {detail.sheet_state.filled_fields.map((item) => (
                          <span
                            key={`${item.label}-${item.value}`}
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
                    ) : (
                      <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                        Nenhum campo confirmado ainda.
                      </p>
                    )}
                  </CollapsibleDocumentSection>

                  <SectionCard title="O que ainda falta" isDark={isDark}>
                    {detail.sheet_state?.pending_fields?.length ? (
                      <div className="space-y-3">
                        {detail.sheet_state.pending_fields.map((item) => {
                          const guidance = getPendingFieldGuidance(item.label, item.value || item.status);
                          return (
                            <div
                              key={`${item.label}-${item.value}-${item.status}`}
                              className={`rounded-2xl border px-4 py-3 ${
                                isDark
                                  ? "border-amber-400/20 bg-amber-500/10"
                                  : "border-amber-200 bg-amber-50"
                              }`}
                            >
                              <div className={`text-sm font-semibold ${isDark ? "text-amber-100" : "text-amber-800"}`}>
                                {guidance.title}
                              </div>
                              <div className={`mt-1 text-sm leading-6 ${isDark ? "text-amber-50/90" : "text-amber-700"}`}>
                                {guidance.description}
                              </div>
                              <div className="mt-3">
                                <Link
                                  href={buildChatReviewHref(
                                    detail.id,
                                    detail.filename,
                                    guidance.title,
                                    detail.conversation_id
                                  )}
                                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
                                    isDark
                                      ? "border-amber-200/20 bg-white/[0.06] text-amber-50 hover:bg-white/[0.1]"
                                      : "border-amber-300 bg-white text-amber-700 hover:bg-amber-100"
                                  }`}
                                >
                                  Continuar revisao no chat
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                        Nenhum campo pendente salvo.
                      </p>
                    )}
                  </SectionCard>
                </div>

                <CollapsibleDocumentSection title="Como isso ajuda na declaração" isDark={isDark}>
                  {detail.extraction?.analysis?.assistant_summary ? (
                    <p className={`text-sm leading-7 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                      {detail.extraction.analysis.assistant_summary}
                    </p>
                  ) : null}
                  {primaryActions.length ? (
                    <div className="mt-4 space-y-3">
                      {primaryActions.map((action) => (
                        <div
                          key={`${action.label}-${action.target_sheet}-${action.target_field || "no-field"}`}
                          className={`rounded-2xl border px-4 py-3 ${
                            isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
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
                            <strong>Como declarar:</strong> {action.action_description}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`mt-3 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Ainda não há um mapa de preenchimento salvo para este documento.
                    </p>
                  )}
                </CollapsibleDocumentSection>
              </>
            ) : (
              <SectionCard title="Leitura do documento" isDark={isDark}>
                <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                  Selecione um documento à esquerda para ver o resumo da análise.
                </p>
              </SectionCard>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
