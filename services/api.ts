import {
  AdminCreateUserRequest,
  AdminAuditListResponse,
  AdminUpdateUserRequest,
  AdminUserListResponse,
  AuthStatusResponse,
  BillingAdminSummary,
  BillingCheckoutResponse,
  BillingDevCheckoutResponse,
  BillingProviderUpdateResponse,
  BillingSubscriptionSyncRequest,
  BillingSubscriptionSyncResponse,
  BillingSummary,
  ChatRequest,
  ChatResponse,
  ConversationDetail,
  ConversationSummary,
  DeclarationDraftDECPreview,
  DeclarationDraftDECCandidate,
  DeclarationDraft,
  DeclarationDraftExportPackage,
  DeclarationDraftItem,
  DevLoginRequest,
  KnowledgeBaseSettingsResponse,
  UpdateUserProfileRequest,
  UploadInsightsResponse,
  UploadRecordDetail,
  UploadRecordListResponse,
  UploadedDocument,
  UserProfileResponse,
  WebSearchFeedbackRequest,
  WebSearchResult,
  WebSearchResultCreateRequest,
} from "@/types/chat";

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8000"
).replace(/\/+$/, "");

function getCookieValue(name: string) {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const cookies = document.cookie.split(";").map((item) => item.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.slice(prefix.length));
    }
  }
  return null;
}

export function getSourceDocumentUrl(path: string, taxYear?: string | null) {
  const params = new URLSearchParams({
    path,
  });
  if (taxYear) {
    params.set("tax_year", taxYear);
  }
  return `${BASE_URL}/sources/raw?${params.toString()}`;
}

export class ApiError extends Error {
  status: number;
  retryAfter: number | null;

  constructor(message: string, status: number, retryAfter: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function getRetryAfterSeconds(res: Response) {
  const retryAfterHeader = res.headers.get("Retry-After");
  if (!retryAfterHeader) return null;

  const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);
  return Number.isNaN(retryAfterSeconds) ? null : retryAfterSeconds;
}

async function parseError(res: Response) {
  const errorData = await res.json().catch(() => null);
  return new ApiError(
    errorData?.detail || "Erro ao chamar API",
    res.status,
    getRetryAfterSeconds(res)
  );
}

async function apiFetch(path: string, init?: RequestInit) {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const method = (init?.method || "GET").toUpperCase();
  const csrfToken =
    method === "GET" || method === "HEAD" || method === "OPTIONS"
      ? null
      : getCookieValue("declaria_csrf");
  let res: Response;

  try {
    res = await fetch(`${BASE_URL}${path}`, {
      credentials: "include",
      ...init,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        ...(init?.headers || {}),
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(
        "Nao foi possivel conectar ao backend. Verifique se ele esta ativo e tente novamente.",
        0,
        null
      );
    }
    throw error;
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  return res;
}

export async function sendMessage(
  payload: ChatRequest,
  options?: { signal?: AbortSignal }
): Promise<ChatResponse> {
  const res = await apiFetch("/chat", {
    method: "POST",
    body: JSON.stringify(payload),
    signal: options?.signal,
  });

  return res.json();
}

export async function uploadDocument(file: File): Promise<UploadedDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiFetch("/uploads", {
    method: "POST",
    body: formData,
  });

  return res.json();
}

export async function listUploads(
  limit = 20,
  filters?: { status?: string; documentKind?: string; baseYear?: string }
): Promise<UploadRecordListResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (filters?.status) params.set("status", filters.status);
  if (filters?.documentKind) params.set("document_kind", filters.documentKind);
  if (filters?.baseYear) params.set("base_year", filters.baseYear);

  const res = await apiFetch(`/uploads?${params.toString()}`, {
    method: "GET",
  });

  return res.json();
}

export async function listMyUploads(limit = 20): Promise<UploadRecordListResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await apiFetch(`/uploads/mine?${params.toString()}`, {
    method: "GET",
  });

  return res.json();
}

export async function getMyUploadDetail(uploadId: string): Promise<UploadRecordDetail> {
  const res = await apiFetch(`/uploads/mine/${uploadId}`, {
    method: "GET",
  });

  return res.json();
}

export async function getCurrentDeclarationDraft(
  taxYear?: string | null
): Promise<DeclarationDraft> {
  const params = new URLSearchParams();
  if (taxYear?.trim()) {
    params.set("tax_year", taxYear.trim());
  }
  const query = params.toString();
  const res = await apiFetch(
    `/declarations/current${query ? `?${query}` : ""}`,
    {
      method: "GET",
    }
  );

  return res.json();
}

