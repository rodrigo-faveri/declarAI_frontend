import { describe, expect, it } from "vitest";

import type { DeclarationDraft } from "@/types/chat";
import { buildProgress, getNextAction } from "./AuthenticatedDashboard";

function createDraft(
  overrides: {
    sheetCount?: number;
    reviewedSheetCount?: number;
    reviewItems?: number;
    pendingItems?: number;
    preSubmitReady?: boolean;
    filingReady?: boolean;
  } = {}
) {
  return {
    status: "in_progress",
    summary: {
      sheet_count: overrides.sheetCount ?? 0,
      reviewed_sheet_count: overrides.reviewedSheetCount ?? 0,
      review_item_count: overrides.reviewItems ?? 0,
      pending_item_count: overrides.pendingItems ?? 0,
    },
    final_review: {
      user_filing_status: overrides.filingReady ? "ready_for_filing" : null,
    },
    pre_submit: {
      ready: overrides.preSubmitReady ?? false,
      next_step: null,
    },
    final_checklist: {
      next_step: null,
    },
  } as DeclarationDraft;
}

describe("dashboard da declaração", () => {
  it("calcula o progresso somente a partir de etapas reais", () => {
    const draft = createDraft({
      sheetCount: 3,
      reviewedSheetCount: 3,
      preSubmitReady: true,
    });

    expect(buildProgress(draft, 4)).toMatchObject({
      completed: 5,
      percentage: 83,
    });
  });

  it("mantém apenas a etapa da conta para uma jornada vazia", () => {
    expect(buildProgress(null, 0)).toMatchObject({
      completed: 1,
      percentage: 17,
    });
  });

  it("orienta uma conta vazia para o primeiro documento", () => {
    expect(getNextAction(null, 0)).toMatchObject({
      title: "Envie seu primeiro documento",
      cta: "Enviar documento",
    });
  });

  it("prioriza a revisão quando existem itens pendentes", () => {
    const draft = createDraft({ reviewItems: 2, pendingItems: 1 });

    expect(getNextAction(draft, 2)).toMatchObject({
      title: "Revise 3 itens pendentes",
      href: "/declaracao",
    });
  });
});
