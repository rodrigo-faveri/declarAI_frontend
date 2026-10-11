"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { canAccessAdmin } from "@/lib/access-control";
import { getAuthStatus, getBillingAdminSummary, updateBillingProvider } from "@/services/api";
import { AuthUser, BillingAdminSummary } from "@/types/chat";

function formatProviderLabel(provider?: string | null) {
  if ((provider || "").toLowerCase() === "stripe") return "Stripe";
  if ((provider || "").toLowerCase() === "asaas") return "Asaas";
  return "Manual";
}

function getProviderTone(ready: boolean, active: boolean) {
  if (active && ready) return "border-emerald-300/20 bg-emerald-400/10 text-emerald-100";
  if (active && !ready) return "border-amber-300/20 bg-amber-400/10 text-amber-100";
  if (ready) return "border-sky-300/20 bg-sky-400/10 text-sky-100";
  return "border-white/10 bg-slate-950/35 text-slate-300";
}

function getProviderEnvSnippet(provider?: string | null) {
  const normalized = (provider || "").toLowerCase();

  if (normalized === "stripe") {
    return [
      "BILLING_PROVIDER=stripe",
      "BILLING_STRIPE_SECRET_KEY=sk_test_ou_sk_live",
      "BILLING_STRIPE_PRICE_ID=price_xxx",
      "BILLING_STRIPE_WEBHOOK_SECRET=whsec_xxx",
      "BILLING_SUCCESS_URL=http://localhost:3000/upgrade?checkout=success",
      "BILLING_CANCEL_URL=http://localhost:3000/upgrade?checkout=cancel",
    ].join("\n");
  }

  if (normalized === "asaas") {
    return [
      "BILLING_PROVIDER=asaas",
      "BILLING_ASAAS_API_KEY=$aact_xxx",
      "BILLING_ASAAS_BASE_URL=https://api.asaas.com",
      "BILLING_ASAAS_CHECKOUT_BASE_URL=https://asaas.com/checkoutSession/show",
      "BILLING_ASAAS_WEBHOOK_TOKEN=seu-token-de-webhook",
      "BILLING_PREMIUM_PRICE_AMOUNT=39.9",
      "BILLING_SUCCESS_URL=http://localhost:3000/upgrade?checkout=success",
      "BILLING_CANCEL_URL=http://localhost:3000/upgrade?checkout=cancel",
    ].join("\n");
  }

  return [
    "BILLING_PROVIDER=manual",
    "BILLING_CHECKOUT_URL=https://seu-checkout.exemplo.com",
    "BILLING_CUSTOMER_PORTAL_URL=https://seu-portal.exemplo.com",
    "BILLING_SUCCESS_URL=http://localhost:3000/upgrade?checkout=success",
    "BILLING_CANCEL_URL=http://localhost:3000/upgrade?checkout=cancel",
  ].join("\n");
}

function getWebhookUrlForProvider(summary: BillingAdminSummary | null, provider?: string | null) {
  const normalized = (provider || "").toLowerCase();
  if (normalized === "stripe") return summary?.stripe_webhook_url || "—";
  if (normalized === "asaas") return summary?.asaas_webhook_url || "—";
  return summary?.generic_webhook_url || "—";
}

function formatEventDate(value?: string | null) {
  if (!value) return "Agora";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Agora";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatUploadScanProviderLabel(provider?: string | null) {
  const normalized = (provider || "local").toLowerCase();
  if (normalized === "clamav") return "ClamAV";
  if (normalized === "disabled") return "Desabilitado";
  return "Local";
}

function getReadinessTone(status?: string | null) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "ready") return "border-emerald-300/20 bg-emerald-400/10 text-emerald-100";
  if (normalized === "warning") return "border-amber-300/20 bg-amber-400/10 text-amber-100";
  return "border-rose-300/20 bg-rose-500/10 text-rose-100";
}

