"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { toast } from "sonner";
import ChatComposer from "@/components/chat/ChatComposer";
import { LoadingMessage, MessageBubble } from "@/components/chat/MessageBubble";
import MobileDrawer from "@/components/chat/MobileDrawer";
import ProfileMenu from "@/components/chat/ProfileMenu";
import SidebarPanels from "@/components/chat/SidebarPanels";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  canAccessTechnicalUploads,
  canManageKnowledgeBase,
  canUploadDocumentsForUser,
} from "@/lib/access-control";
import {
  ApiError,
  devLogin,
  deleteConversation,
  getAuthStatus,
  getKnowledgeBaseSettings,
  getConversation,
  getLoginUrl,
  getUserProfile,
  listConversations,
  logout,
  sendMessage,
  submitWebSearchFeedback,
  uploadDocument,
  updateKnowledgeBaseSettings,
  updateUserProfile,
  updateConversationTitle,
} from "@/services/api";
import {
  AuthUser,
  ChatResponse,
  ConversationDetail,
  ConversationHistoryItem,
  ConversationSummary,
  HistoryCardDensity,
  ProfileDetails,
  ProfilePreferences,
  UploadedDocument,
  UiMessage,
  UserProfileResponse,
} from "@/types/chat";

const QUICK_PROMPTS = [
  "Como declarar FGTS no imposto de renda?",
  "Quero fazer uma triagem para saber se preciso declarar",
  "Como declarar financiamento imobiliario?",
  "Despesas medicas com reembolso podem ser deduzidas?",
];
const FEATURED_TOPIC_PROMPTS = [
  {
    label: "Aluguel",
    prompt: "Como declarar rendimentos de aluguel no imposto de renda?",
  },
  {
    label: "Restituicao",
    prompt: "Como funciona a restituicao do imposto de renda?",
  },
  {
    label: "MEI e autonomo",
    prompt: "Sou MEI ou autonomo: como isso entra no imposto de renda?",
  },
  {
    label: "Carnê-Leao",
    prompt: "Quando preciso usar o Carne-Leao no imposto de renda?",
  },
];
const TRIAGE_FIELD_LABELS: Record<string, string> = {
  income: "Renda",
  medical_expenses: "Despesas medicas",
  property: "Imovel",
  financing: "Financiamento",
  dependents: "Dependentes",
  investments: "Investimentos",
  previdencia: "Previdencia",
  fgts: "FGTS",
};

const TYPING_SPEED = 18;
const MAX_MESSAGE_LENGTH = 1000;
const DRAFT_STORAGE_PREFIX = "declaria:chat-draft:";
const RATE_LIMIT_STORAGE_KEY = "declaria:chat-rate-limit-until";
const PROFILE_PREFERENCES_STORAGE_KEY = "declaria:profile-preferences";
const PROFILE_DETAILS_STORAGE_KEY = "declaria:profile-details";
const DOCUMENT_KIND_CONFIRMATION_OPTIONS = [
  "Informe de rendimentos",
  "Informe bancario",
  "Corretora e investimentos",
  "Previdencia privada",
  "Outro comprovante",
];

const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {
  showHistoryBadges: true,
  showTriageInsights: true,
  historyCardDensity: "comfortable",
};

const DEFAULT_PROFILE_DETAILS: ProfileDetails = {
  firstName: "",
  lastName: "",
  phone: "",
  city: "",
  taxProfileNote: "",
  avatarDataUrl: "",
};

function mapProfileResponseToDetails(profile: UserProfileResponse): ProfileDetails {
  return {
    firstName: profile.first_name ?? "",
    lastName: profile.last_name ?? "",
    phone: profile.phone ?? "",
    city: profile.city ?? "",
    taxProfileNote: profile.tax_profile_note ?? "",
    avatarDataUrl: profile.avatar_data_url ?? "",
  };
}

function mapProfileResponseToPreferences(
  profile: UserProfileResponse
): ProfilePreferences {
  return {
    showHistoryBadges: profile.preferences?.show_history_badges ?? true,
    showTriageInsights: profile.preferences?.show_triage_insights ?? true,
    historyCardDensity:
      profile.preferences?.history_card_density ?? "comfortable",
  };
}

function buildProfileUpdatePayload(
  details: ProfileDetails,
  preferences: ProfilePreferences
) {
  return {
    first_name: details.firstName,
    last_name: details.lastName,
    phone: details.phone,
    city: details.city,
    tax_profile_note: details.taxProfileNote,
    avatar_data_url: details.avatarDataUrl,
    preferences: {
      show_history_badges: preferences.showHistoryBadges,
      show_triage_insights: preferences.showTriageInsights,
      history_card_density: preferences.historyCardDensity,
    },
  };
}

function mergeProfileNote(currentNote: string, suggestion: string) {
  const normalizedCurrent = currentNote.trim();
  const normalizedSuggestion = suggestion.trim();

  if (!normalizedSuggestion) {
    return normalizedCurrent;
  }

  if (
    normalizedCurrent &&
    normalizedCurrent.toLowerCase().includes(normalizedSuggestion.toLowerCase())
  ) {
    return normalizedCurrent;
  }

  if (!normalizedCurrent) {
    return normalizedSuggestion;
  }

  return `${normalizedCurrent}\n\n${normalizedSuggestion}`;
}

function extractProfileContextHighlights(profileDetails: ProfileDetails) {
  const items = [
    profileDetails.city,
    ...profileDetails.taxProfileNote
      .split(/\n|;/)
      .map((item) => item.trim())
      .filter(Boolean),
  ];

  return items.filter((item, index, array) => array.indexOf(item) === index).slice(0, 4);
}

function extractStructuredProfileSignals(profileDetails: ProfileDetails) {
  const searchableText = [
    profileDetails.city,
    profileDetails.taxProfileNote,
    profileDetails.firstName,
    profileDetails.lastName,
  ]
    .join(" ")
    .toLowerCase();

  const signalMatchers = [
    {
      label: "Dependentes",
      matches: ["dependente", "dependentes", "filho", "filha", "alimentando"],
    },
    {
      label: "Imovel",
      matches: ["imovel", "apartamento", "casa", "financiamento", "imobili"],
    },
    {
      label: "FGTS",
      matches: ["fgts"],
    },
    {
      label: "Previdencia",
      matches: ["previdencia", "pgbl", "vgbl"],
    },
    {
      label: "Investimentos",
      matches: ["investimento", "acoes", "acao", "renda fixa", "cripto", "fundos"],
    },
    {
      label: "Despesas medicas",
      matches: ["despesa medica", "medic", "plano de saude", "dentista", "psicologo"],
    },
    {
      label: "Renda PJ / autonomo",
      matches: ["pj", "autonomo", "mei", "pro labore", "livro caixa"],
    },
  ];

  return signalMatchers
    .filter((signal) =>
      signal.matches.some((term) => searchableText.includes(term))
    )
    .map((signal) => signal.label)
    .slice(0, 5);
}

function buildProfileSignalPrompt(signal: string) {
  const promptBySignal: Record<string, string> = {
    Dependentes: "Quero iniciar uma triagem focando em dependentes e alimentandos.",
    Imovel: "Quero iniciar uma triagem focando em imovel e financiamento.",
    FGTS: "Quero iniciar uma triagem focando em FGTS e seus impactos na declaracao.",
    Previdencia: "Quero iniciar uma triagem focando em previdencia privada.",
    Investimentos: "Quero iniciar uma triagem focando em investimentos e bens financeiros.",
    "Despesas medicas":
      "Quero iniciar uma triagem focando em despesas medicas e deducoes.",
    "Renda PJ / autonomo":
      "Quero iniciar uma triagem focando em renda PJ, autonoma e livro-caixa.",
  };

  return (
    promptBySignal[signal] ??
    `Quero iniciar uma triagem considerando este tema do meu perfil: ${signal}.`
  );
}

function inferSignalFromPrompt(prompt: string) {
  const promptToSignal: Array<[string, string]> = [
    ["dependentes", "Dependentes"],
    ["imovel", "Imovel"],
    ["fgts", "FGTS"],
    ["previdencia", "Previdencia"],
    ["investimentos", "Investimentos"],
    ["medicas", "Despesas medicas"],
    ["pj", "Renda PJ / autonomo"],
    ["autonoma", "Renda PJ / autonomo"],
    ["livro-caixa", "Renda PJ / autonomo"],
  ];

  const normalizedPrompt = prompt.toLowerCase();
  return (
    promptToSignal.find(([term]) => normalizedPrompt.includes(term))?.[1] ?? null
  );
}

