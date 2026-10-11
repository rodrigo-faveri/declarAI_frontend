"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  ApiError,
  getDeclarationDECCandidate,
  getDeclarationDECCandidateDownloadUrl,
  getDeclarationDECPreview,
  getDeclarationExportDownloadUrl,
  getDeclarationFinalReportDownloadUrl,
  getDeclarationExportPackage,
  getAuthStatus,
  getCurrentDeclarationDraft,
  rebuildCurrentDeclarationDraft,
  updateDeclarationDraftFinalReview,
  updateDeclarationDraftItemReview,
  updateDeclarationDraftSheetReview,
} from "@/services/api";
import {
  AuthUser,
  DeclarationDraftDECCandidate,
  DeclarationDraftDECPreview,
  DeclarationDraft,
  DeclarationDraftExportPackage,
  DeclarationDraftItem,
} from "@/types/chat";

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

function getFriendlyErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    return "Entre na sua conta para acompanhar o rascunho da sua declaração.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Nao foi possivel carregar a sua declaracao agora.";
}

function getDraftStatusLabel(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "ready") return "Pronta para revisar";
  if (normalized === "empty") return "Ainda sem dados suficientes";
  return "Em montagem";
}

function getItemStatusLabel(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "ready") return "Pronto";
  if (normalized === "pending") return "Pendente";
  return "Revisar";
}

function getItemStatusTone(status: string, isDark: boolean) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "ready") {
    return isDark
      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "pending") {
    return isDark
      ? "border-rose-300/20 bg-rose-500/10 text-rose-100"
      : "border-rose-200 bg-rose-50 text-rose-700";
  }
  return isDark
    ? "border-amber-300/20 bg-amber-500/10 text-amber-100"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function getUserReviewLabel(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "confirmed") return "Confirmado por voce";
  if (normalized === "needs_review") return "Marcado para revisar";
  return null;
}

function getSheetReviewLabel(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "reviewed") return "Ficha revisada";
  if (normalized === "needs_attention") return "Ficha reaberta para revisão";
  return "Ficha em andamento";
}

function getSheetReviewTone(status: string | null | undefined, isDark: boolean) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "reviewed") {
    return isDark
      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "needs_attention") {
    return isDark
      ? "border-amber-300/20 bg-amber-500/10 text-amber-100"
      : "border-amber-200 bg-amber-50 text-amber-700";
  }
  return isDark
    ? "border-white/10 bg-white/[0.04] text-slate-300"
    : "border-slate-200 bg-white text-slate-700";
}

function getChecklistStatusLabel(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "ready") return "Checklist pronto";
  if (normalized === "review") return "Checklist pede revisao";
  return "Checklist em montagem";
}

function getFinalChecklistStatusLabel(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "ready") return "Declaracao pronta para conferencia final";
  if (normalized === "review") return "Declaracao ainda pede revisao";
  if (normalized === "in_progress") return "Declaracao em montagem";
  return "Declaracao ainda sem base suficiente";
}

function getFinalReviewLabel(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "ready_for_filing") return "Marcada como pronta para envio";
  if (normalized === "needs_review") return "Reaberta para revisao";
  return "Ainda nao fechada por voce";
}

function getFinalReviewTone(status: string | null | undefined, isDark: boolean) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "ready_for_filing") {
    return isDark
      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "needs_review") {
    return isDark
      ? "border-amber-300/20 bg-amber-500/10 text-amber-100"
      : "border-amber-200 bg-amber-50 text-amber-700";
  }
  return isDark
    ? "border-white/10 bg-white/[0.04] text-slate-300"
    : "border-slate-200 bg-white text-slate-700";
}

function getCanonicalDomainLabel(domain?: string | null) {
  const normalized = (domain || "").trim().toLowerCase();
  if (normalized === "taxpayer") return "Titular";
  if (normalized === "pj_income") return "Renda PJ / CLT";
  if (normalized === "exclusive_income") return "Tributacao exclusiva";
  if (normalized === "exempt_income") return "Rendimentos isentos";
  if (normalized === "private_pension") return "Previdencia privada";
  if (normalized === "fgts") return "FGTS";
  if (normalized === "real_estate") return "Imovel / financiamento";
  if (normalized === "medical") return "Saude / reembolso";
  if (normalized === "investments") return "Investimentos";
  if (normalized === "dependents") return "Dependentes";
  return domain || "Outro dominio";
}

function buildSheetReviewHref(sheetLabel: string) {
  const params = new URLSearchParams();
  const reviewLabel = `Revisar ficha ${sheetLabel}`;
  const prompt = `Quero continuar a minha declaracao focando na ficha ${sheetLabel}. Comece sua resposta dizendo que vai me orientar apenas nessa ficha e depois me diga o proximo passo mais importante agora.`;
  params.set("prompt", prompt);
  params.set("reviewLabel", reviewLabel);
  params.set("documentLabel", sheetLabel);
  return `/chat?${params.toString()}`;
}