export async function rebuildCurrentDeclarationDraft(
  taxYear?: string | null
): Promise<DeclarationDraft> {
  const params = new URLSearchParams();
  if (taxYear?.trim()) {
    params.set("tax_year", taxYear.trim());
  }
  const query = params.toString();
  const res = await apiFetch(
    `/declarations/current/rebuild${query ? `?${query}` : ""}`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );

  return res.json();
}

export async function updateDeclarationDraftItemReview(
  itemId: string,
  payload: {
    user_review_status?: string | null;
    user_review_note?: string | null;
  }
): Promise<DeclarationDraftItem> {
  const res = await apiFetch(`/declarations/current/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function updateDeclarationDraftSheetReview(payload: {
  sheet_label: string;
  user_review_status?: string | null;
  user_review_note?: string | null;
}): Promise<DeclarationDraft["sheet_reviews"][number]> {
  const res = await apiFetch("/declarations/current/sheets/review", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function updateDeclarationDraftFinalReview(
  payload: {
    user_filing_status?: string | null;
    user_filing_note?: string | null;
  },
  taxYear?: string | null
): Promise<DeclarationDraft["final_review"]> {
  const params = new URLSearchParams();
  if (taxYear?.trim()) {
    params.set("tax_year", taxYear.trim());
  }
  const query = params.toString();
  const res = await apiFetch(
    `/declarations/current/final-review${query ? `?${query}` : ""}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );

  return res.json();
}

export async function getDeclarationExportPackage(
  taxYear?: string | null
): Promise<DeclarationDraftExportPackage> {
  const params = new URLSearchParams();
  if (taxYear?.trim()) {
    params.set("tax_year", taxYear.trim());
  }
  const query = params.toString();
  const res = await apiFetch(
    `/declarations/current/export-package${query ? `?${query}` : ""}`,
    {
      method: "GET",
    }
  );

  return res.json();
}

export function getDeclarationExportDownloadUrl(taxYear?: string | null) {
  const params = new URLSearchParams();
  if (taxYear?.trim()) {
    params.set("tax_year", taxYear.trim());
  }
  const query = params.toString();
  return `${BASE_URL}/declarations/current/export-package/download${
    query ? `?${query}` : ""
  }`;
}

export function getDeclarationFinalReportDownloadUrl(taxYear?: string | null) {
  const params = new URLSearchParams();
  if (taxYear?.trim()) {
    params.set("tax_year", taxYear.trim());
  }
  const query = params.toString();
  return `${BASE_URL}/declarations/current/final-report/download${
    query ? `?${query}` : ""
  }`;
}

export function getDeclarationDECCandidateDownloadUrl(taxYear?: string | null) {
  const params = new URLSearchParams();
  if (taxYear?.trim()) {
    params.set("tax_year", taxYear.trim());
  }
  const query = params.toString();
  return `${BASE_URL}/declarations/current/adapters/dec-candidate/download${
    query ? `?${query}` : ""
  }`;
}

export async function getDeclarationDECPreview(
  taxYear?: string | null
): Promise<DeclarationDraftDECPreview> {
  const params = new URLSearchParams();
  if (taxYear?.trim()) {
    params.set("tax_year", taxYear.trim());
  }
  const query = params.toString();
  const res = await apiFetch(
    `/declarations/current/adapters/dec-preview${query ? `?${query}` : ""}`,
    {
      method: "GET",
    }
  );

  return res.json();
}

export async function getDeclarationDECCandidate(
  taxYear?: string | null
): Promise<DeclarationDraftDECCandidate> {
  const params = new URLSearchParams();
  if (taxYear?.trim()) {
    params.set("tax_year", taxYear.trim());
  }
  const query = params.toString();
  const res = await apiFetch(
    `/declarations/current/adapters/dec-candidate${query ? `?${query}` : ""}`,
    {
      method: "GET",
    }
  );

  return res.json();
}

export async function getUploadDetail(uploadId: string): Promise<UploadRecordDetail> {
  const res = await apiFetch(`/uploads/${uploadId}`, {
    method: "GET",
  });

  return res.json();
}

export async function getUploadInsights(
  filters?: { status?: string; documentKind?: string; baseYear?: string }
): Promise<UploadInsightsResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.documentKind) params.set("document_kind", filters.documentKind);
  if (filters?.baseYear) params.set("base_year", filters.baseYear);

  const query = params.toString();
  const res = await apiFetch(`/uploads/insights${query ? `?${query}` : ""}`, {
    method: "GET",
  });

  return res.json();
}

export async function resetSession(sessionId: string): Promise<void> {
  await apiFetch(`/chat/session/${sessionId}`, {
    method: "DELETE",
  });
}

export async function getAuthStatus(): Promise<AuthStatusResponse> {
  const res = await apiFetch("/auth/me", {
    method: "GET",
  });

  return res.json();
}

