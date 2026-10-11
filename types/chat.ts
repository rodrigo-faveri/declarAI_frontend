export type SourceItem = {
  source: string;
  title?: string | null;
  path?: string | null;
  url?: string | null;
  final_url?: string | null;
  publisher?: string | null;
  snippet?: string | null;
  score: number | null;
  published_at?: string | null;
  updated_at?: string | null;
  indexed_at?: string | null;
  ingested_at?: string | null;
  base_updated_at?: string | null;
  tax_year?: string | null;
  source_exercise?: string | null;
  exercise_label?: string | null;
  content_hash?: string | null;
  source_hash?: string | null;
  source_type?: "official" | "curated" | "secondary" | null;
  origin?: "knowledge_base" | "web" | "mcp" | null;
  web_result_id?: string | null;
  feedback_status?: "pending" | "liked" | "blocked" | "promoted" | null;
};

export type UploadedDocument = {
  id: string;
  filename: string;
  content_type?: string | null;
  size_bytes: number;
  document_kind?: string | null;
  base_year?: string | null;
  issuer_hint?: string | null;
  uploaded_at: string;
  summary: string;
  excerpt?: string | null;
  signals: string[];
  status: string;
};

export type UploadRecordSummary = {
  id: string;
  filename: string;
  content_hash?: string;
  content_type?: string | null;
  size_bytes: number;
  document_kind?: string | null;
  user_confirmed_document_kind?: string | null;
  base_year?: string | null;
  issuer_hint?: string | null;
  status: string;
  summary: string;
  excerpt?: string | null;
  signals: string[];
  uploaded_at?: string | null;
  conversation_id?: string | null;
  user_id?: string | null;
  primary_sheet_ready?: boolean;
  primary_sheet_label?: string | null;
  fact_match_summary?: UploadMatchSummary;
  action_match_summary?: UploadMatchSummary;
};

export type UploadMatchSummary = {
  strong: number;
  approximate: number;
  missing: number;
  total: number;
  needs_review: boolean;
};

export type UploadFragilityItem = {
  label: string;
  strong: number;
  approximate: number;
  missing: number;
  total: number;
  needs_review_count: number;
  needs_review_rate: number;
};

export type UploadInsightsResponse = {
  field_fragility: UploadFragilityItem[];
  action_fragility: UploadFragilityItem[];
};

export type UploadRecordListResponse = {
  total: number;
  items: UploadRecordSummary[];
};