export default function AdminBillingPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [switchingProvider, setSwitchingProvider] = useState<string | null>(null);
  const [copyingSnippet, setCopyingSnippet] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [summary, setSummary] = useState<BillingAdminSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        const authStatus = await getAuthStatus();
        if (!active) return;
        setAuthUser(authStatus.user);

        if (!canAccessAdmin(authStatus.user?.role)) {
          return;
        }

        const billingSummary = await getBillingAdminSummary();
        if (!active) return;
        setSummary(billingSummary);
      } catch (error) {
        if (!active) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar o painel de billing."
        );
      } finally {
        if (active) {
          setAuthLoading(false);
          setSummaryLoading(false);
        }
      }
    }

    void loadPage();
    return () => {
      active = false;
    };
  }, []);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        <div className="mx-auto max-w-6xl rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-6 py-5 text-sm text-slate-300">
          Validando acesso ao billing...
        </div>
      </main>
    );
  }

  if (!canAccessAdmin(authUser?.role)) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-8">
          <div className="inline-flex rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-100">
            Acesso restrito
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-white">Painel de billing</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Esta area fica disponivel apenas para contas com papel de admin.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
            >
              Voltar para a home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  async function handleSwitchProvider(provider: string) {
    try {
      setSwitchingProvider(provider);
      const updated = await updateBillingProvider(provider);
      setSummary(updated);
      toast.success(`Provider ativo alterado para ${formatProviderLabel(provider)}.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nao foi possivel trocar o provider de billing."
      );
    } finally {
      setSwitchingProvider(null);
    }
  }

  async function handleCopyEnvSnippet() {
    try {
      setCopyingSnippet(true);
      await navigator.clipboard.writeText(getProviderEnvSnippet(summary?.provider));
      toast.success("Snippet do .env copiado.");
    } catch {
      toast.error("Nao foi possivel copiar o snippet agora.");
    } finally {
      setCopyingSnippet(false);
    }
  }

  const activeProvider = (summary?.available_providers || []).find((provider) => provider.active);

  return (
    <AppShell activeSection="admin" user={authUser} maxWidth="max-w-6xl">
      <div className="space-y-6">
        <div className="rounded-[1.9rem] border border-white/10 bg-white/[0.045] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-100">
                Admin
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-white">Painel de billing</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Acompanhe configuracao de provider, checkout, portal, webhook e o estado comercial atual da base.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/audit"
                className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
              >
                Ver auditoria
              </Link>
              <Link
                href="/admin/users"
                className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
              >
                Ver usuarios
              </Link>
              <Link
                href="/"
                className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
              >
                Voltar para a home
              </Link>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-[1.5rem] border border-rose-300/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Provider
            </div>
            <div className="mt-3 text-3xl font-semibold text-white">
              {summaryLoading ? "..." : formatProviderLabel(summary?.provider_label)}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Premium
            </div>
            <div className="mt-3 text-3xl font-semibold text-emerald-200">
              {summaryLoading ? "..." : summary?.premium_users ?? 0}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Assinaturas ativas
            </div>
            <div className="mt-3 text-3xl font-semibold text-sky-200">
              {summaryLoading ? "..." : summary?.active_subscriptions ?? 0}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Pagamento pendente
            </div>
            <div className="mt-3 text-3xl font-semibold text-amber-200">
              {summaryLoading ? "..." : summary?.past_due_subscriptions ?? 0}
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-200">Readiness do ambiente atual</div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Esta leitura usa a configuracao carregada no backend agora. Ela ajuda a enxergar se o ambiente atual esta mais perto de local, staging ou algo ja utilizavel publicamente.
              </p>
            </div>
            <div
              className={`rounded-full border px-3 py-1 text-xs font-medium ${getReadinessTone(
                summary?.deployment_readiness?.overall_status
              )}`}
            >
              {summary?.deployment_readiness?.overall_status === "ready"
                ? "Pronto"
                : summary?.deployment_readiness?.overall_status === "warning"
                  ? "Parcial"
                  : "Nao pronto"}
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">OK</div>
              <div className="mt-2 text-2xl font-semibold text-emerald-200">
                {summary?.deployment_readiness?.ok_count ?? 0}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Warn</div>
              <div className="mt-2 text-2xl font-semibold text-amber-200">
                {summary?.deployment_readiness?.warn_count ?? 0}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Fail</div>
              <div className="mt-2 text-2xl font-semibold text-rose-200">
                {summary?.deployment_readiness?.fail_count ?? 0}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</div>
              <div className="mt-2 text-sm font-medium text-white">
                {summary?.deployment_readiness?.message || "Sem leitura"}
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {(summary?.deployment_readiness?.checks || []).map((check, index) => (
              <div
                key={`${check.area}-${index}-${check.message}`}
                className={`rounded-[1.2rem] border px-4 py-4 text-sm ${
                  check.level === "ok"
                    ? "border-emerald-300/15 bg-emerald-400/10 text-emerald-100"
                    : check.level === "warn"
                      ? "border-amber-300/15 bg-amber-400/10 text-amber-100"
                      : "border-rose-300/15 bg-rose-500/10 text-rose-100"
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">
                  {check.area}
                </div>
                <div className="mt-2 leading-6">{check.message}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
            <div className="flex items-center gap-2 text-slate-200">
              <ShieldCheck size={16} />
              <span className="text-sm font-medium">Seguranca de upload</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Provider</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {formatUploadScanProviderLabel(summary?.upload_scan_provider)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Modo de falha</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {summary?.upload_scan_fail_closed ? "Fail-closed" : "Fail-open"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Assinaturas locais</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {summary?.upload_scan_signature_enabled ? "Ativas" : "Desativadas"}
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-sky-300/15 bg-sky-400/10 px-4 py-4 text-sm leading-6 text-sky-100/90">
              {summary?.upload_scan_provider === "clamav"
                ? "O backend esta preparado para usar ClamAV como scanner real de upload. Em producao, mantenha preferencialmente o modo fail-closed."
                : summary?.upload_scan_provider === "disabled"
                  ? "O scan de upload esta desabilitado. Isso so faz sentido em ambientes muito controlados."
                  : "O projeto esta usando o scanner local por assinatura como camada inicial de protecao para upload."}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
            <div className="flex items-center gap-2 text-slate-200">
              <ShieldCheck size={16} />
              <span className="text-sm font-medium">Rejeicoes recentes de upload</span>
            </div>
            <div className="mt-5 space-y-3">
              {(summary?.recent_upload_rejections || []).length === 0 ? (
                <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 px-4 py-4 text-sm text-slate-300">
                  Nenhum upload bloqueado por seguranca apareceu recentemente.
                </div>
              ) : (
                (summary?.recent_upload_rejections || []).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-rose-300/20 bg-rose-500/10 px-2.5 py-1 text-rose-100">
                        bloqueado
                      </span>
                      <span className="text-slate-500">{formatEventDate(event.created_at)}</span>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-200">
                      {event.note || "Upload rejeitado por seguranca."}
                    </div>
                    <div className="mt-2 text-xs leading-6 text-slate-400">
                      {event.actor_user_email ? `ator: ${event.actor_user_email}` : "ator nao identificado"}
                      {event.ip_address ? ` · ip: ${event.ip_address}` : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
            <div className="flex items-center gap-2 text-slate-200">
              <CreditCard size={16} />
              <span className="text-sm font-medium">Configuracao de cobranca</span>
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <div>
                <strong>Provider:</strong> {summary?.provider_label || "Manual"}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {(summary?.available_providers || []).map((provider) => (
                  <button
                    key={provider.provider}
                    type="button"
                    disabled={switchingProvider !== null || provider.active}
                    onClick={() => handleSwitchProvider(provider.provider)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                      provider.active
                        ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                        : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                    }`}
                  >
                    {switchingProvider === provider.provider
                      ? "Trocando..."
                      : provider.active
                        ? `${provider.provider_label} ativo`
                        : `Usar ${provider.provider_label}`}
                  </button>
                ))}
              </div>
              <div>
                <strong>Plano Premium:</strong> {summary?.premium_price_label || "R$ 39,90 / mes"}
              </div>
              <div>
                <strong>Checkout:</strong> {summary?.checkout_configured ? "configurado" : "nao configurado"}
              </div>
              <div>
                <strong>Portal do cliente:</strong> {summary?.customer_portal_configured ? "configurado" : "nao configurado"}
              </div>
              <div>
                <strong>Webhook:</strong> {summary?.webhook_configured ? "configurado" : "nao configurado"}
              </div>
              <div>
                <strong>Adapter do provider:</strong> {summary?.provider_checkout_ready ? "pronto" : "pendente"}
              </div>
              {summary?.provider_checkout_message ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-3 text-xs leading-6 text-slate-300">
                  {summary.provider_checkout_message}
                </div>
              ) : null}
              <div className="rounded-2xl border border-sky-300/15 bg-sky-400/10 px-3 py-3 text-xs leading-6 text-sky-100/90">
                <div className="font-semibold text-sky-100">Como esta configuracao funciona</div>
                <p className="mt-2">
                  Chaves, tokens, URLs e IDs de preco sao lidos do arquivo{" "}
                  <code className="rounded bg-black/20 px-1.5 py-0.5 text-[11px] text-sky-50">
                    backend/.env
                  </code>
                  .
                </p>
                <p className="mt-2">
                  Trocar o provider ativo aqui no painel muda apenas o fluxo usado em runtime para testes e operacao.
                  Isso nao grava segredos no banco nem substitui o que esta configurado no{" "}
                  <code className="rounded bg-black/20 px-1.5 py-0.5 text-[11px] text-sky-50">
                    .env
                  </code>
                  .
                </p>
                <p className="mt-2">
                  Se voce alterar o{" "}
                  <code className="rounded bg-black/20 px-1.5 py-0.5 text-[11px] text-sky-50">
                    backend/.env
                  </code>
                  , reinicie o backend antes de testar novamente.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
            <div className="flex items-center gap-2 text-slate-200">
              <ShieldCheck size={16} />
              <span className="text-sm font-medium">Panorama comercial</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Usuarios totais</div>
                <div className="mt-2 text-2xl font-semibold text-white">{summary?.total_users ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Usuarios Free</div>
                <div className="mt-2 text-2xl font-semibold text-white">{summary?.free_users ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Assinaturas inativas</div>
                <div className="mt-2 text-2xl font-semibold text-white">{summary?.inactive_subscriptions ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Assinaturas canceladas</div>
                <div className="mt-2 text-2xl font-semibold text-white">{summary?.canceled_subscriptions ?? 0}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
          <div className="flex items-center gap-2 text-slate-200">
            <ShieldCheck size={16} />
            <span className="text-sm font-medium">Seguranca de upload</span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-300">
              <div>
                <strong>Provider de scan:</strong>{" "}
                {formatUploadScanProviderLabel(summary?.upload_scan_provider)}
              </div>
              <div className="mt-2">
                <strong>Modo de falha:</strong>{" "}
                {summary?.upload_scan_fail_closed ? "fail-closed" : "fail-open"}
              </div>
              <div className="mt-2">
                <strong>Assinaturas locais:</strong>{" "}
                {summary?.upload_scan_signature_enabled ? "ativas" : "desativadas"}
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-300">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Orientacao operacional
              </div>
              <p className="mt-3 leading-6">
                Em ambiente local, o provider <strong>{formatUploadScanProviderLabel(summary?.upload_scan_provider)}</strong>{" "}
                mostra qual camada esta protegendo o upload. Para producao, o ideal e usar <strong>ClamAV</strong> ou outro
                scanner real com modo <strong>fail-closed</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
          <div className="flex items-center gap-2 text-slate-200">
            <CreditCard size={16} />
            <span className="text-sm font-medium">Providers disponiveis</span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {(summary?.available_providers || []).map((provider) => (
              <div
                key={provider.provider}
                className={`rounded-[1.35rem] border p-4 ${getProviderTone(provider.ready, provider.active)}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold">
                    {provider.provider_label || formatProviderLabel(provider.provider)}
                  </div>
                  {provider.active ? (
                    <span className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]">
                      ativo
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 text-xs uppercase tracking-[0.18em] opacity-80">
                  {provider.ready ? "pronto" : "pendente"}
                </div>
                <div className="mt-3 text-sm leading-6 opacity-90">{provider.message}</div>
                {provider.missing_fields?.length ? (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">
                      Falta configurar
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {provider.missing_fields.map((field) => (
                        <span
                          key={field}
                          className="rounded-full border border-current/20 px-2.5 py-1 text-[11px]"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-200">Snippet rapido para o .env</div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Use este bloco como ponto de partida no{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-100">
                  backend/.env
                </code>{" "}
                para o provider ativo. Depois de alterar essas variaveis, reinicie o backend.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200">
                Provider em foco: {summary?.provider_label || "Manual"}
              </div>
              <button
                type="button"
                onClick={handleCopyEnvSnippet}
                disabled={copyingSnippet}
                className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copyingSnippet ? "Copiando..." : "Copiar snippet"}
              </button>
            </div>
          </div>
          <pre className="mt-5 overflow-x-auto rounded-[1.35rem] border border-white/10 bg-slate-950/50 p-4 text-xs leading-6 text-sky-100">
            <code>{getProviderEnvSnippet(summary?.provider)}</code>
          </pre>
          <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Proximo passo
            </div>
            {activeProvider?.missing_fields?.length ? (
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Preencha no <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-100">backend/.env</code>{" "}
                os campos faltantes do provider <strong>{activeProvider.provider_label}</strong> e reinicie o backend para
                o checkout ficar pronto.
              </p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-300">
                O provider <strong>{activeProvider?.provider_label || summary?.provider_label || "Manual"}</strong> ja
                parece pronto. O proximo passo e abrir <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-100">/upgrade</code>{" "}
                e validar o fluxo real de checkout.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
          <div className="text-sm font-medium text-slate-200">Checklist de ativacao</div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Este e o caminho mais curto para validar o provider <strong>{activeProvider?.provider_label || summary?.provider_label || "Manual"}</strong>{" "}
            fim a fim no ambiente local.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                URLs de teste
              </div>
              <div className="mt-3 space-y-3 text-sm text-slate-300">
                <div>
                  <strong>Upgrade:</strong>{" "}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-100">
                    {summary?.frontend_upgrade_url || "—"}
                  </code>
                </div>
                <div>
                  <strong>Retorno de sucesso:</strong>{" "}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-100">
                    {summary?.checkout_success_url || "—"}
                  </code>
                </div>
                <div>
                  <strong>Retorno de cancelamento:</strong>{" "}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-100">
                    {summary?.checkout_cancel_url || "—"}
                  </code>
                </div>
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Webhook do provider
              </div>
              <div className="mt-3 space-y-3 text-sm text-slate-300">
                <div>
                  <strong>Provider ativo:</strong> {activeProvider?.provider_label || summary?.provider_label || "Manual"}
                </div>
                <div>
                  <strong>URL:</strong>{" "}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-100">
                    {getWebhookUrlForProvider(summary, activeProvider?.provider || summary?.provider)}
                  </code>
                </div>
                <div>
                  <strong>Fallback generico:</strong>{" "}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-100">
                    {summary?.generic_webhook_url || "—"}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
          <div className="text-sm font-medium text-slate-200">Eventos sensiveis recentes</div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Use este bloco para acompanhar alteracoes de billing, checkout local e acoes administrativas recentes.
          </p>
          <div className="mt-3">
            <Link
              href="/admin/audit"
              className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/[0.08]"
            >
              Abrir auditoria completa
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {(summary?.recent_sensitive_events || []).length === 0 ? (
              <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 px-4 py-4 text-sm text-slate-300">
                Nenhum evento sensivel recente encontrado.
              </div>
            ) : (
              (summary?.recent_sensitive_events || []).map((event) => (
                <div
                  key={event.id}
                  className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-100">
                      {event.action_type}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                      {event.resource_type}
                    </span>
                    <span className="text-slate-500">{formatEventDate(event.created_at)}</span>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-200">
                    {event.note || "Evento sensivel registrado."}
                  </div>
                  <div className="mt-2 text-xs leading-6 text-slate-400">
                    {event.actor_user_email ? `ator: ${event.actor_user_email}` : "ator nao identificado"}
                    {event.target_user_email ? ` · alvo: ${event.target_user_email}` : ""}
                    {event.ip_address ? ` · ip: ${event.ip_address}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
          <div className="text-sm font-medium text-slate-200">Uploads rejeitados por seguranca</div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Use este bloco para acompanhar arquivos bloqueados pelo scan de upload e identificar tentativas suspeitas ou formatos indevidos.
          </p>
          <div className="mt-5 space-y-3">
            {(summary?.recent_upload_rejections || []).length === 0 ? (
              <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 px-4 py-4 text-sm text-slate-300">
                Nenhum upload rejeitado por seguranca apareceu recentemente.
              </div>
            ) : (
              (summary?.recent_upload_rejections || []).map((event) => (
                <div
                  key={event.id}
                  className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-rose-300/20 bg-rose-500/10 px-2.5 py-1 text-rose-100">
                      bloqueado
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                      {event.action_type}
                    </span>
                    <span className="text-slate-500">{formatEventDate(event.created_at)}</span>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-200">
                    {event.note || "Upload bloqueado pelas validacoes de seguranca."}
                  </div>
                  <div className="mt-2 text-xs leading-6 text-slate-400">
                    {event.actor_user_email ? `ator: ${event.actor_user_email}` : "ator nao identificado"}
                    {event.ip_address ? ` · ip: ${event.ip_address}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