export async function getBillingSummary(): Promise<BillingSummary> {
  const res = await apiFetch("/billing/summary", {
    method: "GET",
  });

  return res.json();
}

export async function startBillingCheckout(): Promise<BillingCheckoutResponse> {
  const res = await apiFetch("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({}),
  });

  return res.json();
}

export async function completeDevBillingCheckout(): Promise<BillingDevCheckoutResponse> {
  const res = await apiFetch("/billing/dev-complete-checkout", {
    method: "POST",
    body: JSON.stringify({}),
  });

  return res.json();
}

export async function syncBillingSubscription(
  payload: BillingSubscriptionSyncRequest
): Promise<BillingSubscriptionSyncResponse> {
  const res = await apiFetch("/billing/sync-subscription", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function getBillingAdminSummary(): Promise<BillingAdminSummary> {
  const res = await apiFetch("/billing/admin-summary", {
    method: "GET",
  });

  return res.json();
}

export async function updateBillingProvider(
  provider: string
): Promise<BillingProviderUpdateResponse> {
  const res = await apiFetch("/billing/provider", {
    method: "PATCH",
    body: JSON.stringify({ provider }),
  });

  return res.json();
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", {
    method: "POST",
  });
}

export async function devLogin(payload: DevLoginRequest): Promise<AuthStatusResponse> {
  const res = await apiFetch("/auth/dev-login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function getUserProfile(): Promise<UserProfileResponse> {
  const res = await apiFetch("/auth/profile", {
    method: "GET",
  });

  return res.json();
}

export async function updateUserProfile(
  payload: UpdateUserProfileRequest
): Promise<UserProfileResponse> {
  const res = await apiFetch("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return res.json();
}

export function getLoginUrl(nextUrl?: string) {
  const params = new URLSearchParams();
  if (nextUrl) {
    params.set("next", nextUrl);
  }

  const query = params.toString();
  return `${BASE_URL}/auth/login${query ? `?${query}` : ""}`;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const res = await apiFetch("/conversations", {
    method: "GET",
  });

  return res.json();
}

export async function getConversation(
  conversationId: string
): Promise<ConversationDetail> {
  const res = await apiFetch(`/conversations/${conversationId}`, {
    method: "GET",
  });

  return res.json();
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await apiFetch(`/conversations/${conversationId}`, {
    method: "DELETE",
  });
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<ConversationSummary> {
  const res = await apiFetch(`/conversations/${conversationId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });

  return res.json();
}

export async function createWebSearchResult(
  payload: WebSearchResultCreateRequest
): Promise<WebSearchResult> {
  const res = await apiFetch("/web-sources", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function submitWebSearchFeedback(
  resultId: string,
  payload: WebSearchFeedbackRequest
): Promise<WebSearchResult> {
  const res = await apiFetch(`/web-sources/${resultId}/feedback`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function getKnowledgeBaseSettings(): Promise<KnowledgeBaseSettingsResponse> {
  const res = await apiFetch("/sources/settings", {
    method: "GET",
  });

  return res.json();
}

export async function updateKnowledgeBaseSettings(
  taxYear: string
): Promise<KnowledgeBaseSettingsResponse> {
  const res = await apiFetch("/sources/settings", {
    method: "PATCH",
    body: JSON.stringify({ tax_year: taxYear }),
  });

  return res.json();
}

export async function listAdminUsers(query?: string): Promise<AdminUserListResponse> {
  const params = new URLSearchParams();
  if (query?.trim()) {
    params.set("query", query.trim());
  }

  const res = await apiFetch(`/admin/users${params.toString() ? `?${params.toString()}` : ""}`, {
    method: "GET",
  });

  return res.json();
}

export async function createAdminUser(
  payload: AdminCreateUserRequest
): Promise<AdminUserListResponse["items"][number]> {
  const res = await apiFetch("/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function updateAdminUser(
  userId: string,
  payload: AdminUpdateUserRequest
): Promise<AdminUserListResponse["items"][number]> {
  const res = await apiFetch(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function listAdminAuditEvents(filters?: {
  limit?: number;
  actionType?: string;
  resourceType?: string;
  query?: string;
}): Promise<AdminAuditListResponse> {
  const params = new URLSearchParams();
  if (filters?.limit) {
    params.set("limit", String(filters.limit));
  }
  if (filters?.actionType?.trim()) {
    params.set("action_type", filters.actionType.trim());
  }
  if (filters?.resourceType?.trim()) {
    params.set("resource_type", filters.resourceType.trim());
  }
  if (filters?.query?.trim()) {
    params.set("query", filters.query.trim());
  }

  const res = await apiFetch(`/admin/audit${params.toString() ? `?${params.toString()}` : ""}`, {
    method: "GET",
  });

  return res.json();
}