function buildShareableSummaryText(draft: DeclarationDraft) {
  const lines = [
    draft.final_consolidation.exercise_label,
    draft.final_consolidation.readiness_line,
    "",
  ];

  if (draft.final_consolidation.sections.length) {
    draft.final_consolidation.sections.forEach((section) => {
      lines.push(`${section.title}:`);
      section.items.forEach((item) => lines.push(`- ${item}`));
      lines.push("");
    });
  }

  if (draft.final_consolidation.alerts.length) {
    lines.push("Alertas:");
    draft.final_consolidation.alerts.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  if (draft.share_summary.completed_points.length) {
    lines.push("O que ja foi fechado:");
    draft.share_summary.completed_points.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  if (draft.share_summary.attention_points.length) {
    lines.push("O que ainda exige atencao:");
    draft.share_summary.attention_points.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  if (draft.share_summary.sheet_summaries.length) {
    lines.push("Resumo por ficha:");
    draft.share_summary.sheet_summaries.forEach((sheet) => {
      lines.push(`- ${sheet.sheet_label}: ${sheet.status_line}`);
      sheet.highlights.forEach((highlight) => lines.push(`  * ${highlight}`));
    });
    lines.push("");
  }

  if (draft.final_consolidation.next_step || draft.share_summary.next_step) {
    lines.push(
      `Proximo passo: ${draft.final_consolidation.next_step || draft.share_summary.next_step}`
    );
  }

  return lines.join("\n").trim();
}

function groupItemsBySheet(items: DeclarationDraftItem[]) {
  const grouped = new Map<string, DeclarationDraftItem[]>();
  items.forEach((item) => {
    const key = item.target_sheet || "Ficha principal";
    grouped.set(key, [...(grouped.get(key) || []), item]);
  });
  return Array.from(grouped.entries());
}

function buildDraftReviewHref(item: DeclarationDraftItem) {
  const params = new URLSearchParams();
  const documentLabel =
    item.source_upload_filename || item.target_sheet || "Documento da declaracao";
  const reviewLabel = item.target_field
    ? `Revisar ${item.target_field}`
    : `Revisar ${item.label}`;
  const prompt = `Quero continuar a revisao da minha declaracao focando em ${reviewLabel}. O documento em foco e ${documentLabel}. Comece sua resposta dizendo que vai me orientar nesse ponto especifico e, em seguida, me diga exatamente o que preciso confirmar agora.`;

  params.set("prompt", prompt);
  params.set("reviewLabel", reviewLabel);
  params.set("documentLabel", documentLabel);
  if (item.source_upload_id) {
    params.set("uploadId", item.source_upload_id);
  }

  return `/chat?${params.toString()}`;
}

export default function DeclarationDraftPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const pageClassName = isDark
    ? "min-h-screen bg-[#111827] text-slate-100"
    : "min-h-screen bg-[#f5f5f7] text-slate-900";

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [draft, setDraft] = useState<DeclarationDraft | null>(null);
  const [exportPackage, setExportPackage] =
    useState<DeclarationDraftExportPackage | null>(null);
  const [decCandidate, setDecCandidate] =
    useState<DeclarationDraftDECCandidate | null>(null);
  const [decPreview, setDecPreview] = useState<DeclarationDraftDECPreview | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [updatingSheetLabel, setUpdatingSheetLabel] = useState<string | null>(null);
  const [updatingFinalReview, setUpdatingFinalReview] = useState(false);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setLoadingDraft(false);
      return;
    }

    let active = true;

    async function loadDraft() {
      setLoadingDraft(true);
      setError(null);
      try {
        const response = await getCurrentDeclarationDraft();
        if (!active) return;
        setDraft(response);
        const exportPackage = await getDeclarationExportPackage(response.tax_year);
        if (!active) return;
        setExportPackage(exportPackage);
        const nextDecCandidate = await getDeclarationDECCandidate(response.tax_year);
        if (!active) return;
        setDecCandidate(nextDecCandidate);
        const nextDecPreview = await getDeclarationDECPreview(response.tax_year);
        if (!active) return;
        setDecPreview(nextDecPreview);
      } catch (loadError) {
        if (!active) return;
        setError(getFriendlyErrorMessage(loadError));
      } finally {
        if (active) setLoadingDraft(false);
      }
    }

    void loadDraft();
    return () => {
      active = false;
    };
  }, [authLoading, authUser]);

  async function handleRebuildDraft() {
    try {
      setRebuilding(true);
      setError(null);
      const response = await rebuildCurrentDeclarationDraft();
      setDraft(response);
      const exportPackage = await getDeclarationExportPackage(response.tax_year);
      setExportPackage(exportPackage);
      const nextDecCandidate = await getDeclarationDECCandidate(response.tax_year);
      setDecCandidate(nextDecCandidate);
      const nextDecPreview = await getDeclarationDECPreview(response.tax_year);
      setDecPreview(nextDecPreview);
    } catch (rebuildError) {
      setError(getFriendlyErrorMessage(rebuildError));
    } finally {
      setRebuilding(false);
    }
  }

  async function handleUpdateItemReview(
    itemId: string,
    userReviewStatus: "confirmed" | "needs_review" | null
  ) {
    try {
      setUpdatingItemId(itemId);
      const updatedItem = await updateDeclarationDraftItemReview(itemId, {
        user_review_status: userReviewStatus,
      });
      setDraft((current) => {
        if (!current) return current;
        const nextItems = current.items.map((item) =>
          item.id === itemId ? { ...item, ...updatedItem } : item
        );
        const confirmedItemCount = nextItems.filter(
          (item) => item.user_review_status === "confirmed"
        ).length;
        const userReviewItemCount = nextItems.filter(
          (item) => item.user_review_status === "confirmed" || item.user_review_status === "needs_review"
        ).length;
        return {
          ...current,
          items: nextItems,
          summary: {
            ...current.summary,
            confirmed_item_count: confirmedItemCount,
            user_review_item_count: userReviewItemCount,
          },
        };
      });
    } catch (updateError) {
      setError(getFriendlyErrorMessage(updateError));
    } finally {
      setUpdatingItemId(null);
    }
  }

  async function handleUpdateSheetReview(
    sheetLabel: string,
    userReviewStatus: "reviewed" | "needs_attention" | null
  ) {
    try {
      setUpdatingSheetLabel(sheetLabel);
      const updatedSheet = await updateDeclarationDraftSheetReview({
        sheet_label: sheetLabel,
        user_review_status: userReviewStatus,
      });
      setDraft((current) => {
        if (!current) return current;
        const nextSheetReviews = current.sheet_reviews.map((sheetReview) =>
          sheetReview.sheet_label === sheetLabel
            ? { ...sheetReview, ...updatedSheet }
            : sheetReview
        );
        return {
          ...current,
          sheet_reviews: nextSheetReviews,
          summary: {
            ...current.summary,
            reviewed_sheet_count: nextSheetReviews.filter(
              (sheetReview) => sheetReview.user_review_status === "reviewed"
            ).length,
          },
        };
      });
    } catch (updateError) {
      setError(getFriendlyErrorMessage(updateError));
    } finally {
      setUpdatingSheetLabel(null);
    }
  }

  async function handleUpdateFinalReview(
    userFilingStatus: "ready_for_filing" | "needs_review" | null
  ) {
    if (!draft) return;
    try {
      setUpdatingFinalReview(true);
      const updatedFinalReview = await updateDeclarationDraftFinalReview(
        { user_filing_status: userFilingStatus },
        draft.tax_year
      );
      setDraft((current) => {
        if (!current) return current;
        return {
          ...current,
          final_review: updatedFinalReview,
          final_checklist: {
            ...current.final_checklist,
            overall_status:
              userFilingStatus === "ready_for_filing"
                ? "ready"
                : userFilingStatus === "needs_review"
                  ? "review"
                  : current.final_checklist.overall_status,
            next_step:
              userFilingStatus === "ready_for_filing"
                ? "Declaracao marcada por voce como pronta para envio."
                : userFilingStatus === "needs_review"
                  ? "Declaracao reaberta para revisao."
                  : current.final_checklist.next_step,
          },
          share_summary: {
            ...current.share_summary,
            status_line:
              userFilingStatus === "ready_for_filing"
                ? `Rascunho da declaracao IRPF ${current.tax_year} marcado como pronto para envio.`
                : current.share_summary.status_line,
          },
        };
      });
    } catch (updateError) {
      setError(getFriendlyErrorMessage(updateError));
    } finally {
      setUpdatingFinalReview(false);
    }
  }

  async function handleCopySummary() {
    if (!draft) return;
    const summaryText = buildShareableSummaryText(draft);
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyNotice("Resumo copiado.");
      window.setTimeout(() => setCopyNotice(null), 2200);
    } catch {
      setError("Nao foi possivel copiar o resumo agora.");
    }
  }

  function handlePrintSummary() {
    window.print();
  }

  const groupedItems = useMemo(
    () => groupItemsBySheet(draft?.items || []),
    [draft?.items]
  );
  const readyItems = useMemo(
    () => (draft?.items || []).filter((item) => item.status === "ready").slice(0, 5),
    [draft?.items]
  );
  const reviewItems = useMemo(
    () =>
      (draft?.items || [])
        .filter((item) => item.status === "review" || item.status === "pending")
        .slice(0, 5),
    [draft?.items]
  );
  const sheetReviewMap = useMemo(
    () =>
      new Map(
        (draft?.sheet_reviews || []).map((sheetReview) => [
          sheetReview.sheet_label,
          sheetReview,
        ])
      ),
    [draft?.sheet_reviews]
  );

  if (authLoading) {
    return (
      <main className={pageClassName}>
        <section className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
          <SectionCard title="Minha declaracao" isDark={isDark}>
            <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
              Carregando seu rascunho...
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
          <SectionCard title="Minha declaracao" isDark={isDark}>
            <p className={isDark ? "text-sm text-slate-300" : "text-sm text-slate-600"}>
              Entre na sua conta para acompanhar o rascunho da sua declaracao com base nos documentos enviados.
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

  return (
    <AppShell activeSection="declaration" user={authUser} taxYear={draft?.tax_year} maxWidth="max-w-[1500px]">
      <section className="flex w-full flex-col gap-4">
        <header
          className={`rounded-[1.5rem] border px-6 py-5 ${
            isDark ? "border-white/10 bg-[#0f172a]" : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                className={`text-[1.7rem] font-semibold tracking-tight lg:text-[2rem] ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Minha declaracao
              </h1>
              <p
                className={`mt-2 max-w-3xl text-sm leading-6 ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Este rascunho usa os documentos que voce ja enviou para organizar o que ja pode entrar na declaracao e o que ainda pede revisao.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopySummary}
                disabled={!draft}
                className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isDark
                    ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                Copiar resumo
              </button>
              <button
                type="button"
                onClick={handlePrintSummary}
                disabled={!draft}
                className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isDark
                    ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                Imprimir
              </button>
              <a
                href={draft ? getDeclarationExportDownloadUrl(draft.tax_year) : "#"}
                className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 ${
                  isDark
                    ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                } ${!draft ? "pointer-events-none opacity-60" : ""}`}
              >
                Baixar pacote IRPF
              </a>
              <button
                type="button"
                onClick={handleRebuildDraft}
                disabled={rebuilding}
                className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isDark
                    ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-white"
                }`}
              >
                {rebuilding ? "Regerando..." : "Regerar a partir dos documentos"}
              </button>
              <Link
                href="/documentos"
                className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 ${
                  isDark
                    ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                Ver meus documentos
              </Link>
            </div>
          </div>
          {exportPackage?.adapter_message ? (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                isDark
                  ? "border-sky-300/15 bg-sky-400/10 text-sky-50"
                  : "border-sky-200 bg-sky-50 text-sky-700"
              }`}
            >
              <strong>Exportacao IRPF:</strong> {exportPackage.adapter_message}
            </div>
          ) : null}
          {copyNotice ? (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                isDark
                  ? "border-emerald-300/15 bg-emerald-400/10 text-emerald-50"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {copyNotice}
            </div>
          ) : null}
        </header>

        {error ? (
          <SectionCard title="Aviso" isDark={isDark}>
            <p className={isDark ? "text-sm text-rose-200" : "text-sm text-rose-700"}>
              {error}
            </p>
          </SectionCard>
        ) : null}

        {loadingDraft ? (
          <SectionCard title="Minha declaracao" isDark={isDark}>
            <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
              Montando o rascunho da sua declaracao...
            </p>
          </SectionCard>
        ) : draft ? (
          <>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <SectionCard title="Resumo da declaracao" isDark={isDark}>
                <div className={`space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  <div><strong>Ano:</strong> {draft.tax_year}</div>
                  <div><strong>Estado:</strong> {getDraftStatusLabel(draft.status)}</div>
                  <div><strong>Documentos usados:</strong> {draft.summary.document_count}</div>
                  <div><strong>Fichas em foco:</strong> {draft.summary.sheet_count}</div>
                  <div><strong>Fichas revisadas:</strong> {draft.summary.reviewed_sheet_count}</div>
                  <div><strong>Campos com chave canonica:</strong> {draft.summary.canonical_mapped_item_count}</div>
                </div>
                {Object.entries(draft.summary.canonical_domain_counts || {}).length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(draft.summary.canonical_domain_counts).map(([domain, count]) => (
                      <span
                        key={`domain-${domain}`}
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                          isDark
                            ? "border-white/10 bg-white/[0.05] text-slate-200"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {getCanonicalDomainLabel(domain)}: {count}
                      </span>
                    ))}
                  </div>
                ) : null}
              </SectionCard>

              <SectionCard title="O que ja esta pronto" isDark={isDark}>
                <div className={`text-3xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {draft.summary.ready_item_count}
                </div>
                <p className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Campos com match forte e boa chance de ja estarem prontos para sua revisao final.
                </p>
                <div className={`mt-3 text-xs ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
                  {draft.summary.confirmed_item_count} item(ns) ja confirmado(s) por voce.
                </div>
              </SectionCard>

              <SectionCard title="O que pede revisao" isDark={isDark}>
                <div className={`text-3xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {draft.summary.review_item_count + draft.summary.pending_item_count}
                </div>
                <p className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Itens aproximados ou ainda pendentes que merecem uma olhada antes de considerar a declaracao pronta.
                </p>
              </SectionCard>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <SectionCard title="Prontos para revisar" isDark={isDark}>
                {readyItems.length ? (
                  <div className="space-y-3">
                    {readyItems.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl border px-4 py-3 ${
                          isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                            {item.label}: {item.value}
                          </div>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getItemStatusTone(
                              item.status,
                              isDark
                            )}`}
                          >
                            {getItemStatusLabel(item.status)}
                          </span>
                        </div>
                        <div className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                          <strong>Ficha:</strong> {item.target_sheet}
                        </div>
                        {item.target_field ? (
                          <div className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                            <strong>Campo:</strong> {item.target_field}
                          </div>
                        ) : null}
                        {getUserReviewLabel(item.user_review_status) ? (
                          <div
                            className={`mt-2 text-xs ${
                              isDark ? "text-emerald-200" : "text-emerald-700"
                            }`}
                          >
                            {getUserReviewLabel(item.user_review_status)}
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemReview(item.id, "confirmed")}
                            disabled={updatingItemId === item.id}
                            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                              isDark
                                ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-white"
                            }`}
                          >
                            Confirmar item
                          </button>
                          <Link
                            href={buildDraftReviewHref(item)}
                            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
                              isDark
                                ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                                : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            Revisar no chat
                          </Link>
                          {item.source_upload_id ? (
                            <Link
                              href={`/documentos?uploadId=${item.source_upload_id}`}
                              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
                                isDark
                                  ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              Ver documento de origem
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                    Ainda nao encontrei itens com match forte suficiente para marcar como prontos.
                  </p>
                )}
              </SectionCard>

              <SectionCard title="Prioridade de revisao" isDark={isDark}>
                {reviewItems.length ? (
                  <div className="space-y-3">
                    {reviewItems.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl border px-4 py-3 ${
                          isDark
                            ? "border-amber-300/20 bg-amber-500/10"
                            : item.status === "pending"
                              ? "border-rose-200 bg-rose-50"
                              : "border-amber-200 bg-amber-50"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div
                            className={`text-sm font-semibold ${
                              isDark
                                ? "text-amber-50"
                                : item.status === "pending"
                                  ? "text-rose-700"
                                  : "text-amber-800"
                            }`}
                          >
                            {item.label}
                          </div>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getItemStatusTone(
                              item.status,
                              isDark
                            )}`}
                          >
                            {getItemStatusLabel(item.status)}
                          </span>
                        </div>
                        <div
                          className={`mt-2 text-sm ${
                            isDark
                              ? "text-amber-50/90"
                              : item.status === "pending"
                                ? "text-rose-700"
                                : "text-amber-700"
                          }`}
                        >
                          {item.action_description}
                        </div>
                        {getUserReviewLabel(item.user_review_status) ? (
                          <div
                            className={`mt-2 text-xs ${
                              isDark
                                ? item.user_review_status === "confirmed"
                                  ? "text-emerald-200"
                                  : "text-amber-100"
                                : item.user_review_status === "confirmed"
                                  ? "text-emerald-700"
                                  : "text-amber-700"
                            }`}
                          >
                            {getUserReviewLabel(item.user_review_status)}
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemReview(item.id, "needs_review")}
                            disabled={updatingItemId === item.id}
                            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                              isDark
                                ? "border-amber-200/20 bg-white/[0.06] text-amber-50 hover:bg-white/[0.1]"
                                : "border-amber-300 bg-white text-amber-700 hover:bg-amber-100"
                            }`}
                          >
                            Marcar para revisar
                          </button>
                          <Link
                            href={buildDraftReviewHref(item)}
                            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
                              isDark
                                ? "border-amber-200/20 bg-white/[0.06] text-amber-50 hover:bg-white/[0.1]"
                                : "border-amber-300 bg-white text-amber-700 hover:bg-amber-100"
                            }`}
                          >
                            Continuar revisao no chat
                          </Link>
                          {item.source_upload_id ? (
                            <Link
                              href={`/documentos?uploadId=${item.source_upload_id}`}
                              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
                                isDark
                                  ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              Ver documento de origem
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                    Nada pede revisao agora. Seu rascunho esta bem encaminhado para a etapa final.
                  </p>
                )}
              </SectionCard>
            </div>

            <SectionCard title="Checklist final da declaracao" isDark={isDark}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {getFinalChecklistStatusLabel(draft.final_checklist.overall_status)}
                </div>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    draft.final_checklist.overall_status === "ready"
                      ? getSheetReviewTone("reviewed", isDark)
                      : draft.final_checklist.overall_status === "review"
                        ? getSheetReviewTone("needs_attention", isDark)
                        : getSheetReviewTone(null, isDark)
                  }`}
                >
                  {draft.summary.reviewed_sheet_count} ficha(s) revisada(s)
                </span>
              </div>

              {draft.final_checklist.completed_steps.length ? (
                <div className="mt-4">
                  <div
                    className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                      isDark ? "text-emerald-200" : "text-emerald-700"
                    }`}
                  >
                    O que ja foi fechado
                  </div>
                  <ul className={`mt-2 space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {draft.final_checklist.completed_steps.map((step) => (
                      <li key={step}>- {step}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {draft.final_checklist.attention_steps.length ? (
                <div className="mt-4">
                  <div
                    className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                      isDark ? "text-amber-100" : "text-amber-700"
                    }`}
                  >
                    O que ainda exige atencao
                  </div>
                  <ul className={`mt-2 space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {draft.final_checklist.attention_steps.map((step) => (
                      <li key={step}>- {step}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {draft.final_checklist.next_step ? (
                <div
                  className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                    isDark
                      ? "border-emerald-300/15 bg-emerald-400/10 text-emerald-50"
                      : "border-emerald-200 bg-white text-emerald-700"
                  }`}
                >
                  <strong>Proximo passo sugerido:</strong> {draft.final_checklist.next_step}
                </div>
              ) : null}
            </SectionCard>

            <SectionCard title="Fechamento da declaracao" isDark={isDark}>
              <div className="space-y-3">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getFinalReviewTone(
                    draft.final_review.user_filing_status,
                    isDark
                  )}`}
                >
                  {getFinalReviewLabel(draft.final_review.user_filing_status)}
                </span>
                <p className={`text-sm leading-7 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Use este fechamento quando voce quiser registrar que o rascunho ja pode seguir para envio ou quando preferir manter a declaracao aberta para revisao.
                </p>
                {draft.final_review.reviewed_at ? (
                  <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Ultima decisao registrada em{" "}
                    {new Date(draft.final_review.reviewed_at).toLocaleString("pt-BR")}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleUpdateFinalReview("ready_for_filing")}
                    disabled={updatingFinalReview}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      isDark
                        ? "bg-emerald-400 text-slate-900 hover:bg-emerald-300 disabled:bg-emerald-300/40"
                        : "bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-emerald-300"
                    }`}
                  >
                    {updatingFinalReview ? "Salvando..." : "Marcar como pronta para envio"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleUpdateFinalReview("needs_review")}
                    disabled={updatingFinalReview}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      isDark
                        ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] disabled:opacity-60"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    }`}
                  >
                    Manter em revisao
                  </button>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Pre-envio da declaracao" isDark={isDark}>
              <div className="space-y-3">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    draft.pre_submit.ready
                      ? getSheetReviewTone("reviewed", isDark)
                      : draft.pre_submit.status === "missing_data"
                        ? getSheetReviewTone(null, isDark)
                        : getSheetReviewTone("needs_attention", isDark)
                  }`}
                >
                  {draft.pre_submit.ready
                    ? "Pronto para pre-envio"
                    : draft.pre_submit.status === "missing_data"
                      ? "Ainda sem base suficiente"
                      : "Bloqueado para pre-envio"}
                </span>

                {draft.pre_submit.completed_checks.length ? (
                  <div>
                    <div
                      className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                        isDark ? "text-emerald-200" : "text-emerald-700"
                      }`}
                    >
                      Checagens concluidas
                    </div>
                    <ul className={`mt-2 space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                      {draft.pre_submit.completed_checks.map((step) => (
                        <li key={step}>- {step}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {draft.pre_submit.blockers.length ? (
                  <div>
                    <div
                      className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                        isDark ? "text-amber-100" : "text-amber-700"
                      }`}
                    >
                      Bloqueios atuais
                    </div>
                    <ul className={`mt-2 space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                      {draft.pre_submit.blockers.map((blocker) => (
                        <li key={blocker}>- {blocker}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {draft.pre_submit.next_step ? (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      isDark
                        ? "border-emerald-300/15 bg-emerald-400/10 text-emerald-50"
                        : "border-emerald-200 bg-white text-emerald-700"
                    }`}
                  >
                    <strong>Proximo passo:</strong> {draft.pre_submit.next_step}
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Versao final consolidada" isDark={isDark}>
              <div className="space-y-4">
                <div className={`text-sm leading-7 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  <div className={`text-base font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {draft.final_consolidation.exercise_label}
                  </div>
                  <p className="mt-2">{draft.final_consolidation.readiness_line}</p>
                </div>

                {draft.final_consolidation.sections.length ? (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    {draft.final_consolidation.sections.map((section) => (
                      <div
                        key={section.title}
                        className={`rounded-2xl border px-4 py-4 ${
                          isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div
                          className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                            isDark ? "text-emerald-200" : "text-emerald-700"
                          }`}
                        >
                          {section.title}
                        </div>
                        <ul className={`mt-3 space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                          {section.items.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : null}

                {draft.final_consolidation.alerts.length ? (
                  <div
                    className={`rounded-2xl border px-4 py-4 ${
                      isDark ? "border-amber-300/20 bg-amber-500/10" : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div
                      className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                        isDark ? "text-amber-100" : "text-amber-700"
                      }`}
                    >
                      Alertas finais
                    </div>
                    <ul className={`mt-3 space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                      {draft.final_consolidation.alerts.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {draft.final_consolidation.next_step ? (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      isDark
                        ? "border-emerald-300/15 bg-emerald-400/10 text-emerald-50"
                        : "border-emerald-200 bg-white text-emerald-700"
                    }`}
                  >
                    <strong>Proximo passo consolidado:</strong> {draft.final_consolidation.next_step}
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Relatorio final do exercicio" isDark={isDark}>
              <div className="space-y-4">
                <div className={`text-sm leading-7 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  <div className={`text-base font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {draft.final_report.title}
                  </div>
                  <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Gerado em {new Date(draft.final_report.generated_at).toLocaleString("pt-BR")}
                  </div>
                </div>

                {draft.final_report.narrative.length ? (
                  <div className="space-y-2">
                    {draft.final_report.narrative.map((line) => (
                      <p
                        key={line}
                        className={`text-sm leading-7 ${isDark ? "text-slate-200" : "text-slate-700"}`}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <a
                    href={getDeclarationFinalReportDownloadUrl(draft.tax_year)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      isDark
                        ? "bg-emerald-400 text-slate-900 hover:bg-emerald-300"
                        : "bg-emerald-600 text-white hover:bg-emerald-500"
                    }`}
                  >
                    Baixar relatorio final
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleCopySummary()}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      isDark
                        ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Copiar resumo consolidado
                  </button>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Resumo exportavel" isDark={isDark}>
              <div className={`text-sm leading-7 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                <div className={`text-base font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {draft.share_summary.headline}
                </div>
                <p className="mt-2">{draft.share_summary.status_line}</p>
                {draft.share_summary.next_step ? (
                  <p className="mt-3">
                    <strong>Proximo passo:</strong> {draft.share_summary.next_step}
                  </p>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Adapters de importacao IRPF" isDark={isDark}>
              {exportPackage?.available_adapters?.length ? (
                <div className="space-y-3">
                  {exportPackage.available_adapters.map((adapter) => (
                    <div
                      key={adapter.adapter_key}
                      className={`rounded-2xl border px-4 py-3 ${
                        isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                          {adapter.label}
                        </div>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                            adapter.readiness === "ready"
                              ? getSheetReviewTone("reviewed", isDark)
                              : getSheetReviewTone("needs_attention", isDark)
                          }`}
                        >
                          {adapter.readiness === "ready" ? "Pronto" : "Pendente"}
                        </span>
                      </div>
                      <div className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        <strong>Destino:</strong> {adapter.target_program} ({adapter.target_format})
                      </div>
                      <div className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {adapter.message}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                  Os adapters de exportacao aparecerao aqui conforme o pacote da declaracao for sendo preparado.
                </p>
              )}
            </SectionCard>

            <SectionCard title="Pacote intermediario pre-DEC" isDark={isDark}>
              {decCandidate ? (
                <div className="space-y-4">
                  <div className={`text-sm leading-7 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    <div className={`text-base font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                      {decCandidate.label}
                    </div>
                    <p className="mt-2">
                      {decCandidate.mapped_field_count} campo(s) mapeado(s) e{" "}
                      {decCandidate.unresolved_field_count} pendencia(s) antes do DEC final.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <a
                      href={getDeclarationDECCandidateDownloadUrl(draft.tax_year)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        isDark
                          ? "bg-emerald-400 text-slate-900 hover:bg-emerald-300"
                          : "bg-emerald-600 text-white hover:bg-emerald-500"
                      }`}
                    >
                      Baixar pacote pre-DEC
                    </a>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div
                      className={`rounded-2xl border px-4 py-4 ${
                        isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
                        Resumo por dominio
                      </div>
                      <ul className={`mt-3 space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                        {Object.entries(decCandidate.domain_summary).map(([domain, count]) => (
                          <li key={domain}>
                            - {getCanonicalDomainLabel(domain)}: {count} campo(s)
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div
                      className={`rounded-2xl border px-4 py-4 ${
                        isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-amber-100" : "text-amber-700"}`}>
                        Pendencias para o DEC final
                      </div>
                      <ul className={`mt-3 space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                        {decCandidate.layout_blockers.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                        {decCandidate.unresolved_fields.slice(0, 6).map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {decCandidate.serialized_sheets.length ? (
                    <div
                      className={`rounded-2xl border px-4 py-4 ${
                        isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div
                        className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                          isDark ? "text-emerald-200" : "text-emerald-700"
                        }`}
                      >
                        Serializacao canonica por ficha
                      </div>
                      <div className="mt-3 space-y-4">
                        {decCandidate.serialized_sheets.map((sheet) => (
                          <div key={sheet.sheet_label} className="rounded-2xl border border-transparent">
                            <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                              {sheet.sheet_label}
                            </div>
                              <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                {sheet.sheet_code ? `${sheet.sheet_code} • ` : ""}
                                ordem {sheet.sheet_order ?? "-"} • {sheet.field_count} campo(s) • {sheet.required_field_count} obrigatorio(s) • {sheet.missing_required_count} obrigatorio(s) pendente(s) • {sheet.review_ready_count} pronto(s) • {sheet.review_pending_count} em revisao
                              </div>
                              <div className="mt-3 space-y-3">
                                {sheet.canonical_field_entries.map((field) => (
                                  <div
                                  key={`${sheet.sheet_label}-${field.canonical_key}-${field.source_label}`}
                                  className={`rounded-2xl border px-3 py-3 ${
                                    isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white"
                                  }`}
                                  >
                                    <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                                      {field.canonical_key}: {field.value}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <span
                                        className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-medium ${
                                          field.required
                                            ? getSheetReviewTone("needs_attention", isDark)
                                            : getSheetReviewTone(null, isDark)
                                        }`}
                                      >
                                        {field.required ? "Obrigatorio" : "Opcional"}
                                      </span>
                                    </div>
                                    <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                      {field.target_field ? `Campo alvo: ${field.target_field}` : "Sem campo alvo especifico"}
                                    </div>
                                    <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                      {field.field_code ? `Codigo: ${field.field_code}` : "Sem codigo"} • ordem {field.field_order ?? "-"}
                                  </div>
                                  <div className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                    Origem: {field.source_label}
                                    {field.source_upload_filename ? ` • ${field.source_upload_filename}` : ""}
                                  </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <span
                                        className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-medium ${
                                          field.confidence === "strong"
                                            ? getSheetReviewTone("reviewed", isDark)
                                          : getSheetReviewTone("needs_attention", isDark)
                                      }`}
                                    >
                                      Confianca: {field.confidence}
                                    </span>
                                    {field.user_review_status ? (
                                      <span
                                        className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-medium ${
                                          field.user_review_status === "confirmed"
                                            ? getSheetReviewTone("reviewed", isDark)
                                            : getSheetReviewTone("needs_attention", isDark)
                                        }`}
                                      >
                                        Revisao: {field.user_review_status === "confirmed" ? "confirmado" : "revisar"}
                                        </span>
                                      ) : null}
                                    </div>
                                    {field.validation_rules.length ? (
                                      <div className={`mt-2 text-xs leading-5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        Regras: {field.validation_rules.join(" • ")}
                                      </div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                  O pacote intermediario pre-DEC aparecera aqui assim que o rascunho atual estiver disponivel.
                </p>
              )}
            </SectionCard>

            <SectionCard title="Adapter DEC em preparacao" isDark={isDark}>
              {decPreview ? (
                <div className="space-y-4">
                  <div className={`text-sm leading-7 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    <div className={`text-base font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                      {decPreview.label}
                    </div>
                    <p className="mt-2">{decPreview.message}</p>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div
                      className={`rounded-2xl border px-4 py-4 ${
                        isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
                        Campos ja mapeados
                      </div>
                      {decPreview.mapped_fields.length ? (
                        <div className="mt-3 space-y-3">
                          {decPreview.mapped_fields.slice(0, 8).map((field) => (
                            <div key={`${field.canonical_key}-${field.source_label}`}>
                              <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                                {field.canonical_key}
                              </div>
                              {field.canonical_domain ? (
                                <div className={`text-xs ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
                                  {getCanonicalDomainLabel(field.canonical_domain)}
                                </div>
                              ) : null}
                              <div className={`text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                {field.source_label}: {field.source_value}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={`mt-3 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          Ainda nao ha campos mapeados para o preview DEC.
                        </p>
                      )}
                    </div>

                    <div
                      className={`rounded-2xl border px-4 py-4 ${
                        isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-amber-100" : "text-amber-700"}`}>
                        Bloqueios e pendencias
                      </div>
                      <ul className={`mt-3 space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                        {decPreview.layout_blockers.map((blocker) => (
                          <li key={blocker}>- {blocker}</li>
                        ))}
                        {decPreview.unresolved_fields.slice(0, 6).map((field) => (
                          <li key={field}>- {field}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                  O preview do adapter DEC aparecera aqui assim que o rascunho atual estiver disponivel.
                </p>
              )}
            </SectionCard>

            <SectionCard title="Checklist final por ficha" isDark={isDark}>
              {draft.sheet_checklists.length ? (
                <div className="space-y-4">
                  {draft.sheet_checklists.map((checklist) => (
                    <div
                      key={`checklist-${checklist.sheet_label}`}
                      className={`rounded-[1.2rem] border px-4 py-4 ${
                        isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                          {checklist.sheet_label}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getSheetReviewTone(
                              checklist.review_status,
                              isDark
                            )}`}
                          >
                            {getSheetReviewLabel(checklist.review_status)}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                              checklist.checklist_status === "ready"
                                ? getSheetReviewTone("reviewed", isDark)
                                : checklist.checklist_status === "review"
                                  ? getSheetReviewTone("needs_attention", isDark)
                                  : getSheetReviewTone(null, isDark)
                            }`}
                          >
                            {getChecklistStatusLabel(checklist.checklist_status)}
                          </span>
                        </div>
                      </div>

                      <div className={`mt-3 flex flex-wrap gap-2 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        <span>{checklist.ready_item_count} item(ns) prontos</span>
                        <span>{checklist.confirmed_item_count} confirmado(s)</span>
                        <span>{checklist.review_item_count} em revisao</span>
                        <span>{checklist.pending_item_count} pendente(s)</span>
                      </div>

                      {checklist.completed_steps.length ? (
                        <div className="mt-4">
                          <div
                            className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                              isDark ? "text-emerald-200" : "text-emerald-700"
                            }`}
                          >
                            O que ja esta concluido
                          </div>
                          <ul className={`mt-2 space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                            {checklist.completed_steps.map((step) => (
                              <li key={step}>- {step}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {checklist.attention_steps.length ? (
                        <div className="mt-4">
                          <div
                            className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                              isDark ? "text-amber-100" : "text-amber-700"
                            }`}
                          >
                            O que ainda merece atencao
                          </div>
                          <ul className={`mt-2 space-y-2 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                            {checklist.attention_steps.map((step) => (
                              <li key={step}>- {step}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {checklist.next_step ? (
                        <div
                          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                            isDark
                              ? "border-emerald-300/15 bg-emerald-400/10 text-emerald-50"
                              : "border-emerald-200 bg-white text-emerald-700"
                          }`}
                        >
                          <strong>Proximo passo:</strong> {checklist.next_step}
                        </div>
                      ) : null}

                      <div className="mt-4">
                        <Link
                          href={buildSheetReviewHref(checklist.sheet_label)}
                          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
                            isDark
                              ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                              : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          Continuar esta ficha no chat
                        </Link>
                      </div>
                      {Object.entries(decPreview?.domain_summary || {}).length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {Object.entries(decPreview?.domain_summary || {}).map(([domain, count]) => (
                            <span
                              key={`dec-domain-${domain}`}
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                                isDark
                                  ? "border-white/10 bg-white/[0.05] text-slate-200"
                                  : "border-slate-200 bg-white text-slate-700"
                              }`}
                            >
                              {getCanonicalDomainLabel(domain)}: {count}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                  Assim que houver fichas suficientes no rascunho, eu tambem organizo um checklist final por ficha.
                </p>
              )}
            </SectionCard>

            <SectionCard title="Fichas do rascunho" isDark={isDark}>
              {groupedItems.length ? (
                <div className="space-y-4">
                  {groupedItems.map(([sheet, items]) => (
                    <div
                      key={sheet}
                      className={`rounded-[1.2rem] border px-4 py-4 ${
                        isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                          {sheet}
                        </div>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getSheetReviewTone(
                            sheetReviewMap.get(sheet)?.user_review_status,
                            isDark
                          )}`}
                        >
                          {getSheetReviewLabel(sheetReviewMap.get(sheet)?.user_review_status)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateSheetReview(sheet, "reviewed")}
                          disabled={updatingSheetLabel === sheet}
                          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                            isDark
                              ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-white"
                          }`}
                        >
                          Marcar ficha como revisada
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateSheetReview(sheet, "needs_attention")}
                          disabled={updatingSheetLabel === sheet}
                          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                            isDark
                              ? "border-amber-200/20 bg-white/[0.06] text-amber-50 hover:bg-white/[0.1]"
                              : "border-amber-300 bg-white text-amber-700 hover:bg-amber-100"
                          }`}
                        >
                          Reabrir ficha para revisao
                        </button>
                      </div>
                      <div className="mt-3 space-y-3">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={`rounded-2xl border px-4 py-3 ${
                              isDark ? "border-white/10 bg-slate-950/30" : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                                {item.label}: {item.value}
                              </div>
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getItemStatusTone(
                                  item.status,
                                  isDark
                                )}`}
                              >
                                {getItemStatusLabel(item.status)}
                              </span>
                            </div>
                            {item.target_field ? (
                              <div className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                <strong>Campo principal:</strong> {item.target_field}
                              </div>
                            ) : null}
                            <div className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                              <strong>Como usar:</strong> {item.action_description}
                            </div>
                            {getUserReviewLabel(item.user_review_status) ? (
                              <div
                                className={`mt-2 text-xs ${
                                  isDark
                                    ? item.user_review_status === "confirmed"
                                      ? "text-emerald-200"
                                      : "text-amber-100"
                                    : item.user_review_status === "confirmed"
                                      ? "text-emerald-700"
                                      : "text-amber-700"
                                }`}
                              >
                                {getUserReviewLabel(item.user_review_status)}
                              </div>
                            ) : null}
                            {item.entry_steps.length ? (
                              <div className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                {item.entry_steps.join(" ")}
                              </div>
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateItemReview(
                                    item.id,
                                    item.status === "ready" ? "confirmed" : "needs_review"
                                  )
                                }
                                disabled={updatingItemId === item.id}
                                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                                  isDark
                                    ? item.status === "ready"
                                      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                                      : "border-amber-200/20 bg-white/[0.06] text-amber-50 hover:bg-white/[0.1]"
                                    : item.status === "ready"
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-white"
                                      : "border-amber-300 bg-white text-amber-700 hover:bg-amber-100"
                                }`}
                              >
                                {item.status === "ready" ? "Confirmar item" : "Marcar para revisar"}
                              </button>
                              <Link
                                href={buildDraftReviewHref(item)}
                                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
                                  isDark
                                    ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-white"
                                }`}
                              >
                                Revisar no chat
                              </Link>
                              {item.source_upload_id ? (
                                <Link
                                  href={`/documentos?uploadId=${item.source_upload_id}`}
                                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
                                    isDark
                                      ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                                  }`}
                                >
                                  Ver documento de origem
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                  Ainda nao encontrei acoes suficientes para montar um rascunho. Enviar mais documentos tende a melhorar bastante essa etapa.
                </p>
              )}
            </SectionCard>
          </>
        ) : (
          <SectionCard title="Minha declaracao" isDark={isDark}>
            <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
              Ainda nao foi possivel montar um rascunho para esta conta.
            </p>
          </SectionCard>
        )}
      </section>
    </AppShell>
  );
}
