"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Crown, FileUp, Infinity as InfinityIcon, Loader2, MessagesSquare, ShieldCheck, Sparkles } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { ApiError, getBillingSummary, startBillingCheckout } from "@/services/api";
import { BillingSummary } from "@/types/chat";

function PlanFeature({
  icon: Icon,
  children,
  tone = "default",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  tone?: "default" | "success" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-100"
      : tone === "muted"
        ? "text-slate-300"
        : "text-white";

  return (
    <div className={`flex items-start gap-3 text-sm ${toneClass}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export default function UpgradePage() {
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBilling() {
      try {
        setLoading(true);
        setErrorMessage(null);
        const response = await getBillingSummary();
        if (!active) return;
        setBilling(response);
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          setErrorMessage("Entre na sua conta para ver o status do plano e continuar o upgrade.");
        } else if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Nao foi possivel carregar os dados de upgrade agora.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadBilling();
    return () => {
      active = false;
    };
  }, []);

  const currentPlanLabel = useMemo(() => {
    const normalized = (billing?.current_plan || "free").toLowerCase();
    return normalized === "premium" ? "Premium" : "Free";
  }, [billing?.current_plan]);

  const currentStatusLabel = useMemo(() => {
    const normalized = (billing?.current_subscription_status || "inactive").toLowerCase();
    if (normalized === "active") return "Assinatura ativa";
    if (normalized === "past_due") return "Pagamento pendente";
    if (normalized === "canceled") return "Assinatura cancelada";
    return "Sem assinatura ativa";
  }, [billing?.current_subscription_status]);

  async function handleCheckout() {
    try {
      setCheckoutLoading(true);
      setErrorMessage(null);
      const response = await startBillingCheckout();
      if (response.checkout_url) {
        window.location.href = response.checkout_url;
        return;
      }
      setErrorMessage(response.message || "O checkout ainda nao esta disponivel neste ambiente.");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nao foi possivel iniciar o checkout agora.");
      }
    } finally {
      setCheckoutLoading(false);
    }
  }

  const primaryCtaLabel =
    billing?.checkout_mode === "customer_portal"
      ? "Gerenciar assinatura"
      : billing?.upgrade_cta_label || "Fazer upgrade";

  const primaryCtaDisabled =
    loading ||
    checkoutLoading ||
    (!billing?.checkout_enabled && !billing?.customer_portal_enabled);

  const providerStatusTone =
    billing?.provider_checkout_ready || billing?.checkout_enabled || billing?.customer_portal_enabled
      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
      : "border-amber-300/20 bg-amber-400/10 text-amber-100";
  const checkoutState = searchParams.get("checkout");

  return (
    <AppShell activeSection="upgrade" maxWidth="max-w-6xl" forceDark>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.18)] backdrop-blur-xl lg:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-100">
              Upgrade de plano
            </div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300">
              Conversas + documentos
            </div>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white lg:text-5xl">
                Libere documentos, revisao guiada e uso sem limite pratico.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 lg:text-base">
                O Premium transforma o DeclarIA em um assistente mais completo para a declaracao:
                voce envia informes, acompanha a ficha principal sugerida e continua a revisao no chat
                sem depender so de perguntas soltas.
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-xs">
                <div className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-slate-200">
                  Plano atual: {currentPlanLabel}
                </div>
                <div className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-slate-300">
                  {currentStatusLabel}
                </div>
                {billing?.provider_label ? (
                  <div className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-emerald-100">
                    Provider: {billing.provider_label}
                  </div>
                ) : null}
                {billing?.provider_label ? (
                  <div className={`inline-flex rounded-full border px-3 py-1 ${providerStatusTone}`}>
                    {billing.provider_checkout_ready || billing?.checkout_enabled || billing?.customer_portal_enabled
                      ? "Provider pronto"
                      : "Provider pendente"}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={primaryCtaDisabled}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {checkoutLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {primaryCtaLabel}
                </button>
                <Link
                  href="/chat"
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
                >
                  Voltar ao chat
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-400/15"
                >
                  Ver minha home
                </Link>
              </div>
              {errorMessage ? (
                <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
                  {errorMessage}
                </div>
              ) : null}
              {!errorMessage && billing?.provider_checkout_message ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-slate-300">
                  {billing.provider_checkout_message}
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.75rem] border border-emerald-300/20 bg-emerald-400/10 p-6">
              <div className="flex items-center gap-2 text-emerald-100">
                <Crown size={18} />
                <span className="text-lg font-semibold">Por que fazer upgrade</span>
              </div>
              <div className="mt-5 space-y-4">
                <PlanFeature icon={FileUp} tone="success">
                  Upload de documentos para leitura, parser e ajuda guiada por ficha.
                </PlanFeature>
                <PlanFeature icon={InfinityIcon} tone="success">
                  Conversas sem limite pratico para revisar informes e retomar contexto.
                </PlanFeature>
                <PlanFeature icon={Sparkles} tone="success">
                  Acompanhamento mais claro do que declarar agora, do que falta e do que ja foi encontrado.
                </PlanFeature>
              </div>
              <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-black/10 px-4 py-3 text-xs leading-6 text-emerald-50/90">
                {loading
                  ? "Carregando o estado da sua assinatura..."
                  : billing?.message ||
                    "Esta pagina ja mostra o status da assinatura e o proximo passo para liberar o Premium."}
              </div>
            </div>
          </div>
        </section>

        {checkoutState === "success" ? (
          <section className="rounded-[1.75rem] border border-emerald-300/20 bg-emerald-400/10 p-5 text-sm leading-6 text-emerald-100">
            Seu checkout voltou com status de sucesso. Se o provider ja enviou a confirmacao, a assinatura deve refletir em instantes na sua conta.
          </section>
        ) : null}

        {checkoutState === "cancel" ? (
          <section className="rounded-[1.75rem] border border-amber-300/20 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100">
            O checkout foi interrompido antes da confirmacao. Quando quiser, voce pode retomar o upgrade por esta mesma pagina.
          </section>
        ) : null}

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
            Estado da cobranca
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Provider atual</div>
              <div className="mt-2 text-lg font-semibold text-white">
                {billing?.provider_label || "Manual"}
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Preco do Premium</div>
              <div className="mt-2 text-lg font-semibold text-white">
                {billing?.premium_price_label || "R$ 39,90 / mes"}
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Fluxo atual</div>
              <div className="mt-2 text-lg font-semibold text-white">
                {billing?.checkout_mode === "customer_portal"
                  ? "Portal da assinatura"
                  : billing?.checkout_mode === "external_url" || billing?.checkout_mode === "provider_checkout"
                    ? "Checkout disponivel"
                    : billing?.checkout_mode === "already_premium"
                      ? "Conta Premium"
                      : "Em configuracao"}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
            <div className="flex items-center gap-2 text-slate-100">
              <ShieldCheck size={18} />
              <span className="text-lg font-semibold">Plano Free</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Ideal para conhecer o produto, tirar duvidas e fazer consultas pontuais.
            </p>
            <div className="mt-6 space-y-4">
              <PlanFeature icon={MessagesSquare} tone="muted">
                20 interacoes mensais com a IA.
              </PlanFeature>
              <PlanFeature icon={FileUp} tone="muted">
                Upload e acompanhamento de documentos bloqueados.
              </PlanFeature>
              <PlanFeature icon={Sparkles} tone="muted">
                Boa experiencia para perguntas diretas e orientacao inicial.
              </PlanFeature>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-emerald-300/20 bg-emerald-400/10 p-6">
            <div className="flex items-center gap-2 text-emerald-100">
              <Crown size={18} />
              <span className="text-lg font-semibold">Plano Premium</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-emerald-50/90">
              Pensado para quem quer declarar com mais apoio, usar informes e revisar a ficha com menos atrito.
            </p>
            <div className="mt-6 space-y-4">
              <PlanFeature icon={InfinityIcon} tone="success">
                Conversas sem limite pratico de uso.
              </PlanFeature>
              <PlanFeature icon={FileUp} tone="success">
                Upload de documentos com leitura, parser e mapeamento para a declaracao.
              </PlanFeature>
              <PlanFeature icon={MessagesSquare} tone="success">
                Continuidade entre documentos e chat para revisar pendencias especificas.
              </PlanFeature>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
            Free x Premium
          </div>
          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/10">
            <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,0.85fr)] bg-slate-950/40 text-sm">
              <div className="border-b border-white/10 px-4 py-3 font-semibold text-white">Recurso</div>
              <div className="border-b border-l border-white/10 px-4 py-3 font-semibold text-slate-200">Free</div>
              <div className="border-b border-l border-white/10 px-4 py-3 font-semibold text-emerald-100">Premium</div>

              <div className="px-4 py-3 text-slate-300">Interacoes com a IA</div>
              <div className="border-l border-white/10 px-4 py-3 text-slate-300">20 por mes</div>
              <div className="border-l border-white/10 px-4 py-3 text-emerald-100">Sem limite pratico</div>

              <div className="border-t border-white/10 px-4 py-3 text-slate-300">Upload de documentos</div>
              <div className="border-l border-t border-white/10 px-4 py-3 text-slate-300">Nao</div>
              <div className="border-l border-t border-white/10 px-4 py-3 text-emerald-100">Sim</div>

              <div className="border-t border-white/10 px-4 py-3 text-slate-300">Leitura de informes</div>
              <div className="border-l border-t border-white/10 px-4 py-3 text-slate-300">Nao</div>
              <div className="border-l border-t border-white/10 px-4 py-3 text-emerald-100">Sim</div>

              <div className="border-t border-white/10 px-4 py-3 text-slate-300">Revisao guiada por documento</div>
              <div className="border-l border-t border-white/10 px-4 py-3 text-slate-300">Nao</div>
              <div className="border-l border-t border-white/10 px-4 py-3 text-emerald-100">Sim</div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
            Proximo passo
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            {billing?.checkout_enabled || billing?.customer_portal_enabled
              ? "Seu ambiente ja tem um proximo passo configurado para upgrade ou gestao da assinatura. Use o botao principal desta pagina para continuar."
              : "Quando o provider de cobranca estiver configurado, esta pagina vai redirecionar direto para checkout ou portal da assinatura. Enquanto isso, ela ja deixa clara a proposta comercial do Premium."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/chat"
              className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
            >
              Continuar no chat
            </Link>
            <Link
              href="/documentos"
              className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15"
            >
              Ver area de documentos
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