function normalizeForGuidedReplies(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getGuidedQuickReplies(question: string | null, sheetLabel?: string | null) {
  const replies: string[] = [];
  const addReplies = (items: string[]) => {
    for (const item of items) {
      if (!replies.includes(item)) {
        replies.push(item);
      }
    }
  };

  if (!question) return replies;

  const normalizedQuestion = normalizeForGuidedReplies(question);

  if (
    normalizedQuestion.includes("informe de rendimentos de trabalho assalariado") ||
    normalizedQuestion.includes("tambem traz investimentos/previdencia privada")
  ) {
    addReplies([
      "E um informe de salario CLT",
      "Tambem tem investimentos",
      "Tambem tem previdencia privada",
      "Nao sei ainda",
    ]);
    return replies;
  }

  if (
    normalizedQuestion.includes("quer que eu confira agora o quadro de 13o salario") ||
    normalizedQuestion.includes("quer que eu confira agora o quadro de rendimentos isentos") ||
    normalizedQuestion.includes("quer que eu confirme agora o cnpj da fonte pagadora") ||
    normalizedQuestion.includes("quer que eu transforme isso em checklist da ficha") ||
    normalizedQuestion.includes("ficha principal ja esta pronta para revisar")
  ) {
    addReplies([
      "Sim, vamos revisar isso agora",
      "Transforme em checklist da ficha",
      "Resuma o que ainda falta",
      "Nao agora",
    ]);
    return replies;
  }

  if (sheetLabel) {
    addReplies([
      "Ja preenchi essa ficha",
      "Nao encontrei esse campo",
      "Quero revisar essa ficha",
    ]);
  }

  if (
    normalizedQuestion.includes("houve") ||
    normalizedQuestion.includes("teve") ||
    normalizedQuestion.includes("recebeu") ||
    normalizedQuestion.includes("existe") ||
    normalizedQuestion.includes("ha ") ||
    normalizedQuestion.startsWith("ha ")
  ) {
    addReplies(["Sim", "Nao", "Nao sei"]);
    return replies;
  }

  if (
    normalizedQuestion.includes("reembolso") ||
    normalizedQuestion.includes("titular") ||
    normalizedQuestion.includes("dependente") ||
    normalizedQuestion.includes("conflito")
  ) {
    addReplies(["Sim", "Nao", "Preciso conferir"]);
    return replies;
  }

  if (
    normalizedQuestion.includes("qual foi o valor") ||
    normalizedQuestion.includes("qual valor") ||
    normalizedQuestion.includes("quanto") ||
    normalizedQuestion.includes("valor ")
  ) {
    addReplies(["Vou informar o valor", "Nao encontrei no documento", "Preciso conferir"]);
    return replies;
  }

  if (
    normalizedQuestion.includes("quem") ||
    normalizedQuestion.includes("de quem") ||
    normalizedQuestion.includes("em nome de quem")
  ) {
    addReplies(["Em meu nome", "Em nome de dependente", "Preciso conferir"]);
    return replies;
  }

  if (
    normalizedQuestion.includes("que tipo de documento") ||
    normalizedQuestion.includes("esse pdf e um informe") ||
    normalizedQuestion.includes("qual e a origem dele")
  ) {
    addReplies([
      "Informe de rendimentos",
      "Informe bancario",
      "Corretora e investimentos",
      "Plano de saude",
      "Financiamento imobiliario",
    ]);
    return replies;
  }

  return replies;
}

function buildGuidedReplyMessage(
  reply: string,
  question: string | null,
  sheetLabel?: string | null
) {
  const normalizedReply = normalizeForGuidedReplies(reply);
  const normalizedQuestion = normalizeForGuidedReplies(question || "");

  if (
    normalizedQuestion.includes("informe de rendimentos de trabalho assalariado") ||
    normalizedQuestion.includes("tambem traz investimentos/previdencia privada")
  ) {
    if (normalizedReply === "e um informe de salario clt") {
      return "E um informe de rendimentos de trabalho assalariado CLT, sem investimentos e sem previdencia privada.";
    }
    if (normalizedReply === "tambem tem investimentos") {
      return "O documento tambem traz investimentos para declarar.";
    }
    if (normalizedReply === "tambem tem previdencia privada") {
      return "O documento tambem traz previdencia privada para declarar.";
    }
    if (normalizedReply === "nao sei ainda") {
      return "Ainda nao consigo confirmar se esse documento traz investimentos ou previdencia privada.";
    }
  }

  if (
    normalizedQuestion.includes("quer que eu confira agora o quadro de 13o salario") ||
    normalizedQuestion.includes("quer que eu confira agora o quadro de rendimentos isentos") ||
    normalizedQuestion.includes("quer que eu confirme agora o cnpj da fonte pagadora") ||
    normalizedQuestion.includes("quer que eu transforme isso em checklist da ficha") ||
    normalizedQuestion.includes("ficha principal ja esta pronta para revisar")
  ) {
    if (normalizedReply === "sim, vamos revisar isso agora") {
      return "Sim, vamos revisar esse ponto agora e seguir com a ficha principal.";
    }
    if (normalizedReply === "transforme em checklist da ficha") {
      return "Transforme isso em checklist da ficha principal.";
    }
    if (normalizedReply === "resuma o que ainda falta") {
      return "Resuma o que ainda falta nessa ficha principal.";
    }
    if (normalizedReply === "nao agora") {
      return "Nao agora. Pode manter o rascunho da ficha principal e seguir depois.";
    }
  }

  if (normalizedReply === "ja preenchi essa ficha" && sheetLabel) {
    return `Ja preenchi a ficha ${sheetLabel}. Pode seguir para o proximo ponto.`;
  }

  if (normalizedReply === "nao encontrei esse campo") {
    if (sheetLabel && question) {
      return `Nao encontrei esse campo na ficha ${sheetLabel}. Pergunta atual: ${question}`;
    }
    if (question) {
      return `Nao encontrei esse campo. Pergunta atual: ${question}`;
    }
  }

  if (normalizedReply === "quero revisar essa ficha" && sheetLabel) {
    if (question) {
      return `Quero revisar a ficha ${sheetLabel}. Me ajude com este ponto: ${question}`;
    }
    return `Quero revisar a ficha ${sheetLabel}.`;
  }

  return reply;
}

function getUserInitials(profileDetails: ProfileDetails, authName?: string | null) {
  const compositeName = `${profileDetails.firstName} ${profileDetails.lastName}`.trim();
  const base = compositeName || authName?.trim() || "U";
  const parts = base.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? "U"}${parts[1][0] ?? ""}`.toUpperCase();
  }

  return base.slice(0, 2).toUpperCase();
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRetryAfterLabel(totalSeconds: number) {
  if (totalSeconds >= 3600) {
    const hours = Math.ceil(totalSeconds / 3600);
    return `${hours}h`;
  }

  if (totalSeconds >= 60) {
    const minutes = Math.ceil(totalSeconds / 60);
    return `${minutes} min`;
  }

  return `${totalSeconds}s`;
}

function getFriendlyErrorMessage(errorMessage: string) {
  const normalizedMessage = errorMessage.toLowerCase();

  if (
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("fetch")
  ) {
    return "Nao foi possivel conectar ao servidor. Verifique se o backend esta ativo e tente novamente.";
  }

  if (
    normalizedMessage.includes("session") ||
    normalizedMessage.includes("sessao") ||
    normalizedMessage.includes("expir")
  ) {
    return "Sua sessao expirou por seguranca. Entre novamente para continuar.";
  }

  if (
    normalizedMessage.includes("entre na sua conta") ||
    normalizedMessage.includes("autenticacao necessaria")
  ) {
    return "Entre na sua conta para continuar conversando com a IA.";
  }

  if (
    normalizedMessage.includes("premium") ||
    normalizedMessage.includes("upload de documentos esta disponivel")
  ) {
    return errorMessage;
  }

  if (
    normalizedMessage.includes("limite") ||
    normalizedMessage.includes("orcamento") ||
    normalizedMessage.includes("budget") ||
    normalizedMessage.includes("429")
  ) {
    return errorMessage;
  }

  return "Nao foi possivel concluir sua solicitacao agora. Tente novamente em instantes.";
}

function mapConversationSummaryToHistoryItem(
  conversation: ConversationSummary
): ConversationHistoryItem {
  return {
    id: conversation.id,
    title: conversation.title,
    preview: conversation.preview,
    updatedAt: new Date(conversation.updated_at).getTime(),
    confidenceLevel: conversation.confidence_level ?? null,
    confidenceReason: conversation.confidence_reason ?? null,
    sessionId: null,
    conversationId: conversation.id,
    source: "remote",
    messageCount: conversation.message_count,
    messages: [],
  };
}

function mapConversationDetailToUiMessages(
  conversation: ConversationDetail
): UiMessage[] {
  return conversation.messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    kind: message.kind,
    sources: message.sources,
    uploadedDocuments: message.uploaded_documents,
    uploadAnalysis: message.upload_analysis ?? null,
    checklist: message.checklist,
    riskFlags: message.risk_flags,
    createdAt: new Date(message.created_at),
    isStreaming: false,
  }));
}

function updateHistoryItemInList(
  items: ConversationHistoryItem[],
  historyId: string,
  updates: Partial<ConversationHistoryItem>
) {
  return items.map((item) =>
    item.id === historyId || item.conversationId === historyId
      ? { ...item, ...updates }
      : item
  );
}

function getDraftStorageKey(conversationId: string | null) {
  return `${DRAFT_STORAGE_PREFIX}${conversationId ?? "new"}`;
}

function getContextualPrompts(
  messages: UiMessage[],
  response: ChatResponse | null
) {
  if (response?.triage_active && !response.triage_finished) {
    const promptByField: Record<string, string> = {
      income: "Quais rendimentos voce recebeu no ano?",
      medical_expenses: "Voce teve despesas medicas ou com educacao?",
      property: "Voce possui imovel, carro ou outro bem relevante?",
      financing: "Teve financiamento imobiliario ou de outro bem?",
      dependents: "Voce tem dependentes para declarar?",
      investments: "Possui investimentos, acoes ou renda fixa?",
      previdencia: "Teve previdencia privada no ano?",
      fgts: "Houve saque, rescisao ou uso de FGTS no ano?",
    };

    const fieldDrivenPrompts = (response.triage_missing_fields ?? [])
      .map((field) => promptByField[field])
      .filter((prompt): prompt is string => Boolean(prompt));

    const fallbackPrompts = [
      "Quero continuar a triagem passo a passo",
      "Me diga o proximo ponto mais importante",
      "Pode resumir o que ja foi entendido ate aqui?",
    ];

    return [...fieldDrivenPrompts, ...fallbackPrompts].slice(0, 4);
  }

  if (response?.triage_finished) {
    const checklistPrompts = (response.checklist ?? [])
      .slice(0, 2)
      .map((item) => `Me explique melhor: ${item}`);
    const riskPrompts = (response.risk_flags ?? [])
      .slice(0, 2)
      .map((item) => `Como lidar com este ponto: ${item}`);

    return [
      ...checklistPrompts,
      ...riskPrompts,
      "Resuma meu checklist final",
      "Quais documentos eu devo separar agora?",
      "Transforme isso em um plano simples de envio",
      "O que merece mais atencao antes de enviar?",
    ].slice(0, 4);
  }

  if (response?.sources?.length) {
    return [
      "Explique isso em linguagem mais simples",
      "Quais documentos comprovam essa resposta?",
      "Existe alguma excecao importante nesse caso?",
      "Monte um checklist com base nessa orientacao",
    ];
  }

  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content.toLowerCase();

  if (lastUserMessage?.includes("fgts")) {
    return [
      "FGTS entra em rendimentos isentos?",
      "Quais documentos devo usar para declarar FGTS?",
      "Como declarar FGTS de rescisao?",
      "Como declarar FGTS usado em imovel?",
    ];
  }

  if (
    lastUserMessage?.includes("imovel") ||
    lastUserMessage?.includes("financiamento")
  ) {
    return [
      "Como lancar financiamento imobiliario no IR?",
      "Quais campos usar para declarar um imovel financiado?",
      "Como informar saldo devedor e parcelas pagas?",
      "Quais documentos devo separar sobre o imovel?",
    ];
  }

  if (
    lastUserMessage?.includes("medic") ||
    lastUserMessage?.includes("dent")
  ) {
    return [
      "Quais despesas medicas sao dedutiveis?",
      "Como declarar reembolso do plano de saude?",
      "Quais recibos eu preciso guardar?",
      "Monte um checklist de despesas dedutiveis",
    ];
  }

  if (response?.follow_up_prompts?.length) {
    return response.follow_up_prompts.slice(0, 4);
  }

  return QUICK_PROMPTS;
}

function documentNeedsKindConfirmation(document: UploadedDocument) {
  const signals = new Set(document.signals);
  if (
    signals.has("Informe de rendimentos") &&
    document.document_kind &&
    document.document_kind !== "Informe de rendimentos"
  ) {
    return true;
  }
  if (
    document.document_kind === "Corretora e investimentos" &&
    (signals.has("Informe de rendimentos") || signals.has("OCR aplicado"))
  ) {
    return true;
  }
  return false;
}

function getDocumentKindOptions(document: UploadedDocument) {
  return documentNeedsKindConfirmation(document)
    ? DOCUMENT_KIND_CONFIRMATION_OPTIONS
    : [];
}

function hasVisibleUploadAnalysis(
  analysis?: ChatResponse["upload_analysis"] | null
) {
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
      analysis.field_actions?.length ||
      analysis.filing_roadmap?.length ||
      analysis.topics?.length ||
      analysis.conflicts?.length ||
      analysis.sheet_draft?.length ||
      analysis.pending_questions?.length
  );
}

function getConfidenceSummary(response: ChatResponse | null) {
  if (!response) {
    return {
      label: "Aguardando contexto",
      tone: "neutral" as const,
      description: "Envie uma pergunta para avaliar a base da resposta.",
    };
  }

  if (response.mode === "triage") {
    if (
      response.confidence_reason === "triagem_concluida" ||
      response.triage_finished
    ) {
      return {
        label: "Triagem concluida",
        tone: "strong" as const,
        description: "Ja existe contexto suficiente para orientar seus proximos passos.",
      };
    }

    return {
      label: "Coletando contexto",
      tone: "moderate" as const,
      description: "A triagem esta reunindo informacoes para aumentar a precisao.",
    };
  }

  const confidenceReason = response.confidence_reason;

  if (confidenceReason === "base_oficial_forte") {
    return {
      label: "Base forte",
      tone: "strong" as const,
      description: "A resposta esta ancorada em fonte oficial com boa aderencia ao tema.",
    };
  }

  if (confidenceReason === "base_parcial") {
    return {
      label: "Base moderada",
      tone: "moderate" as const,
      description: "Existe sustentacao no acervo, mas alguns detalhes ainda pedem validacao.",
    };
  }

  if (confidenceReason === "tema_relacionado") {
    return {
      label: "Tema relacionado",
      tone: "limited" as const,
      description: "As fontes recuperadas estao proximas do assunto, mas nao totalmente centradas nele.",
    };
  }

  if (confidenceReason === "sem_base_suficiente") {
    return {
      label: "Contexto limitado",
      tone: "limited" as const,
      description: "Ainda nao ha base suficiente no acervo para orientar isso com seguranca.",
    };
  }

  if (confidenceReason === "fallback_web_oficial") {
    return {
      label: "Web oficial",
      tone: "moderate" as const,
      description: "A resposta foi apoiada por referencias oficiais da web, fora da base interna.",
    };
  }

  if (confidenceReason === "fallback_base_local") {
    return {
      label: "Base local",
      tone: "moderate" as const,
      description: "A resposta foi montada diretamente do acervo interno, sem depender de busca externa.",
    };
  }

  if (confidenceReason === "fallback_mcp_rules") {
    return {
      label: "MCP regras",
      tone: "moderate" as const,
      description: "A resposta foi apoiada por uma regra fiscal estruturada vinda da camada MCP.",
    };
  }

  if (confidenceReason === "fallback_mcp_sources" || confidenceReason === "fallback_mcp") {
    return {
      label: "MCP",
      tone: "moderate" as const,
      description: "A resposta foi apoiada por uma fonte externa estruturada conectada via MCP.",
    };
  }

  if (confidenceReason === "fallback_web_sem_match") {
    return {
      label: "Sem fonte aderente",
      tone: "limited" as const,
      description: "A busca web nao encontrou uma referencia suficientemente alinhada para mostrar com seguranca.",
    };
  }

  if (confidenceReason === "fallback_web_amplo") {
    return {
      label: "Web ampliada",
      tone: "moderate" as const,
      description: "A resposta foi apoiada por uma busca web mais ampla, com fontes fora do catalogo principal.",
    };
  }

  const validScores = response.sources
    .map((source) => source.score)
    .filter((score): score is number => typeof score === "number");

  const bestScore = validScores.length ? Math.max(...validScores) : null;

  if (response.sources.length >= 2 || (bestScore !== null && bestScore >= 0.82)) {
    return {
      label: "Base forte",
      tone: "strong" as const,
      description: "A resposta foi apoiada por fontes relevantes do acervo.",
    };
  }

  if (response.sources.length >= 1 || (bestScore !== null && bestScore >= 0.55)) {
    return {
      label: "Base moderada",
      tone: "moderate" as const,
      description: "Existe alguma sustentacao, mas pode valer validar detalhes.",
    };
  }

  return {
    label: "Contexto limitado",
    tone: "limited" as const,
    description: "Esta resposta merece verificacao adicional antes de agir.",
  };
}

function getResponseOriginSummary(response: ChatResponse | null) {
  if (!response) {
    return {
      label: "Sem origem definida",
      description: "A origem da resposta aparece assim que houver contexto suficiente.",
      tone: "neutral" as const,
    };
  }

  const confidenceReason = response.confidence_reason;

  if (confidenceReason === "fallback_base_local") {
    return {
      label: "Base local",
      description: "Montada diretamente do acervo versionado do produto.",
      tone: "local" as const,
    };
  }

  if (confidenceReason === "fallback_mcp_rules") {
    return {
      label: "MCP regras",
      description: "Apoiada por uma regra fiscal estruturada na camada MCP.",
      tone: "mcp" as const,
    };
  }

  if (confidenceReason === "fallback_mcp_sources" || confidenceReason === "fallback_mcp") {
    return {
      label: "MCP fontes",
      description: "Apoiada por uma fonte estruturada conectada via MCP.",
      tone: "mcp" as const,
    };
  }

  if (confidenceReason === "fallback_web_oficial") {
    return {
      label: "Web oficial",
      description: "Apoiada por referencias oficiais fora da base interna.",
      tone: "web" as const,
    };
  }

  if (confidenceReason === "fallback_web_amplo") {
    return {
      label: "Web ampliada",
      description: "Apoiada por busca web mais ampla, com revisao de aderencia.",
      tone: "web" as const,
    };
  }

  if (confidenceReason === "fallback_web_sem_match") {
    return {
      label: "Sem fonte aderente",
      description: "Nao encontrei uma fonte suficientemente alinhada para mostrar com seguranca.",
      tone: "limited" as const,
    };
  }

  return {
    label: "Base principal",
    description: "A resposta foi montada usando o fluxo principal de base e recuperacao.",
    tone: "local" as const,
  };
}

function getYearContextSummary(response: ChatResponse | null) {
  if (!response?.year_notice) {
    return null;
  }

  const isMismatch = response.year_interpretation_status === "year_mismatch";

  return {
    label: isMismatch ? "Ano diferente da base ativa" : "Ano de referencia",
    description: response.year_notice,
    tone: isMismatch ? "warning" : "info",
  } as const;
}

function getTriageProgress(response: ChatResponse | null) {
  const totalFields = response?.triage_total_fields || 8;
  const missingFieldItems = response?.triage_missing_fields ?? [];
  const missingFieldLabels = missingFieldItems.map(
    (field) => TRIAGE_FIELD_LABELS[field] ?? field
  );
  const mappedFieldLabels = Object.keys(response?.triage_profile ?? {})
    .filter((field) => !missingFieldItems.includes(field))
    .map((field) => TRIAGE_FIELD_LABELS[field] ?? field);
  const missingFields = missingFieldItems.length || totalFields;
  const answeredFields = Math.max(0, totalFields - missingFields);

  if (!response?.triage_active && !response?.triage_finished) {
    return {
      current: 0,
      total: totalFields,
      percentage: 0,
      label: "Triagem inativa",
      description: "Ative a triagem guiada quando quiser uma coleta mais completa.",
      missingFieldLabels: [],
      mappedFieldLabels: [],
    };
  }

  if (response.triage_finished) {
    return {
      current: totalFields,
      total: totalFields,
      percentage: 100,
      label: "Triagem concluida",
      description: "Seu perfil ja foi consolidado para gerar checklist e proximos passos.",
      missingFieldLabels: [],
      mappedFieldLabels,
    };
  }

  const current = Math.min(totalFields, Math.max(1, answeredFields));
  return {
    current,
    total: totalFields,
    percentage: Math.round((current / totalFields) * 100),
    label: `${current} de ${totalFields} temas mapeados`,
    description: `${missingFieldLabels.length} tema${missingFieldLabels.length === 1 ? "" : "s"
      } ainda podem refinar a orientacao.`,
    missingFieldLabels,
    mappedFieldLabels,
  };
}

export default function HomePage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [historyItems, setHistoryItems] = useState<ConversationHistoryItem[]>([]);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [switchingDevProfileEmail, setSwitchingDevProfileEmail] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [highlightedHistoryId, setHighlightedHistoryId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profilePreferences, setProfilePreferences] = useState<ProfilePreferences>(
    DEFAULT_PROFILE_PREFERENCES
  );
  const [profileDetails, setProfileDetails] = useState<ProfileDetails>(
    DEFAULT_PROFILE_DETAILS
  );
  const [profileReady, setProfileReady] = useState(false);
  const [pendingProfileSuggestion, setPendingProfileSuggestion] = useState("");
  const [profileContextExpanded, setProfileContextExpanded] = useState(false);
  const [profileTriageFocus, setProfileTriageFocus] = useState<string | null>(null);
  const [webFeedbackLoadingId, setWebFeedbackLoadingId] = useState<string | null>(null);
  const [activeTaxYear, setActiveTaxYear] = useState("2026");
  const [availableTaxYears, setAvailableTaxYears] = useState<string[]>(["2026"]);
  const [knowledgeBaseSettingsLoading, setKnowledgeBaseSettingsLoading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [uploadedDocumentOverrides, setUploadedDocumentOverrides] = useState<Record<string, string>>({});
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentReviewBanner, setDocumentReviewBanner] = useState<string>("");
  const [documentReviewLabel, setDocumentReviewLabel] = useState<string>("");
  const [documentReviewContext, setDocumentReviewContext] = useState<{
    uploadId?: string | null;
    documentLabel?: string | null;
    reviewLabel?: string | null;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const streamingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const profileSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProfilePayloadRef = useRef<string>("");
  const externalContextAppliedRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function hydrateAuth() {
      try {
        const authStatus = await getAuthStatus();
        if (!active) return;

        setAuthUser(authStatus.user);

        if (authStatus.authenticated) {
          const [conversations, userProfile, knowledgeBaseSettings] = await Promise.all([
            listConversations(),
            getUserProfile(),
            getKnowledgeBaseSettings().catch(() => null),
          ]);
          if (!active) return;
          const remoteDetails = mapProfileResponseToDetails(userProfile);
          const remotePreferences = mapProfileResponseToPreferences(userProfile);
          const authName = authStatus.user?.name?.trim() ?? "";

          if (!remoteDetails.firstName && !remoteDetails.lastName && authName) {
            const [firstName, ...rest] = authName.split(" ");
            remoteDetails.firstName = firstName ?? "";
            remoteDetails.lastName = rest.join(" ");
          }

          setHistoryItems(conversations.map(mapConversationSummaryToHistoryItem));
          setProfileDetails(remoteDetails);
          setProfilePreferences(remotePreferences);
          if (knowledgeBaseSettings) {
            setActiveTaxYear(knowledgeBaseSettings.active_tax_year);
            setAvailableTaxYears(
              knowledgeBaseSettings.available_tax_years.length
                ? knowledgeBaseSettings.available_tax_years
                : [knowledgeBaseSettings.active_tax_year]
            );
          }
          lastProfilePayloadRef.current = JSON.stringify(
            buildProfileUpdatePayload(remoteDetails, remotePreferences)
          );
          setProfileReady(true);
        } else {
          setProfileReady(true);
        }
      } catch {
        if (!active) return;
        setAuthUser(null);
        setProfileReady(true);
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    hydrateAuth();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !authUser) {
      window.location.replace("/");
    }
  }, [authLoading, authUser]);

  useEffect(() => {
    if (!shouldAutoScroll) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading, shouldAutoScroll]);

  useEffect(() => {
    if (!loading && !resetting) {
      textareaRef.current?.focus();
    }
  }, [loading, resetting]);

  useEffect(() => {
    if (!copiedId) return;

    const timer = setTimeout(() => {
      setCopiedId(null);
    }, 1800);

    return () => clearTimeout(timer);
  }, [copiedId]);

  useEffect(() => {
    if (!highlightedHistoryId) return;

    const timer = setTimeout(() => {
      setHighlightedHistoryId(null);
    }, 2200);

    return () => clearTimeout(timer);
  }, [highlightedHistoryId]);

  useEffect(() => {
    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      if (profileSyncTimeoutRef.current) {
        clearTimeout(profileSyncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!rateLimitedUntil) return;

    if (rateLimitedUntil <= Date.now()) {
      setRateLimitedUntil(null);
      return;
    }

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitedUntil]);

  useEffect(() => {
    if (rateLimitedUntil && now >= rateLimitedUntil) {
      setRateLimitedUntil(null);
    }
  }, [now, rateLimitedUntil]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedValue = window.localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (!storedValue) return;

    const parsed = Number(storedValue);
    if (!Number.isFinite(parsed) || parsed <= Date.now()) {
      window.localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
      return;
    }

    setRateLimitedUntil(parsed);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!rateLimitedUntil || rateLimitedUntil <= Date.now()) {
      window.localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      RATE_LIMIT_STORAGE_KEY,
      String(rateLimitedUntil)
    );
  }, [rateLimitedUntil]);

  useEffect(() => {
    if (!mobileDrawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileDrawerOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(PROFILE_PREFERENCES_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as Partial<ProfilePreferences>;
      setProfilePreferences({
        showHistoryBadges:
          parsed.showHistoryBadges ?? DEFAULT_PROFILE_PREFERENCES.showHistoryBadges,
        showTriageInsights:
          parsed.showTriageInsights ??
          DEFAULT_PROFILE_PREFERENCES.showTriageInsights,
        historyCardDensity:
          parsed.historyCardDensity ??
          DEFAULT_PROFILE_PREFERENCES.historyCardDensity,
      });
    } catch {
      window.localStorage.removeItem(PROFILE_PREFERENCES_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      PROFILE_PREFERENCES_STORAGE_KEY,
      JSON.stringify(profilePreferences)
    );
  }, [profilePreferences]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(PROFILE_DETAILS_STORAGE_KEY);
    if (!stored) {
      const authName = authUser?.name?.trim() ?? "";
      if (authName) {
        const [firstName, ...rest] = authName.split(" ");
        setProfileDetails((current) => ({
          ...current,
          firstName: current.firstName || firstName || "",
          lastName: current.lastName || rest.join(" "),
        }));
      }
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<ProfileDetails>;
      setProfileDetails({
        firstName: parsed.firstName ?? "",
        lastName: parsed.lastName ?? "",
        phone: parsed.phone ?? "",
        city: parsed.city ?? "",
        taxProfileNote: parsed.taxProfileNote ?? "",
        avatarDataUrl: parsed.avatarDataUrl ?? "",
      });
    } catch {
      window.localStorage.removeItem(PROFILE_DETAILS_STORAGE_KEY);
    }
  }, [authUser?.name]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      PROFILE_DETAILS_STORAGE_KEY,
      JSON.stringify(profileDetails)
    );
  }, [profileDetails]);

  useEffect(() => {
    if (!authUser || !profileReady) return;

    const payload = buildProfileUpdatePayload(profileDetails, profilePreferences);
    const serializedPayload = JSON.stringify(payload);

    if (serializedPayload === lastProfilePayloadRef.current) {
      return;
    }

    if (profileSyncTimeoutRef.current) {
      clearTimeout(profileSyncTimeoutRef.current);
    }

    profileSyncTimeoutRef.current = setTimeout(async () => {
      try {
        const updatedProfile = await updateUserProfile(payload);
        const syncedDetails = mapProfileResponseToDetails(updatedProfile);
        const syncedPreferences = mapProfileResponseToPreferences(updatedProfile);

        lastProfilePayloadRef.current = JSON.stringify(
          buildProfileUpdatePayload(syncedDetails, syncedPreferences)
        );
      } catch (err) {
        console.error("Nao foi possivel sincronizar o perfil.", err);
      }
    }, 500);

    return () => {
      if (profileSyncTimeoutRef.current) {
        clearTimeout(profileSyncTimeoutRef.current);
      }
    };
  }, [authUser, profileDetails, profilePreferences, profileReady]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const draft = window.localStorage.getItem(getDraftStorageKey(conversationId));
    setMessage(draft ?? "");
  }, [conversationId]);

  useEffect(() => {
    if (
      authLoading ||
      !authUser ||
      externalContextAppliedRef.current ||
      typeof window === "undefined"
    ) {
      return;
    }

    const externalPrompt = searchParams.get("prompt")?.trim() || "";
    const externalReviewLabel =
      searchParams.get("reviewLabel")?.trim() || "";
    const externalDocumentLabel =
      searchParams.get("documentLabel")?.trim() || "";
    const externalUploadId = searchParams.get("uploadId")?.trim() || "";
    const externalConversationId =
      searchParams.get("conversationId")?.trim() || "";

    if (!externalPrompt && !externalConversationId) {
      externalContextAppliedRef.current = true;
      return;
    }

    async function applyExternalContext() {
      if (
        externalConversationId &&
        externalConversationId !== conversationId
      ) {
        try {
          const conversation = await getConversation(externalConversationId);
          setConversationId(conversation.id);
          setMessages(mapConversationDetailToUiMessages(conversation));
          setUploadedDocuments([]);
          setUploadedDocumentOverrides({});
          setResponse({
            session_id: null,
            conversation_id: conversation.id,
            mode: conversation.mode === "triage" ? "triage" : "direct_question",
            answer: null,
            model: null,
            confidence_level: conversation.confidence_level ?? null,
            confidence_reason: conversation.confidence_reason ?? null,
            requested_tax_year: null,
            active_tax_year: activeTaxYear,
            year_interpretation_status: null,
            year_notice: null,
            profile_update_suggestion: null,
            next_steps: [],
            follow_up_prompts: [],
            sources: [],
            uploaded_documents: [],
            triage_question: null,
            triage_profile: conversation.triage_profile,
            triage_missing_fields: conversation.triage_missing_fields,
            triage_total_fields: conversation.triage_total_fields,
            triage_active: conversation.triage_active,
            triage_finished: conversation.triage_finished,
            checklist: [],
            risk_flags: [],
          });
        } catch (err) {
          console.error("Nao foi possivel retomar a conversa do documento.", err);
        }
      }

      if (externalPrompt) {
        setMessage(externalPrompt);
        setDocumentReviewLabel(externalDocumentLabel);
        setDocumentReviewContext({
          uploadId: externalUploadId || null,
          documentLabel: externalDocumentLabel || null,
          reviewLabel: externalReviewLabel || null,
        });
        setDocumentReviewBanner(
          externalReviewLabel
            ? `Continuando revisao: ${externalReviewLabel}.`
            : "Continuando a revisao do seu documento com um proximo passo ja preparado."
        );
      }

      externalContextAppliedRef.current = true;
      const url = new URL(window.location.href);
      url.searchParams.delete("prompt");
      url.searchParams.delete("reviewLabel");
      url.searchParams.delete("documentLabel");
      url.searchParams.delete("uploadId");
      url.searchParams.delete("conversationId");
      window.history.replaceState({}, "", url.toString());
    }

    void applyExternalContext();
  }, [
    activeTaxYear,
    authLoading,
    authUser,
    conversationId,
    searchParams,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const key = getDraftStorageKey(conversationId);
    const trimmed = message.trim();

    if (!trimmed) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, message);
  }, [conversationId, message]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasDraft = message.trim().length > 0;
    if (!hasDraft) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [message]);

  async function copyText(text: string, id?: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id ?? "global");
      toast.success("Copiado com sucesso.");
    } catch {
      setError("Nao foi possivel copiar o conteudo.");
      toast.error("Nao foi possivel copiar o conteudo.");
    }
  }

  async function handleCopyChecklist(
    items?: string[],
    risks?: string[],
    messageId?: string
  ) {
    const parts: string[] = [];

    if (items?.length) {
      parts.push("Checklist:");
      items.forEach((item) => parts.push(`- ${item}`));
    }

    if (risks?.length) {
      parts.push("");
      parts.push("Pontos de atencao:");
      risks.forEach((item) => parts.push(`- ${item}`));
    }

    await copyText(parts.join("\n"), messageId);
  }

  async function handleWebSourceFeedback(
    targetMessage: UiMessage,
    feedback: "like" | "dislike" | "clear"
  ) {
    const webSources = (targetMessage.sources ?? []).filter(
      (source) => source.origin === "web" && source.web_result_id
    );
    if (!webSources.length) return;

    const hasLiked = webSources.some((source) => source.feedback_status === "liked");
    const hasBlocked = webSources.some(
      (source) => source.feedback_status === "blocked"
    );

    const nextFeedback =
      feedback === "like" && hasLiked
        ? "clear"
        : feedback === "dislike" && hasBlocked
          ? "clear"
          : feedback;
    const loadingKey = webSources
      .map((source) => source.web_result_id)
      .filter(Boolean)
      .join("|");

    try {
      setWebFeedbackLoadingId(loadingKey);
      const updatedResults = await Promise.all(
        webSources.map((source) =>
          submitWebSearchFeedback(source.web_result_id!, {
            feedback: nextFeedback,
          })
        )
      );

      const nextStatus = updatedResults[0]?.status ?? "pending";

      setMessages((prev) =>
        prev.map((message) => ({
          ...message,
          sources: message.sources?.map((item) =>
            webSources.some((source) => source.web_result_id === item.web_result_id)
              ? { ...item, feedback_status: nextStatus }
              : item
          ),
        }))
      );

      setResponse((current) =>
        current
          ? {
            ...current,
            sources: current.sources.map((item) =>
              webSources.some((source) => source.web_result_id === item.web_result_id)
                ? { ...item, feedback_status: nextStatus }
                : item
            ),
          }
          : current
      );

      const acknowledgement =
        nextStatus === "liked"
          ? "Obrigado pela avaliacao. Isso nos ajuda muito a melhorar nosso conhecimento e trazer respostas cada vez mais assertivas."
          : nextStatus === "blocked"
            ? "Obrigado pela avaliacao. Isso nos ajuda muito a melhorar nosso conhecimento e evitar referencias que nao agregaram valor."
            : "Obrigado pela avaliacao. Seu feedback foi atualizado e vai nos ajudar a calibrar melhor as proximas respostas.";

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: acknowledgement,
          kind: "text",
          sources: [],
          createdAt: new Date(),
        },
      ]);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Nao foi possivel salvar seu feedback sobre a fonte.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setWebFeedbackLoadingId(null);
    }
  }

  function streamAssistantMessage(
    fullText: string,
    options?: {
      sources?: ChatResponse["sources"];
      nextSteps?: string[];
      followUpPrompts?: string[];
      uploadedDocuments?: UploadedDocument[];
      uploadAnalysis?: ChatResponse["upload_analysis"];
    }
  ) {
    const messageId = crypto.randomUUID();
    const normalizedUploadAnalysis = hasVisibleUploadAnalysis(
      options?.uploadAnalysis
    )
      ? options?.uploadAnalysis ?? null
      : null;
    const normalizedText =
      fullText.trim() ||
      (normalizedUploadAnalysis
        ? "Analisei o arquivo enviado e organizei os pontos principais abaixo."
        : "Sem resposta.");
    const shouldBypassTyping =
      Boolean(normalizedUploadAnalysis) || normalizedText.length > 2200;

    const assistantMessage: UiMessage = {
      id: messageId,
      role: "assistant",
      content: shouldBypassTyping ? normalizedText : "",
      kind: "text",
      sources: options?.sources ?? [],
      nextSteps: options?.nextSteps ?? [],
      followUpPrompts: options?.followUpPrompts ?? [],
      uploadedDocuments: options?.uploadedDocuments ?? [],
      uploadAnalysis: normalizedUploadAnalysis,
      createdAt: new Date(),
      isStreaming: !shouldBypassTyping,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    if (shouldBypassTyping) {
      return;
    }

    let index = 0;

    const typeNextCharacter = () => {
      index += 1;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
              ...msg,
              content: normalizedText.slice(0, index),
              isStreaming: index < normalizedText.length,
            }
            : msg
        )
      );

      if (index < normalizedText.length) {
        streamingTimeoutRef.current = setTimeout(typeNextCharacter, TYPING_SPEED);
      }
    };

    typeNextCharacter();
  }

  function handleMessagesScroll() {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    const isNearBottom = distanceFromBottom < 120;

    setShouldAutoScroll(isNearBottom);
    setShowScrollToBottom(!isNearBottom);
  }

  function scrollToBottom() {
    setShouldAutoScroll(true);
    setShowScrollToBottom(false);
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }

  async function refreshRemoteConversations() {
    const conversations = await listConversations();
    setHistoryItems(conversations.map(mapConversationSummaryToHistoryItem));
  }

  function confirmDiscardDraft(actionLabel: string) {
    if (!message.trim() && uploadedDocuments.length === 0) {
      return true;
    }

    return window.confirm(
      `Existe um texto nao enviado nesta conversa. Deseja descarta-lo e ${actionLabel}?`
    );
  }

  async function handleSelectHistory(historyId: string) {
    const selectedHistory = historyItems.find((item) => item.id === historyId);
    if (!selectedHistory?.conversationId) return;
    if (selectedHistory.conversationId === conversationId) {
      setMobileDrawerOpen(false);
      return;
    }
    if (!confirmDiscardDraft("abrir outra conversa")) return;

    try {
      const conversation = await getConversation(selectedHistory.conversationId);
      setConversationId(conversation.id);
      setMessages(mapConversationDetailToUiMessages(conversation));
      setUploadedDocuments([]);
      setUploadedDocumentOverrides({});
      setResponse({
        session_id: null,
        conversation_id: conversation.id,
        mode: conversation.mode === "triage" ? "triage" : "direct_question",
        answer: null,
        model: null,
        confidence_level: conversation.confidence_level ?? null,
        confidence_reason: conversation.confidence_reason ?? null,
        requested_tax_year: null,
        active_tax_year: activeTaxYear,
        year_interpretation_status: null,
        year_notice: null,
        profile_update_suggestion: null,
        next_steps: [],
        follow_up_prompts: [],
        sources: [],
        uploaded_documents: [],
        triage_question: null,
        triage_profile: conversation.triage_profile,
        triage_missing_fields: conversation.triage_missing_fields,
        triage_total_fields: conversation.triage_total_fields,
        triage_active: conversation.triage_active,
        triage_finished: conversation.triage_finished,
        checklist: [],
        risk_flags: [],
      });
      setProfileTriageFocus(null);
      setPendingProfileSuggestion("");
      setUploadedDocuments([]);
      setError("");
      setSessionExpired(false);
      setShouldAutoScroll(true);
      setHighlightedHistoryId(selectedHistory.id);
      setMobileDrawerOpen(false);
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      });
      toast.success("Conversa retomada.");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Nao foi possivel carregar a conversa.";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }

  async function handleLogout() {
    if (!confirmDiscardDraft("sair agora")) return;

    setAuthLoading(true);

    try {
      await logout();
      setMobileDrawerOpen(false);
      setAuthUser(null);
      setConversationId(null);
      setMessages([]);
      setUploadedDocuments([]);
      setUploadedDocumentOverrides({});
      setResponse(null);
      setProfileTriageFocus(null);
      setPendingProfileSuggestion("");
      setMessage("");
      setHistoryItems([]);
      toast.success("Sessao encerrada.");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Nao foi possivel sair.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSwitchDevProfile(email: string, name: string) {
    if (!confirmDiscardDraft("trocar de perfil de teste")) return;

    try {
      setSwitchingDevProfileEmail(email);
      await devLogin({ email, name });
      window.location.reload();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Nao foi possivel trocar o perfil de teste.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSwitchingDevProfileEmail(null);
    }
  }

  function handleReauthenticate() {
    if (typeof window === "undefined") return;

    setMobileDrawerOpen(false);
    window.location.assign(getLoginUrl("/chat"));
  }

  async function handleDeleteHistory(historyId: string) {
    const selectedHistory = historyItems.find((item) => item.id === historyId);
    if (!selectedHistory?.conversationId) return;

    const shouldDelete = window.confirm(
      `Deseja excluir a conversa "${selectedHistory.title}"?`
    );

    if (!shouldDelete) return;

    try {
      await deleteConversation(selectedHistory.conversationId);
      await refreshRemoteConversations();

      if (selectedHistory.conversationId === conversationId) {
        setConversationId(null);
        setMessages([]);
        setUploadedDocuments([]);
        setUploadedDocumentOverrides({});
        setResponse(null);
        setProfileTriageFocus(null);
        setError("");
      }

      toast.success("Conversa excluida.");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Nao foi possivel excluir a conversa.";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }

  async function handleRenameHistory(historyId: string) {
    const selectedHistory = historyItems.find((item) => item.id === historyId);
    if (!selectedHistory?.conversationId) return;

    const nextTitle = window.prompt(
      "Escolha um novo nome para a conversa:",
      selectedHistory.title
    );

    if (nextTitle === null) return;

    const normalizedTitle = nextTitle.trim();
    if (!normalizedTitle) {
      toast.error("Informe um titulo valido.");
      return;
    }

    try {
      const updatedConversation = await updateConversationTitle(
        selectedHistory.conversationId,
        normalizedTitle
      );

      setHistoryItems((prev) =>
        updateHistoryItemInList(prev, historyId, {
          title: updatedConversation.title,
          preview: updatedConversation.preview,
          updatedAt: new Date(updatedConversation.updated_at).getTime(),
          messageCount: updatedConversation.message_count,
        })
      );

      toast.success("Conversa renomeada.");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Nao foi possivel renomear a conversa.";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }

  async function handlePickDocument(file: File) {
    if (uploadingDocument || loading || resetting) return;
    if (!authUser) {
      toast.error("Entre na sua conta para enviar documentos.");
      return;
    }
    if (!canUploadDocumentsForUser(authUser)) {
      toast.error("Upload disponivel apenas no plano Premium.");
      return;
    }

    try {
      setUploadingDocument(true);
      setError("");
      const uploaded = await uploadDocument(file);
      setUploadedDocuments([uploaded]);
      setUploadedDocumentOverrides({});
      if (!documentNeedsKindConfirmation(uploaded)) {
        setUploadedDocumentOverrides((prev) => {
          const next = { ...prev };
          delete next[uploaded.id];
          return next;
        });
      }
      toast.success(
        uploadedDocuments.length
          ? `${uploaded.filename} substituiu o arquivo anterior para manter a leitura focada.`
          : `${uploaded.filename} pronto para analise.`
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Nao foi possivel enviar o arquivo agora.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUploadingDocument(false);
    }
  }

  function handleRemoveUploadedDocument(documentId: string) {
    setUploadedDocuments((prev) => prev.filter((item) => item.id !== documentId));
    setUploadedDocumentOverrides((prev) => {
      const next = { ...prev };
      delete next[documentId];
      return next;
    });
  }

  function handleConfirmUploadedDocumentKind(documentId: string, kind: string) {
    setUploadedDocumentOverrides((prev) => ({
      ...prev,
      [documentId]: kind,
    }));
  }

  async function handleSend(customMessage?: string) {
    const trimmed = (customMessage ?? message).trim();
    const hasUploadedDocuments = uploadedDocuments.length > 0;
    if ((!trimmed && !hasUploadedDocuments) || loading || resetting) return;

    const documentsPendingKindConfirmation = uploadedDocuments.filter(
      (document) =>
        documentNeedsKindConfirmation(document) &&
        !uploadedDocumentOverrides[document.id]
    );
    if (documentsPendingKindConfirmation.length > 0) {
      toast.error("Confirme o tipo do arquivo antes de iniciar a analise.");
      return;
    }

    if (rateLimitedUntil && rateLimitedUntil > Date.now()) {
      return;
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      const errorMessage = `Sua mensagem ultrapassa o limite de ${MAX_MESSAGE_LENGTH} caracteres.`;
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    const effectiveMessage = trimmed || "Analise os arquivos enviados e me diga como isso entra na declaracao do IR.";

    if (customMessage) {
      setProfileTriageFocus(inferSignalFromPrompt(effectiveMessage));
    } else if (!response?.triage_active) {
      setProfileTriageFocus(null);
    }

    setLoading(true);
    setError("");
    setSessionExpired(false);

    if (!customMessage && typeof window !== "undefined") {
      window.localStorage.removeItem(getDraftStorageKey(conversationId));
    }

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: effectiveMessage,
      kind: "text",
      uploadedDocuments,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    if (!customMessage) {
      setMessage("");
    }

    try {
      setRateLimitedUntil(null);
      const res = await sendMessage({
        message: effectiveMessage,
        conversation_id: conversationId,
        uploaded_document_ids: uploadedDocuments.map((item) => item.id),
        uploaded_document_overrides: uploadedDocumentOverrides,
        review_context: documentReviewContext
          ? {
              upload_id: documentReviewContext.uploadId ?? null,
              document_label: documentReviewContext.documentLabel ?? null,
              review_label: documentReviewContext.reviewLabel ?? null,
            }
          : undefined,
      });

      setConversationId(res.conversation_id ?? null);
      setResponse(res);
      setPendingProfileSuggestion(res.profile_update_suggestion ?? "");

      if (res.mode === "direct_question") {
        streamAssistantMessage(res.answer || "Sem resposta.", {
          sources: res.sources,
          nextSteps: res.next_steps,
          followUpPrompts: res.follow_up_prompts,
          uploadedDocuments: res.uploaded_documents,
          uploadAnalysis: res.upload_analysis,
        });
      } else if (res.triage_finished) {
        const assistantMessage: UiMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Triagem concluida.",
          kind: "triage_result",
          checklist: res.checklist,
          riskFlags: res.risk_flags,
          uploadedDocuments: res.uploaded_documents,
          uploadAnalysis: res.upload_analysis,
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        streamAssistantMessage(
          res.triage_question || "Vamos continuar sua triagem.",
          {
            uploadedDocuments: res.uploaded_documents,
            uploadAnalysis: res.upload_analysis,
          }
        );
      }

      setUploadedDocuments([]);
      setUploadedDocumentOverrides({});

      await refreshRemoteConversations();
    } catch (err) {
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));

      if (!customMessage) {
        setMessage(effectiveMessage === "Analise os arquivos enviados e me diga como isso entra na declaracao do IR." ? "" : effectiveMessage);
      }

      const rawErrorMessage =
        err instanceof Error ? err.message : "Erro ao chamar o backend.";
      const errorMessage = getFriendlyErrorMessage(rawErrorMessage);

      if (err instanceof ApiError && err.status === 429) {
        const retryAfterSeconds = err.retryAfter ?? 30;
        const nextRateLimitUntil = Date.now() + retryAfterSeconds * 1000;
        setRateLimitedUntil(nextRateLimitUntil);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            RATE_LIMIT_STORAGE_KEY,
            String(nextRateLimitUntil)
          );
        }
      }

      if (errorMessage.includes("Sua sessao expirou")) {
        setSessionExpired(true);
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartNewConversation() {
    if (!confirmDiscardDraft("iniciar uma nova conversa")) return;

    const shouldReset = window.confirm(
      "Deseja iniciar uma nova conversa? A conversa atual continuara salva no histórico."
    );

    if (!shouldReset) return;

    setError("");
    setResetting(true);
    setSessionExpired(false);

    try {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }

      setConversationId(null);
      setResponse(null);
      setProfileTriageFocus(null);
      setPendingProfileSuggestion("");
      setMessages([]);
      setUploadedDocuments([]);
      setUploadedDocumentOverrides({});
      setMessage("");
      toast.success("Nova conversa pronta.");
    } catch (err) {
      const rawErrorMessage =
        err instanceof Error ? err.message : "Erro ao preparar nova conversa.";
      const errorMessage = getFriendlyErrorMessage(rawErrorMessage);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setResetting(false);
    }
  }

  async function handleChangeActiveTaxYear(taxYear: string) {
    if (!canChangeKnowledgeBase) {
      toast.error("Somente contas admin podem trocar a base ativa.");
      return;
    }

    if (taxYear === activeTaxYear) {
      return;
    }

    const previousTaxYear = activeTaxYear;
    setActiveTaxYear(taxYear);
    setKnowledgeBaseSettingsLoading(true);

    try {
      const settings = await updateKnowledgeBaseSettings(taxYear);
      setActiveTaxYear(settings.active_tax_year);
      setAvailableTaxYears(
        settings.available_tax_years.length
          ? settings.available_tax_years
          : [settings.active_tax_year]
      );
      toast.success(`Base ativa ajustada para IRPF ${settings.active_tax_year}.`);
    } catch (err) {
      setActiveTaxYear(previousTaxYear);
      const rawErrorMessage =
        err instanceof Error ? err.message : "Nao foi possivel trocar o exercicio ativo.";
      const errorMessage = getFriendlyErrorMessage(rawErrorMessage);
      toast.error(errorMessage);
    } finally {
      setKnowledgeBaseSettingsLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const rateLimitRemainingSeconds = rateLimitedUntil
    ? Math.max(0, Math.ceil((rateLimitedUntil - now) / 1000))
    : 0;
  const rateLimitMessage =
    rateLimitRemainingSeconds > 0
      ? `${error || "O envio foi pausado temporariamente."} Tente novamente em ${formatRetryAfterLabel(rateLimitRemainingSeconds)}.`
      : "";
  const pageClassName = isDark
    ? "min-h-screen overflow-y-auto bg-[#111827] text-slate-100"
    : "min-h-screen overflow-y-auto bg-[#f5f5f7] text-slate-900";
  const loadingPageClassName =
    "flex min-h-screen items-center justify-center px-6 bg-[#111827] text-slate-100";
  const loadingCardClassName =
    "rounded-[1.75rem] border border-white/10 bg-slate-900/70 px-6 py-5 text-sm text-slate-300";
  const userInitials = getUserInitials(profileDetails, authUser?.name ?? null);
  const canViewUploads = canAccessTechnicalUploads(authUser?.role);
  const canChangeKnowledgeBase = canManageKnowledgeBase(authUser?.role);
  const canUploadDocuments = canUploadDocumentsForUser(authUser);
  const isLocalDevelopment =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  const devSwitchProfiles = isLocalDevelopment
    ? [
        {
          email: "usuario.free@declaria.local",
          name: "Usuario Free",
          label: "Free",
        },
        {
          email: "tecnico@declaria.local",
          name: "Time Tecnico",
          label: "Tecnico",
        },
        {
          email: "admin@declaria.local",
          name: "Administrador",
          label: "Admin",
        },
      ]
    : [];
  const isFreePlan = authUser?.plan === "free";
  const remainingChatInteractions =
    authUser?.usage?.chat_interactions_remaining ?? null;
  const contextualPrompts = getContextualPrompts(messages, response);
  const confidenceSummary = getConfidenceSummary(response);
  const responseOriginSummary = getResponseOriginSummary(response);
  const yearContextSummary = getYearContextSummary(response);
  const triageProgress = getTriageProgress(response);
  const profileContextHighlights = extractProfileContextHighlights(profileDetails);
  const structuredProfileSignals = extractStructuredProfileSignals(profileDetails);
  const hasSavedProfileContext =
    profileContextHighlights.length > 0 ||
    structuredProfileSignals.length > 0 ||
    Boolean(profileDetails.firstName.trim() || profileDetails.lastName.trim());
  const shouldShowProfileContext = hasSavedProfileContext && profileContextExpanded;
  const shouldShowTriageInsights =
    profilePreferences.showTriageInsights &&
    (response?.mode === "triage" ||
      response?.triage_active ||
      response?.triage_finished);
  const shouldExpandProfileContext = profileContextExpanded;
  const emptyStateHeadline = hasSavedProfileContext
    ? "Seu perfil ja ajuda a deixar a conversa mais objetiva."
    : "Posso ajudar com duvidas de imposto de renda e triagem guiada.";
  const emptyStateDescription = hasSavedProfileContext
    ? "Use uma sugestao abaixo, escreva sua pergunta em linguagem natural ou abra o contexto salvo quando quiser."
    : "Escolha um dos temas sugeridos ou escreva sua pergunta do seu jeito.";
  const emptyStatePopularPrompts = contextualPrompts.slice(0, 4);
  const emptyStateProfileShortcuts = structuredProfileSignals
    .slice(0, 3)
    .map((signal) => ({
      label: signal,
      prompt: buildProfileSignalPrompt(signal),
    }));
  const latestUploadGuidanceMessage = [...messages]
    .reverse()
    .find(
      (item) =>
        item.role === "assistant" &&
        !item.isStreaming &&
        (item.uploadAnalysis?.pending_questions?.length ?? 0) > 0
    );
  const activeUploadPendingQuestion =
    latestUploadGuidanceMessage?.uploadAnalysis?.pending_questions?.[0] ?? null;
  const remainingUploadPendingQuestions = Math.max(
    0,
    (latestUploadGuidanceMessage?.uploadAnalysis?.pending_questions?.length ?? 0) - 1
  );
  const activeUploadGuidanceLabel = latestUploadGuidanceMessage?.uploadAnalysis
    ? latestUploadGuidanceMessage.uploadAnalysis.document_count === 1
      ? latestUploadGuidanceMessage.uploadAnalysis.document_names?.[0] ||
        "1 arquivo em analise"
      : `${latestUploadGuidanceMessage.uploadAnalysis.document_count} arquivos em analise`
    : null;
  const activeUploadGuidedSheet =
    latestUploadGuidanceMessage?.uploadAnalysis?.sheet_draft?.[0]?.sheet ?? null;
  const guidedQuickReplies = getGuidedQuickReplies(
    activeUploadPendingQuestion,
    activeUploadGuidedSheet
  );
  const uploadedDocumentKindOptions = uploadedDocuments.reduce<Record<string, string[]>>(
    (accumulator, document) => {
      const options = getDocumentKindOptions(document);
      if (options.length) {
        accumulator[document.id] = options;
      }
      return accumulator;
    },
    {}
  );
  const composerPlaceholder = activeUploadPendingQuestion
    ? "Responda aqui para continuar a leitura do documento..."
    : `Pergunte sobre o IRPF ${activeTaxYear} ou peca uma triagem guiada...`;

  if (authLoading) {
    return (
      <main className={loadingPageClassName}>
        <div className={loadingCardClassName}>
          Validando sua autenticacao...
        </div>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className={loadingPageClassName}>
        <div className="max-w-md rounded-[1.75rem] border border-white/10 bg-slate-900/70 px-6 py-6 text-center shadow-[0_20px_60px_rgba(2,6,23,0.22)]">
          <div className="text-lg font-semibold text-white">Entre para usar o chat</div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Para conversar com a IA, acompanhar documentos e respeitar os limites do seu plano, precisamos identificar sua conta.
          </p>
          <div className="mt-5 flex justify-center">
            <a
              href={getLoginUrl(`${window.location.origin}/chat`)}
              className="inline-flex rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:brightness-110"
            >
              Entrar agora
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={pageClassName}>
      <div className="fixed bottom-24 right-4 z-30 lg:hidden">
        <ProfileMenu
          email={authUser?.email ?? null}
          name={authUser?.name ?? null}
          provider={authUser?.provider ?? null}
          role={authUser?.role ?? "user"}
          plan={authUser?.plan ?? "free"}
          usage={authUser?.usage ?? null}
          isDark={isDark}
          menuPlacement="up"
          profileDetails={profileDetails}
          preferences={profilePreferences}
          activeTaxYear={activeTaxYear}
          availableTaxYears={availableTaxYears}
          canManageKnowledgeBase={canChangeKnowledgeBase}
          knowledgeBaseSettingsLoading={knowledgeBaseSettingsLoading}
          devSwitchProfiles={devSwitchProfiles}
          switchingDevProfileEmail={switchingDevProfileEmail}
          onSwitchDevProfile={handleSwitchDevProfile}
          onChangeActiveTaxYear={handleChangeActiveTaxYear}
          onUpdateProfileDetails={(updates) =>
            setProfileDetails((current) => ({
              ...current,
              ...updates,
            }))
          }
          onUpdatePreferences={(updates) =>
            setProfilePreferences((current) => ({
              ...current,
              ...updates,
            }))
          }
          onLogout={handleLogout}
        />
      </div>

      <MobileDrawer
        historyItems={historyItems}
        activeHistoryId={conversationId}
        highlightedHistoryId={highlightedHistoryId}
        onNewConversation={handleStartNewConversation}
        onSelectHistory={handleSelectHistory}
        onRenameHistory={handleRenameHistory}
        onDeleteHistory={handleDeleteHistory}
        showHistoryBadges={profilePreferences.showHistoryBadges}
        historyCardDensity={profilePreferences.historyCardDensity}
        onChangeHistoryCardDensity={(density: HistoryCardDensity) =>
          setProfilePreferences((current) => ({
            ...current,
            historyCardDensity: density,
          }))
        }
        isDark={isDark}
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      <section className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1600px] flex-col gap-3 px-3 py-3 sm:min-h-[calc(100vh-2rem)] sm:px-4 sm:py-4 lg:px-5 lg:py-4 xl:px-6">
        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[285px_minmax(0,1fr)] xl:items-start">
          <SidebarPanels
            historyItems={historyItems}
            activeHistoryId={conversationId}
            highlightedHistoryId={highlightedHistoryId}
            onNewConversation={handleStartNewConversation}
            onSelectHistory={handleSelectHistory}
            onRenameHistory={handleRenameHistory}
            onDeleteHistory={handleDeleteHistory}
            showHistoryBadges={profilePreferences.showHistoryBadges}
            historyCardDensity={profilePreferences.historyCardDensity}
            onChangeHistoryCardDensity={(density: HistoryCardDensity) =>
              setProfilePreferences((current) => ({
                ...current,
                historyCardDensity: density,
              }))
            }
            isDark={isDark}
            triageProfile={response?.triage_profile}
            activeTaxYear={activeTaxYear}
          />

          <div
            className={`flex min-h-0 flex-col overflow-hidden rounded-[1.6rem] border shadow-[0_18px_46px_rgba(15,23,42,0.10)] ${isDark ? "border-white/10 bg-[#111827]" : "border-slate-200 bg-white"
              }`}
          >
            <div
              className={`border-b px-5 py-3.5 lg:px-6 xl:px-8 ${isDark ? "border-white/10 bg-slate-950/40" : "border-slate-200 bg-white"
                }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1
                    className={`text-[1.7rem] font-semibold tracking-tight lg:text-[2rem] ${isDark ? "text-white" : "text-slate-900"
                      }`}
                  >
                    DeclarIA
                  </h1>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {authUser ? (
                      isFreePlan ? (
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                            isDark
                              ? "border-amber-300/20 bg-amber-500/10 text-amber-100"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                          title="Disponivel no plano Premium"
                        >
                          Meus documentos · Premium
                        </span>
                      ) : (
                        <Link
                          href="/documentos"
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium transition hover:-translate-y-0.5 ${
                            isDark
                              ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                          }`}
                        >
                          Meus documentos
                        </Link>
                      )
                    ) : null}
                    {isFreePlan ? (
                      <Link
                        href="/upgrade"
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium transition hover:-translate-y-0.5 ${
                          isDark
                            ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-white"
                        }`}
                      >
                        Upgrade de plano
                        {typeof remainingChatInteractions === "number"
                          ? ` · ${remainingChatInteractions} restantes`
                          : ""}
                      </Link>
                    ) : null}
                    {canViewUploads ? (
                    <Link
                      href="/uploads"
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium transition hover:-translate-y-0.5 ${isDark
                          ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                        }`}
                    >
                      Ver uploads e extrações
                    </Link>
                    ) : null}
                  </div>
                </div>

                <div className="hidden lg:block">
                  <ProfileMenu
                    email={authUser?.email ?? null}
                    name={authUser?.name ?? null}
                    provider={authUser?.provider ?? null}
                    role={authUser?.role ?? "user"}
                    plan={authUser?.plan ?? "free"}
                    usage={authUser?.usage ?? null}
                    isDark={isDark}
                    menuPlacement="down"
                    profileDetails={profileDetails}
                    preferences={profilePreferences}
                    activeTaxYear={activeTaxYear}
                    availableTaxYears={availableTaxYears}
                    canManageKnowledgeBase={canChangeKnowledgeBase}
                    knowledgeBaseSettingsLoading={knowledgeBaseSettingsLoading}
                    devSwitchProfiles={devSwitchProfiles}
                    switchingDevProfileEmail={switchingDevProfileEmail}
                    onSwitchDevProfile={handleSwitchDevProfile}
                    onChangeActiveTaxYear={handleChangeActiveTaxYear}
                    onUpdateProfileDetails={(updates) =>
                      setProfileDetails((current) => ({
                        ...current,
                        ...updates,
                      }))
                    }
                    onUpdatePreferences={(updates) =>
                      setProfilePreferences((current) => ({
                        ...current,
                        ...updates,
                      }))
                    }
                    onLogout={handleLogout}
                  />
                </div>
              </div>
            </div>

            <div
              className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${isDark
                  ? "bg-[linear-gradient(180deg,rgba(15,23,42,0.65),rgba(15,23,42,0.92))]"
                  : "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))]"
                }`}
            >
              <div
                className={`flex items-center justify-between gap-3 border-b px-5 py-3 lg:px-6 xl:px-8 ${isDark ? "border-white/10" : "border-slate-200"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(true)}
                    className={`inline-flex rounded-2xl border p-2 transition xl:hidden ${isDark
                        ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    aria-label="Abrir Histórico"
                  >
                    <Menu size={18} />
                  </button>

                </div>

              </div>

              {sessionExpired && (
                <div
                  className={`border-b px-5 py-4 text-sm ${isDark
                      ? "border-amber-400/15 bg-amber-500/10 text-amber-100"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Sua sessao expirou por seguranca. Entre novamente para continuar.
                    </span>
                    <button
                      type="button"
                      onClick={handleReauthenticate}
                      className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition hover:-translate-y-0.5 ${isDark
                          ? "border-amber-300/25 bg-amber-400/10 text-amber-50 hover:bg-amber-400/15"
                          : "border-amber-300 bg-white text-amber-900 hover:bg-amber-100/70"
                        }`}
                    >
                      Entrar novamente
                    </button>
                  </div>
                </div>
              )}

              {shouldShowTriageInsights && (
                <div
                  className={`grid gap-3 border-b px-5 py-3 lg:px-6 xl:px-8 ${yearContextSummary ? "md:grid-cols-3" : "md:grid-cols-2"} ${isDark ? "border-white/10" : "border-slate-200"
                    }`}
                >
                  <div
                    className={`rounded-[1.25rem] border px-4 py-3 ${confidenceSummary.tone === "strong"
                        ? isDark
                          ? "border-white/10 bg-white/[0.04]"
                          : "border-slate-200 bg-slate-50"
                        : confidenceSummary.tone === "moderate"
                          ? isDark
                            ? "border-white/10 bg-white/[0.04]"
                            : "border-slate-200 bg-slate-50"
                          : confidenceSummary.tone === "limited"
                            ? isDark
                              ? "border-white/10 bg-white/[0.04]"
                              : "border-slate-200 bg-slate-50"
                            : isDark
                              ? "border-white/10 bg-white/[0.04]"
                              : "border-slate-200 bg-slate-50"
                      }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                      >
                        Confianca da resposta
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${responseOriginSummary.tone === "web"
                            ? isDark
                              ? "border-sky-400/20 bg-sky-500/10 text-sky-200"
                              : "border-sky-200 bg-sky-50 text-sky-700"
                            : responseOriginSummary.tone === "mcp"
                              ? isDark
                                ? "border-violet-400/20 bg-violet-500/10 text-violet-200"
                                : "border-violet-200 bg-violet-50 text-violet-700"
                              : responseOriginSummary.tone === "limited"
                                ? isDark
                                  ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                                : isDark
                                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                      >
                        {responseOriginSummary.label}
                      </span>
                    </div>
                    <div
                      className={`mt-2 text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"
                        }`}
                    >
                      {confidenceSummary.label}
                    </div>
                    <p
                      className={`mt-1 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"
                        }`}
                    >
                      {confidenceSummary.description}
                    </p>
                    <div
                      className={`mt-3 text-xs ${isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                    >
                      {responseOriginSummary.description}
                    </div>
                    <div
                      className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                    >
                      {response?.triage_finished
                        ? "A triagem ja reuniu informacoes suficientes para orientar."
                        : "Esse indicador evolui conforme voce responde os temas principais."}
                    </div>
                  </div>

                  <div
                    className={`rounded-[1.25rem] border px-4 py-3 ${isDark
                        ? "border-white/10 bg-white/[0.04]"
                        : "border-slate-200 bg-slate-50"
                      }`}
                  >
                    <div
                      className={`flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                    >
                      <span>Progresso da triagem</span>
                      <span>{triageProgress.percentage}%</span>
                    </div>
                    <div
                      className={`mt-2 text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"
                        }`}
                    >
                      {triageProgress.label}
                    </div>
                    <p
                      className={`mt-1 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"
                        }`}
                    >
                      {triageProgress.description}
                    </p>
                    <div
                      className={`mt-3 h-2 rounded-full ${isDark ? "bg-slate-800" : "bg-slate-200"
                        }`}
                    >
                      <div
                        className={`h-2 rounded-full transition-[width] duration-300 ${isDark ? "bg-emerald-400" : "bg-emerald-500"
                          }`}
                        style={{ width: `${triageProgress.percentage}%` }}
                      />
                    </div>
                    {triageProgress.mappedFieldLabels.length > 0 && (
                      <div className="mt-3">
                        <div
                          className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"
                            }`}
                        >
                          Ja mapeado
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {triageProgress.mappedFieldLabels.slice(0, 4).map((field) => (
                            <span
                              key={`mapped-${field}`}
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${isDark
                                  ? "border-white/10 bg-white/[0.04] text-slate-200"
                                  : "border-slate-200 bg-white text-slate-700"
                                }`}
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {triageProgress.missingFieldLabels.length > 0 && (
                      <div className="mt-3">
                        <div
                          className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"
                            }`}
                        >
                          Ainda ajuda responder
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {triageProgress.missingFieldLabels.slice(0, 4).map((field) => (
                            <span
                              key={`missing-${field}`}
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${isDark
                                  ? "border-white/10 bg-white/[0.04] text-slate-200"
                                  : "border-slate-200 bg-white text-slate-700"
                                }`}
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {yearContextSummary ? (
                    <div
                      className={`rounded-[1.25rem] border px-4 py-3 ${
                        yearContextSummary.tone === "warning"
                          ? isDark
                            ? "border-amber-400/20 bg-amber-500/10"
                            : "border-amber-200 bg-amber-50"
                          : isDark
                            ? "border-sky-400/20 bg-sky-500/10"
                            : "border-sky-200 bg-sky-50"
                      }`}
                    >
                      <div
                        className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                          yearContextSummary.tone === "warning"
                            ? isDark
                              ? "text-amber-200/80"
                              : "text-amber-700"
                            : isDark
                              ? "text-sky-200/80"
                              : "text-sky-700"
                        }`}
                      >
                        {yearContextSummary.label}
                      </div>
                      <p
                        className={`mt-2 text-sm leading-6 ${
                          yearContextSummary.tone === "warning"
                            ? isDark
                              ? "text-amber-50"
                              : "text-amber-900"
                            : isDark
                              ? "text-sky-50"
                              : "text-sky-900"
                        }`}
                      >
                        {yearContextSummary.description}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {pendingProfileSuggestion && (
                <div
                  className={`border-b px-5 py-4 lg:px-6 xl:px-8 ${isDark ? "border-white/10" : "border-slate-200"
                    }`}
                >
                  <div
                    className={`rounded-2xl border px-4 py-3 ${isDark
                        ? "border-white/10 bg-white/[0.04]"
                        : "border-slate-200 bg-slate-50"
                      }`}
                  >
                    <div className="flex flex-col gap-3">
                      <div>
                        <div
                          className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-sky-200/80" : "text-sky-700"
                            }`}
                        >
                          Sugestao para o perfil
                        </div>
                        <p
                          className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-200" : "text-slate-700"
                            }`}
                        >
                          Detectei um contexto que pode acelerar sua proxima triagem. Revise
                          abaixo e salve so se estiver correto.
                        </p>
                      </div>

                      <textarea
                        value={pendingProfileSuggestion}
                        onChange={(event) =>
                          setPendingProfileSuggestion(event.target.value)
                        }
                        rows={3}
                        className={`w-full resize-none rounded-2xl border px-3 py-2.5 text-sm outline-none transition ${isDark
                            ? "border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-sky-400/30"
                            : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-sky-300"
                          }`}
                      />

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const nextNote = mergeProfileNote(
                              profileDetails.taxProfileNote,
                              pendingProfileSuggestion
                            );
                            setProfileDetails((current) => ({
                              ...current,
                              taxProfileNote: nextNote,
                            }));
                            setPendingProfileSuggestion("");
                            toast.success("Perfil atualizado com a sugestao confirmada.");
                          }}
                          className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition hover:-translate-y-0.5 ${isDark
                              ? "border-sky-300/20 bg-sky-400/10 text-sky-100 hover:bg-sky-400/15"
                              : "border-sky-200 bg-white text-sky-800 hover:bg-sky-100/70"
                            }`}
                        >
                          Salvar no perfil
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingProfileSuggestion("")}
                          className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition hover:-translate-y-0.5 ${isDark
                              ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100/80"
                            }`}
                        >
                          Nao agora
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {shouldShowProfileContext ? (
                <div
                  className={`border-b px-5 py-4 lg:px-6 xl:px-8 ${isDark ? "border-white/10" : "border-slate-200"
                    }`}
                >
                  <div
                    className={`rounded-[1.6rem] border px-4 py-3 ${isDark
                        ? "border-white/10 bg-white/[0.03]"
                        : "border-slate-200 bg-slate-50"
                      }`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div
                          className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-slate-400" : "text-slate-500"
                            }`}
                        >
                          Contexto do perfil
                        </div>
                        <p
                          className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-200" : "text-slate-700"
                            }`}
                        >
                          {shouldExpandProfileContext
                            ? "Suas proximas triagens podem considerar o perfil salvo para reduzir repeticoes e acelerar a orientacao."
                            : "Seu perfil ja tem contexto salvo e pode acelerar a triagem quando voce quiser."}
                        </p>
                        {profileTriageFocus && response?.triage_active && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${isDark
                                  ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                                  : "border-emerald-200 bg-white text-emerald-700"
                                }`}
                            >
                              Foco atual: {profileTriageFocus}
                            </span>
                            <button
                              type="button"
                              onClick={() => setProfileTriageFocus(null)}
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs transition hover:-translate-y-0.5 ${isDark
                                  ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100/80"
                                }`}
                            >
                              Limpar foco
                            </button>
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(shouldExpandProfileContext
                            ? structuredProfileSignals
                            : structuredProfileSignals.slice(0, 3)
                          ).map((item) => (
                            <button
                              key={`signal-${item}`}
                              type="button"
                              onClick={() => handleSend(buildProfileSignalPrompt(item))}
                              disabled={loading || resetting || authLoading}
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${isDark
                                  ? "border-violet-300/20 bg-violet-400/10 text-violet-100 hover:bg-violet-400/15"
                                  : "border-violet-200 bg-white text-violet-700 hover:bg-violet-100/80"
                                }`}
                              title={`Iniciar triagem focando em ${item}`}
                            >
                              {item}
                            </button>
                          ))}
                          {!shouldExpandProfileContext &&
                            structuredProfileSignals.length > 3 && (
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${isDark
                                    ? "border-violet-300/20 bg-white/[0.04] text-violet-100"
                                    : "border-violet-200 bg-white text-violet-700"
                                  }`}
                              >
                                +{structuredProfileSignals.length - 3}
                              </span>
                            )}
                        </div>
                        {shouldExpandProfileContext &&
                          profileContextHighlights.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {profileContextHighlights.map((item) => (
                                <span
                                  key={item}
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${isDark
                                      ? "border-violet-300/20 bg-white/[0.04] text-violet-100"
                                      : "border-violet-200 bg-white text-violet-700"
                                    }`}
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>

                      <div className="flex flex-wrap items-start justify-end gap-2">
                        {!response?.triage_active && shouldExpandProfileContext && (
                          <button
                            type="button"
                            onClick={() => setProfileContextExpanded(false)}
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition hover:-translate-y-0.5 ${isDark
                                ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                              }`}
                            aria-label="Fechar contexto do perfil"
                            title="Fechar contexto do perfil"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className={`min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain scroll-smooth px-4 py-5 sm:px-5 sm:py-6 lg:px-6 xl:px-8 ${isDark
                    ? "bg-[linear-gradient(180deg,rgba(15,23,42,0.14),rgba(2,6,23,0.05))]"
                    : "bg-[linear-gradient(180deg,rgba(248,250,252,0.5),rgba(241,245,249,0.35))]"
                  }`}
              >
                {messages.length === 0 ? (
                  <div className="mx-auto flex min-h-[360px] w-full max-w-4xl items-center justify-center">
                    <div
                      className={`w-full rounded-[1.75rem] border px-6 py-8 ${isDark
                          ? "border-white/10 bg-white/[0.03]"
                          : "border-slate-200 bg-white"
                        }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${isDark
                              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                        >
                          Base ativa IRPF {activeTaxYear}
                        </span>
                        {hasSavedProfileContext ? (
                          <button
                            type="button"
                            onClick={() => setProfileContextExpanded(true)}
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium transition hover:-translate-y-0.5 ${isDark
                                ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                              }`}
                          >
                            Mostrar contexto do perfil
                          </button>
                        ) : null}
                      </div>
                      <h2
                        className={`mt-5 text-2xl font-semibold tracking-tight sm:text-3xl ${isDark ? "text-white" : "text-slate-900"
                          }`}
                      >
                        {emptyStateHeadline}
                      </h2>
                      <span
                        className={`mt-3 block max-w-2xl text-sm leading-7 ${isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                      >
                        {emptyStateDescription}
                      </span>
                      <div className="mt-8">
                        <div className={`text-left text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          Consultas populares
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {emptyStatePopularPrompts.map((prompt) => (
                            <button
                              key={`empty-${prompt}`}
                              type="button"
                              onClick={() => handleSend(prompt)}
                              disabled={
                                loading ||
                                resetting ||
                                authLoading ||
                                rateLimitRemainingSeconds > 0
                              }
                              className={`rounded-[1.25rem] border px-4 py-3 text-left text-sm transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/30 disabled:cursor-not-allowed disabled:opacity-50 ${isDark
                                  ? "border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.08]"
                                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                                }`}
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
                        <div>
                          <div className={`text-left text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            Temas frequentes no IRPF {activeTaxYear}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {FEATURED_TOPIC_PROMPTS.map((item) => (
                              <button
                                key={`featured-${item.label}`}
                                type="button"
                                onClick={() => handleSend(item.prompt)}
                                disabled={
                                  loading ||
                                  resetting ||
                                  authLoading ||
                                  rateLimitRemainingSeconds > 0
                                }
                                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${isDark
                                    ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                                  }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {emptyStateProfileShortcuts.length > 0 ? (
                          <div>
                            <div className={`text-left text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                              Atalhos do seu perfil
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {emptyStateProfileShortcuts.map((item) => (
                                <button
                                  key={`profile-${item.label}`}
                                  type="button"
                                  onClick={() => handleSend(item.prompt)}
                                  disabled={
                                    loading ||
                                    resetting ||
                                    authLoading ||
                                    rateLimitRemainingSeconds > 0
                                  }
                                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${isDark
                                      ? "border-violet-300/20 bg-violet-400/10 text-violet-100 hover:bg-violet-400/15"
                                      : "border-violet-200 bg-white text-violet-700 hover:bg-violet-100/80"
                                    }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className={`text-left text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                              Como prefiro te ajudar
                            </div>
                            <div
                              className={`mt-3 rounded-[1.25rem] border px-4 py-3 text-left text-sm leading-6 ${isDark
                                  ? "border-white/10 bg-white/[0.03] text-slate-300"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                                }`}
                            >
                              Posso responder uma duvida direta, montar um checklist ou conduzir uma triagem guiada quando fizer sentido.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isDark={isDark}
                      userAvatarDataUrl={profileDetails.avatarDataUrl || null}
                      userInitials={userInitials}
                      copiedId={copiedId}
                      formatTime={formatTime}
                      onCopyText={copyText}
                      onCopyChecklist={handleCopyChecklist}
                      onPromptAction={handleSend}
                      onWebSourceFeedback={handleWebSourceFeedback}
                      webFeedbackLoadingId={webFeedbackLoadingId}
                    />
                  ))
                )}

                {loading && <LoadingMessage isDark={isDark} />}

                <div ref={messagesEndRef} />
              </div>

              {showScrollToBottom && messages.length > 0 && (
                <div className="pointer-events-none absolute bottom-36 left-1/2 z-10 -translate-x-1/2 sm:bottom-32">
                  <button
                    type="button"
                    onClick={scrollToBottom}
                    className={`pointer-events-auto rounded-full border px-4 py-2 text-sm font-medium shadow-lg transition hover:-translate-y-0.5 hover:scale-[1.01] ${isDark
                        ? "border-white/10 bg-slate-950/90 text-slate-200 shadow-black/30 hover:bg-slate-900"
                        : "border-slate-200 bg-white/95 text-slate-700 shadow-slate-200/80 hover:bg-white"
                      }`}
                  >
                    ↓ Novas mensagens
                  </button>
                </div>
              )}

              {documentReviewBanner ? (
                <div
                  className={`mx-4 mb-3 rounded-[1.1rem] border px-4 py-3 text-sm sm:mx-6 ${
                    isDark
                      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border border-current/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]">
                      Documento em foco
                    </span>
                    {documentReviewLabel ? (
                      <span className="inline-flex rounded-full border border-current/20 px-2.5 py-1 text-xs font-medium">
                        {documentReviewLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2">{documentReviewBanner}</div>
                </div>
              ) : null}

              <ChatComposer
                message={message}
                isDark={isDark}
                loading={loading}
                resetting={resetting}
                error={rateLimitRemainingSeconds > 0 ? "" : error}
                rateLimitMessage={rateLimitMessage}
                rateLimitRemainingSeconds={rateLimitRemainingSeconds}
                maxMessageLength={MAX_MESSAGE_LENGTH}
                placeholder={composerPlaceholder}
                uploadedDocuments={uploadedDocuments}
                uploadedDocumentOverrides={uploadedDocumentOverrides}
                uploadedDocumentKindOptions={uploadedDocumentKindOptions}
                uploadingDocument={uploadingDocument}
                  activeGuidedQuestion={activeUploadPendingQuestion}
                  guidedDocumentLabel={activeUploadGuidanceLabel}
                  guidedSheetLabel={activeUploadGuidedSheet}
                  remainingGuidedQuestions={remainingUploadPendingQuestions}
                  guidedQuickReplies={guidedQuickReplies}
                onChange={(value) => {
                  if (value.length <= MAX_MESSAGE_LENGTH) {
                    setMessage(value);
                  }
                }}
                onKeyDown={handleKeyDown}
                onSend={() => handleSend()}
                onQuickReply={(reply) =>
                  handleSend(
                    buildGuidedReplyMessage(
                      reply,
                      activeUploadPendingQuestion,
                      activeUploadGuidedSheet
                    )
                  )
                }
                canUploadDocuments={canUploadDocuments}
                uploadBlockedMessage={
                  isFreePlan
                    ? "Upload liberado apenas no plano Premium."
                    : "Entre na sua conta para enviar documentos."
                }
                onPickDocument={handlePickDocument}
                onRemoveUploadedDocument={handleRemoveUploadedDocument}
                onConfirmUploadedDocumentKind={handleConfirmUploadedDocumentKind}
                textareaRef={textareaRef}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