export type UploadDetailExtraction = {
  status: string;
  text_preview: string;
  analysis?: UploadAnalysis | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UploadConfirmationRecord = {
  question: string;
  answer: string;
  confirmation_type: string;
  created_at?: string | null;
};

export type UploadSheetStateRecord = {
  primary_sheet_label?: string | null;
  status: string;
  filled_fields: UploadFieldReviewItem[];
  pending_fields: UploadFieldReviewItem[];
  updated_at?: string | null;
};

export type UploadRecordDetail = UploadRecordSummary & {
  storage_path: string;
  manifest_path: string;
  content_hash: string;
  extraction?: UploadDetailExtraction | null;
  facts: Array<UploadFactItem & { source?: string; created_at?: string | null }>;
  field_actions: Array<UploadFieldActionItem & { created_at?: string | null }>;
  confirmations: UploadConfirmationRecord[];
  sheet_state?: UploadSheetStateRecord | null;
  detail_match_summary?: {
    facts: UploadMatchSummary;
    field_actions: UploadMatchSummary;
  };
};

export type UploadFactItem = {
  label: string;
  value: string;
  source?: string;
  match_type?: "strong" | "approximate" | "missing" | string;
  evidence?: string | null;
};

export type UploadFieldActionItem = {
  label: string;
  value: string;
  target_sheet: string;
  target_field?: string | null;
  action_title: string;
  action_description: string;
  priority: string;
  match_type?: "strong" | "approximate" | "missing" | string;
  evidence?: string | null;
  entry_steps: string[];
};

export type UploadFilingRoadmapItem = {
  title: string;
  summary: string;
  steps: string[];
};

export type UploadDocumentPlaybookItem = {
  title: string;
  steps: string[];
};

export type UploadTopicItem = {
  label: string;
  description: string;
  declaration_fit: string;
  irpf_sheet: string;
  check_note: string;
  declaration_steps: string[];
};

export type UploadConflictItem = {
  label: string;
  details: string;
};

export type UploadSheetDraftItem = {
  sheet: string;
  guidance: string;
  derived_from: string[];
};

export type UploadAnsweredItem = {
  question: string;
  answer: string;
};

export type UploadDocumentGroupItem = {
  label: string;
  count: number;
  document_names: string[];
};

export type UploadFieldReviewItem = {
  label: string;
  value: string;
  status: string;
};

export type UploadVideoRecommendationItem = {
  title: string;
  url: string;
  channel?: string | null;
  snippet?: string | null;
  duration?: string | null;
  thumbnail_url?: string | null;
  source_query?: string | null;
  is_preferred_channel?: boolean;
};

export type UploadAnalysis = {
  assistant_summary?: string | null;
  primary_sheet_ready?: boolean;
  primary_sheet_label?: string | null;
  filled_fields: UploadFieldReviewItem[];
  pending_fields: UploadFieldReviewItem[];
  facts: UploadFactItem[];
  priority_actions?: UploadFieldActionItem[];
  field_actions: UploadFieldActionItem[];
  document_playbook: UploadDocumentPlaybookItem[];
  filing_roadmap: UploadFilingRoadmapItem[];
  topics: UploadTopicItem[];
  conflicts: UploadConflictItem[];
  sheet_draft: UploadSheetDraftItem[];
  document_groups: UploadDocumentGroupItem[];
  pending_questions: string[];
  answered_items: UploadAnsweredItem[];
  summary_label: string;
  document_count: number;
  document_names: string[];
  document_overrides?: Record<string, string>;
  next_question?: string | null;
  video_recommendations?: UploadVideoRecommendationItem[];
};

export type DeclarationDraftItem = {
  id: string;
  source_upload_id?: string | null;
  source_upload_filename?: string | null;
  canonical_key?: string | null;
  canonical_domain?: string | null;
  label: string;
  value: string;
  target_sheet: string;
  target_field?: string | null;
  action_title: string;
  action_description: string;
  status: "ready" | "review" | "pending" | string;
  priority: string;
  confidence: "strong" | "approximate" | "missing" | string;
  user_review_status?: "confirmed" | "needs_review" | string | null;
  user_review_note?: string | null;
  reviewed_at?: string | null;
  evidence?: string | null;
  entry_steps: string[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type DeclarationDraft = {
  id: string;
  tax_year: string;
  title: string;
  status: "empty" | "in_progress" | "ready" | string;
  source_upload_ids: string[];
  summary: {
    document_count: number;
    sheet_count: number;
    ready_item_count: number;
    review_item_count: number;
    pending_item_count: number;
    confirmed_item_count: number;
    user_review_item_count: number;
    reviewed_sheet_count: number;
    canonical_mapped_item_count: number;
    canonical_domain_counts: Record<string, number>;
    sheet_labels: string[];
  };
  final_checklist: {
    overall_status: "ready" | "review" | "in_progress" | "empty" | string;
    completed_steps: string[];
    attention_steps: string[];
    next_step?: string | null;
  };
  final_review: {
    user_filing_status?: "ready_for_filing" | "needs_review" | string | null;
    user_filing_note?: string | null;
    reviewed_at?: string | null;
  };
  pre_submit: {
    ready: boolean;
    status: "ready" | "blocked" | "missing_data" | string;
    blockers: string[];
    completed_checks: string[];
    next_step?: string | null;
  };
  final_consolidation: {
    exercise_label: string;
    readiness_line: string;
    sections: Array<{
      title: string;
      items: string[];
    }>;
    alerts: string[];
    next_step?: string | null;
  };
  final_report: {
    title: string;
    generated_at: string;
    narrative: string[];
    sections: Array<{
      title: string;
      items: string[];
    }>;
    alerts: string[];
    next_step?: string | null;
  };
  share_summary: {
    headline: string;
    status_line: string;
    completed_points: string[];
    attention_points: string[];
    next_step?: string | null;
    sheet_summaries: Array<{
      sheet_label: string;
      status_line: string;
      highlights: string[];
    }>;
  };
  sheet_reviews: Array<{
    id: string;
    sheet_label: string;
    user_review_status?: "reviewed" | "needs_attention" | string | null;
    user_review_note?: string | null;
    reviewed_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  }>;
  sheet_checklists: Array<{
    sheet_label: string;
    checklist_status: "ready" | "review" | "in_progress" | string;
    review_status?: "reviewed" | "needs_attention" | string | null;
    ready_item_count: number;
    review_item_count: number;
    pending_item_count: number;
    confirmed_item_count: number;
    completed_steps: string[];
    attention_steps: string[];
    next_step?: string | null;
  }>;
  items: DeclarationDraftItem[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type DeclarationDraftExportPackage = {
  draft_id: string;
  tax_year: string;
  target_program: string;
  target_format: string;
  adapter_status: string;
  adapter_message: string;
  available_adapters: Array<{
    adapter_key: string;
    label: string;
    target_program: string;
    target_format: string;
    readiness: string;
    message: string;
    requires_official_layout: boolean;
  }>;
  generated_at: string;
  summary: DeclarationDraft["share_summary"];
  sheets: Array<{
    sheet_label: string;
    review_status?: "reviewed" | "needs_attention" | string | null;
    checklist_status: "ready" | "review" | "in_progress" | string;
    fields: Array<{
      canonical_key?: string | null;
      canonical_domain?: string | null;
      label: string;
      value: string;
      target_field?: string | null;
      status: string;
      confidence: string;
      user_review_status?: string | null;
      source_upload_id?: string | null;
      source_upload_filename?: string | null;
    }>;
  }>;
};

export type DeclarationDraftDECPreview = {
  adapter_key: string;
  label: string;
  readiness: string;
  message: string;
  mapped_fields: Array<{
    canonical_key: string;
    canonical_domain?: string | null;
    sheet_code?: string | null;
    sheet_order?: number | null;
    source_label: string;
    source_value: string;
    target_sheet: string;
    target_field?: string | null;
    field_code?: string | null;
    field_order?: number | null;
    required?: boolean;
    validation_rules: string[];
    confidence: string;
    user_review_status?: string | null;
  }>;
  domain_summary: Record<string, number>;
  unresolved_fields: string[];
  layout_blockers: string[];
};

export type DeclarationDraftDECCandidate = {
  adapter_key: string;
  label: string;
  readiness: string;
  tax_year: string;
  generated_at: string;
  mapped_field_count: number;
  unresolved_field_count: number;
  domain_summary: Record<string, number>;
  fields: Array<{
    canonical_key: string;
    canonical_domain?: string | null;
    sheet_code?: string | null;
    sheet_order?: number | null;
    source_label: string;
    source_value: string;
    target_sheet: string;
    target_field?: string | null;
    field_code?: string | null;
    field_order?: number | null;
    required?: boolean;
    validation_rules: string[];
    confidence: string;
    user_review_status?: string | null;
    source_upload_id?: string | null;
    source_upload_filename?: string | null;
  }>;
  serialized_sheets: Array<{
    sheet_label: string;
    sheet_code?: string | null;
    sheet_order?: number | null;
    canonical_fields: Record<string, string>;
    canonical_field_entries: Array<{
      canonical_key: string;
      value: string;
      canonical_domain?: string | null;
      sheet_code?: string | null;
      sheet_order?: number | null;
      target_field?: string | null;
      field_code?: string | null;
      field_order?: number | null;
      required?: boolean;
      validation_rules: string[];
      source_label: string;
      confidence: string;
      user_review_status?: string | null;
      source_upload_id?: string | null;
      source_upload_filename?: string | null;
    }>;
    field_count: number;
    required_field_count: number;
    missing_required_count: number;
    review_ready_count: number;
    review_pending_count: number;
  }>;
  unresolved_fields: string[];
  layout_blockers: string[];
};

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  kind?: "text" | "triage_result";
  sources?: SourceItem[];
  checklist?: string[];
  riskFlags?: string[];
  nextSteps?: string[];
  followUpPrompts?: string[];
  uploadedDocuments?: UploadedDocument[];
  uploadAnalysis?: UploadAnalysis | null;
  isStreaming?: boolean;
};

export type StoredMessagesPayload = {
  timestamp: number;
  data: UiMessage[];
};

export type ConversationHistoryItem = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  confidenceLevel?: "high" | "medium" | "low" | null;
  confidenceReason?: string | null;
  messageCount?: number;
  sessionId: string | null;
  conversationId?: string | null;
  source?: "local" | "remote";
  messages: UiMessage[];
};

export type ChatResponse = {
  session_id: string | null;
  conversation_id?: string | null;
  mode: "direct_question" | "triage";
  answer: string | null;
  model: string | null;
  confidence_level?: "high" | "medium" | "low" | null;
  confidence_reason?: string | null;
  requested_tax_year?: string | null;
  active_tax_year?: string | null;
  year_interpretation_status?: string | null;
  year_notice?: string | null;
  profile_update_suggestion?: string | null;
  next_steps: string[];
  follow_up_prompts: string[];
  sources: SourceItem[];
  uploaded_documents: UploadedDocument[];
  upload_analysis?: UploadAnalysis | null;
  triage_question: string | null;
  triage_profile: Record<string, string>;
  triage_missing_fields: string[];
  triage_total_fields: number;
  triage_active: boolean;
  triage_finished: boolean;
  checklist: string[];
  risk_flags: string[];
};

export type ChatRequest = {
  message: string;
  session_id?: string | null;
  conversation_id?: string | null;
  uploaded_document_ids?: string[];
  uploaded_document_overrides?: Record<string, string>;
  review_context?: {
    upload_id?: string | null;
    document_label?: string | null;
    review_label?: string | null;
  };
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  provider: string;
  role: "user" | "technical" | "admin" | string;
  plan: "free" | "premium" | string;
  is_active: boolean;
  usage?: UsageSummary | null;
  subscription?: SubscriptionSummary | null;
};

export type UsageSummary = {
  period_key: string;
  chat_interactions_used: number;
  chat_interactions_limit: number | null;
  chat_interactions_remaining: number | null;
  uploads_allowed: boolean;
  plan: "free" | "premium" | string;
};

export type SubscriptionSummary = {
  provider: string;
  status: string;
  plan_code: "free" | "premium" | string;
  external_customer_id?: string | null;
  external_subscription_id?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  canceled_at?: string | null;
  last_synced_at?: string | null;
};

export type BillingSummary = {
  provider: string;
  provider_label: string;
  premium_plan_code: "free" | "premium" | string;
  premium_price_label: string;
  upgrade_cta_label: string;
  checkout_enabled: boolean;
  customer_portal_enabled: boolean;
  checkout_mode: string;
  current_plan: "free" | "premium" | string;
  current_subscription_status: string;
  subscription?: SubscriptionSummary | null;
  message?: string | null;
  provider_checkout_ready: boolean;
  provider_checkout_message?: string | null;
};

export type BillingCheckoutResponse = {
  provider: string;
  checkout_mode: string;
  checkout_url?: string | null;
  message?: string | null;
};

export type BillingDevCheckoutResponse = BillingSubscriptionSyncResponse;

export type BillingSubscriptionSyncRequest = {
  user_id?: string | null;
  email?: string | null;
  provider: string;
  status: string;
  plan_code: "free" | "premium" | string;
  external_customer_id?: string | null;
  external_subscription_id?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  canceled_at?: string | null;
  note?: string | null;
  raw_payload?: Record<string, unknown> | null;
};

export type BillingSubscriptionSyncResponse = {
  user_id: string;
  email: string;
  provider: string;
  status: string;
  plan_code: "free" | "premium" | string;
  resulting_plan: "free" | "premium" | string;
  message: string;
};

export type BillingAdminSummary = {
  provider: string;
  provider_label: string;
  premium_plan_code: "free" | "premium" | string;
  premium_price_label: string;
  checkout_configured: boolean;
  customer_portal_configured: boolean;
  webhook_configured: boolean;
  provider_checkout_ready: boolean;
  provider_checkout_message?: string | null;
  total_users: number;
  premium_users: number;
  free_users: number;
  active_subscriptions: number;
  inactive_subscriptions: number;
  canceled_subscriptions: number;
  past_due_subscriptions: number;
  backend_base_url?: string | null;
  frontend_upgrade_url?: string | null;
  checkout_success_url?: string | null;
  checkout_cancel_url?: string | null;
  generic_webhook_url?: string | null;
  stripe_webhook_url?: string | null;
  asaas_webhook_url?: string | null;
  upload_scan_provider: string;
  upload_scan_fail_closed: boolean;
  upload_scan_signature_enabled: boolean;
  deployment_readiness?: {
    overall_status: "ready" | "warning" | "not_ready" | string;
    message: string;
    ok_count: number;
    warn_count: number;
    fail_count: number;
    checks: Array<{
      level: "ok" | "warn" | "fail" | string;
      area: string;
      message: string;
    }>;
  } | null;
  available_providers: Array<{
    provider: string;
    provider_label: string;
    ready: boolean;
    message: string;
    missing_fields: string[];
    active: boolean;
  }>;
  recent_sensitive_events: Array<{
    id: string;
    action_type: string;
    resource_type: string;
    resource_id?: string | null;
    actor_user_id?: string | null;
    actor_user_email?: string | null;
    target_user_id?: string | null;
    target_user_email?: string | null;
    ip_address?: string | null;
    note?: string | null;
    created_at?: string | null;
  }>;
  recent_upload_rejections: Array<{
    id: string;
    action_type: string;
    resource_type: string;
    resource_id?: string | null;
    actor_user_id?: string | null;
    actor_user_email?: string | null;
    target_user_id?: string | null;
    target_user_email?: string | null;
    ip_address?: string | null;
    note?: string | null;
    created_at?: string | null;
  }>;
};

export type BillingProviderUpdateResponse = BillingAdminSummary;

export type AuthStatusResponse = {
  authenticated: boolean;
  user: AuthUser | null;
};

export type HistoryCardDensity = "compact" | "comfortable";

export type ProfilePreferences = {
  showHistoryBadges: boolean;
  showTriageInsights: boolean;
  historyCardDensity: HistoryCardDensity;
};

export type ProfileDetails = {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  taxProfileNote: string;
  avatarDataUrl: string;
};

export type UserProfileResponse = {
  email: string;
  name: string | null;
  provider: string;
  role: "user" | "technical" | "admin" | string;
  plan: "free" | "premium" | string;
  is_active: boolean;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  tax_profile_note: string;
  avatar_data_url: string;
  preferences: {
    show_history_badges: boolean;
    show_triage_insights: boolean;
    history_card_density: HistoryCardDensity;
  };
  usage?: UsageSummary | null;
  subscription?: SubscriptionSummary | null;
};

export type UpdateUserProfileRequest = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  city?: string;
  tax_profile_note?: string;
  avatar_data_url?: string;
  preferences?: {
    show_history_badges: boolean;
    show_triage_insights: boolean;
    history_card_density: HistoryCardDensity;
  };
};

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string | null;
  provider: string;
  role: "user" | "technical" | "admin" | string;
  plan: "free" | "premium" | string;
  is_active: boolean;
  created_at?: string | null;
  last_login_at?: string | null;
  usage?: UsageSummary | null;
  subscription?: SubscriptionSummary | null;
  plan_events?: AdminUserPlanEventRecord[];
  subscription_events?: AdminUserSubscriptionEventRecord[];
};

export type AdminUserPlanEventRecord = {
  id: string;
  previous_plan?: "free" | "premium" | string | null;
  new_plan: "free" | "premium" | string;
  change_source: string;
  note?: string | null;
  actor_user_id?: string | null;
  actor_user_email?: string | null;
  changed_at?: string | null;
};

export type AdminUserSubscriptionEventRecord = {
  id: string;
  event_type: string;
  provider: string;
  status?: string | null;
  plan_code?: "free" | "premium" | string | null;
  actor_user_id?: string | null;
  actor_user_email?: string | null;
  note?: string | null;
  created_at?: string | null;
};

export type AdminUserListResponse = {
  total: number;
  items: AdminUserRecord[];
};

export type AdminCreateUserRequest = {
  email: string;
  name?: string | null;
  role: "user" | "technical" | "admin" | string;
  plan: "free" | "premium" | string;
  is_active: boolean;
};

export type AdminUpdateUserRequest = {
  name?: string | null;
  role?: "user" | "technical" | "admin" | string;
  plan?: "free" | "premium" | string;
  is_active?: boolean;
};

export type AdminAuditEventRecord = {
  id: string;
  action_type: string;
  resource_type: string;
  resource_id?: string | null;
  actor_user_id?: string | null;
  actor_user_email?: string | null;
  target_user_id?: string | null;
  target_user_email?: string | null;
  ip_address?: string | null;
  note?: string | null;
  metadata: Record<string, unknown>;
  created_at?: string | null;
};

export type AdminAuditListResponse = {
  total: number;
  items: AdminAuditEventRecord[];
  summary: {
    total_visible: number;
    action_types: string[];
    resource_types: string[];
    actor_count: number;
    target_count: number;
  };
};

export type KnowledgeBaseSettingsResponse = {
  active_tax_year: string;
  available_tax_years: string[];
  docs_available: boolean;
  vectorstore_directory: string;
  vectorstore_available: boolean;
};

export type WebSearchResult = {
  id: string;
  query: string;
  url: string;
  title: string;
  snippet: string;
  answer_summary: string;
  domain: string;
  source_type: string;
  status: "pending" | "liked" | "blocked" | "promoted";
  created_at: string;
  updated_at: string;
};

export type WebSearchResultCreateRequest = {
  query: string;
  url: string;
  title?: string;
  snippet?: string;
  answer_summary?: string;
  domain?: string;
  source_type?: string;
  conversation_id?: string | null;
};

export type WebSearchFeedbackRequest = {
  feedback: "like" | "dislike" | "clear";
};

export type DevLoginRequest = {
  email: string;
  name?: string | null;
};

export type ConversationSummary = {
  id: string;
  title: string;
  mode: string;
  confidence_level?: "high" | "medium" | "low" | null;
  confidence_reason?: string | null;
  triage_active: boolean;
  triage_finished: boolean;
  preview: string;
  message_count: number;
  updated_at: string;
};

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  kind: "text" | "triage_result";
  sources: SourceItem[];
  uploaded_documents: UploadedDocument[];
  upload_analysis?: UploadAnalysis | null;
  checklist: string[];
  risk_flags: string[];
  created_at: string;
};

export type ConversationDetail = {
  id: string;
  title: string;
  mode: string;
  confidence_level?: "high" | "medium" | "low" | null;
  confidence_reason?: string | null;
  triage_active: boolean;
  triage_finished: boolean;
  triage_profile: Record<string, string>;
  triage_missing_fields: string[];
  triage_total_fields: number;
  updated_at: string;
  messages: ConversationMessage[];
};
