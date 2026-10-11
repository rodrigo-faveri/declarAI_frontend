"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  MessagesSquare,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserCog,
} from "lucide-react";

import {
  canAccessTechnicalUploads,
  canManageKnowledgeBase,
  isPremiumPlan,
} from "@/lib/access-control";
import { devLogin, getAuthStatus, getLoginUrl } from "@/services/api";
import { AuthUser } from "@/types/chat";

function getRoleLabel(role?: string | null) {
  if (role === "admin") return "Admin";
  if (role === "technical") return "Time tecnico";
  return "Usuario";
}

function getRoleTone(role?: string | null) {
  if (role === "admin") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }
  if (role === "technical") {
    return "border-sky-400/20 bg-sky-500/10 text-sky-100";
  }
  return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
}

function getPlanLabel(plan?: string | null) {
  return isPremiumPlan(plan) ? "Premium" : "Free";
}

function getSubscriptionStatusLabel(status?: string | null) {
  const normalized = (status || "inactive").toLowerCase();
  if (normalized === "active") return "Premium ativo";
  if (normalized === "past_due") return "Pagamento pendente";
  if (normalized === "canceled") return "Assinatura cancelada";
  if (normalized === "trialing") return "Periodo de teste";
  return "Sem assinatura ativa";
}

function getSubscriptionTone(status?: string | null) {
  const normalized = (status || "inactive").toLowerCase();
  if (normalized === "active" || normalized === "trialing") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  }
  if (normalized === "past_due") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }
  if (normalized === "canceled") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-100";
  }
  return "border-white/10 bg-white/[0.04] text-slate-300";
}

type RoleCard = {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  disabled?: boolean;
  disabledReason?: string;
};

export default function LandingPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loggingInAs, setLoggingInAs] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const authStatus = await getAuthStatus();
        if (!active) return;
        setAuthUser(authStatus.user);
      } finally {
        if (active) {
          setCheckingAuth(false);
        }
      }
    }

    void checkAuth();

    return () => {
      active = false;
    };
  }, []);

  function handleLogin() {
    window.location.href = getLoginUrl(`${window.location.origin}/`);
  }

  async function handleDevLogin(email: string, name: string) {
    try {
      setLoggingInAs(email);
      const authStatus = await devLogin({ email, name });
      setAuthUser(authStatus.user);
    } finally {
      setLoggingInAs(null);
      setCheckingAuth(false);
    }
  }

  const remainingInteractions = authUser?.usage?.chat_interactions_remaining;
  const subscriptionStatus = authUser?.subscription?.status;
  const subscriptionStatusLabel = getSubscriptionStatusLabel(subscriptionStatus);
  const uploadAllowed =
    authUser?.usage?.uploads_allowed ??
    (isPremiumPlan(authUser?.plan) || canAccessTechnicalUploads(authUser?.role));

  const roleCards = useMemo<RoleCard[]>(() => {
    const cards: RoleCard[] = [
      {
        title: "Conversar com a IA",
        description:
          "Tire duvidas do IRPF, continue uma triagem guiada ou retome uma conversa salva.",
        href: "/chat",
        cta: "Abrir chat",
        icon: MessagesSquare,
      },
      {
        title: "Minha declaracao",
        description:
          "Veja o rascunho estruturado da declaracao com o que ja esta pronto e o que ainda merece revisao.",
        href: "/declaracao",
        cta: "Abrir rascunho",
        icon: FileText,
      },
      {
        title: "Meus documentos",
        description:
          "Acompanhe seus arquivos, a ficha principal sugerida e o que ja foi identificado.",
        href: "/documentos",
        cta: uploadAllowed ? "Ver meus documentos" : "Disponivel no Premium",
        icon: FileText,
        disabled: !uploadAllowed,
        disabledReason:
          !uploadAllowed
            ? "Upload e acompanhamento de documentos ficam liberados no plano Premium."
            : undefined,
      },
    ];

    if (canAccessTechnicalUploads(authUser?.role)) {
      cards.push({
        title: "Observabilidade de uploads",
        description:
          "Revise OCR, parser, facts, acoes sugeridas e estado das fichas com visao tecnica.",
        href: "/uploads",
        cta: "Abrir observabilidade",
        icon: UserCog,
      });
    }

    if (canManageKnowledgeBase(authUser?.role)) {
      cards.push({
        title: "Gestao da base ativa",
        description:
          "Troque o exercicio ativo do IRPF e valide a base anual usada pelas respostas.",
        href: "/chat",
        cta: "Abrir gestao no chat",
        icon: Settings2,
      });
      cards.push({
        title: "Gerenciar usuarios",
        description:
          "Acompanhe contas ativas, ajuste papel e plano e cadastre novos usuarios.",
        href: "/admin/users",
        cta: "Abrir painel admin",
        icon: ShieldCheck,
      });
      cards.push({
        title: "Painel de billing",
        description:
          "Veja provider, checkout, webhook e o panorama comercial atual da assinatura.",
        href: "/admin/billing",
        cta: "Abrir billing",
        icon: Sparkles,
      });
      cards.push({
        title: "Auditoria de seguranca",
        description:
          "Acompanhe eventos sensiveis, trocas de provider, acoes admin e fluxos locais de teste.",
        href: "/admin/audit",
        cta: "Abrir auditoria",
        icon: ShieldCheck,
      });
    }

    if (!isPremiumPlan(authUser?.plan)) {
      cards.push({
        title: "Upgrade de plano",
        description:
          "Libere upload de documentos e conversas sem limite ao migrar para o plano Premium.",
        href: "/upgrade",
        cta: "Conhecer Premium",
        icon: Sparkles,
      });
    }

    return cards;
  }, [authUser?.plan, authUser?.role, uploadAllowed]);

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#020617_100%)] text-slate-100">
        <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12 lg:px-10">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] px-6 py-5 text-sm text-slate-300 shadow-[0_30px_80px_rgba(2,6,23,0.18)] backdrop-blur-xl">
            Validando sessao...
          </div>
        </section>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#020617_100%)] text-slate-100">
        <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-12 lg:px-10">
          <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/90">
                  DeclarIA
                </div>
                <div className="inline-flex rounded-full border border-sky-400/20 bg-sky-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100">
                  Login seguro
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white lg:text-6xl">
                  Seu copiloto para duvidas, triagem e historico de imposto de renda.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 lg:text-lg">
                  Entre para conversar com a IA, acompanhar seus documentos e destravar um fluxo mais guiado de declaracao.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={checkingAuth}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_40px_rgba(16,185,129,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShieldCheck size={18} />
                  Entrar com Authentik
                </button>
                <a
                  href="/chat"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                >
                  Ja estou autenticado
                </a>
              </div>

              <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-500/10 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100/90">
                  Acesso local de desenvolvimento
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-50/90">
                  Use estes atalhos para testar rapidamente os perfis locais sem passar pelo login externo.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    {
                      email: "usuario.free@declaria.local",
                      name: "Usuario Free",
                      label: "Entrar como Free",
                    },
                    {
                      email: "tecnico@declaria.local",
                      name: "Time Tecnico",
                      label: "Entrar como Tecnico",
                    },
                    {
                      email: "admin@declaria.local",
                      name: "Administrador",
                      label: "Entrar como Admin",
                    },
                  ].map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => handleDevLogin(account.email, account.name)}
                      disabled={loggingInAs !== null}
                      className="inline-flex rounded-full border border-amber-200/20 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-amber-50 transition hover:-translate-y-0.5 hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loggingInAs === account.email ? "Entrando..." : account.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.18)] backdrop-blur-xl">
              <div className="flex items-center gap-3 text-emerald-200">
                <Sparkles size={18} />
                <span className="text-sm font-medium">O que voce encontra ao entrar</span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="text-sm font-semibold text-white">Perguntas diretas</div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Pergunte sobre declaracao, deducoes, FGTS, financiamentos e outros temas do IR.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="text-sm font-semibold text-white">Triagem guiada</div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Siga perguntas curtas para montar um panorama do seu caso e chegar a um checklist final.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="text-sm font-semibold text-white">Documentos e historico</div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Seus arquivos e conversas ficam ligados a conta para retomar o contexto com mais seguranca.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.10),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#020617_100%)] text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl px-6 py-10 lg:px-10">
        <div className="w-full space-y-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.18)] backdrop-blur-xl lg:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/90">
                DeclarIA
              </div>
              <div
                className={`inline-flex rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${getRoleTone(
                  authUser.role
                )}`}
              >
                {getRoleLabel(authUser.role)}
              </div>
              <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-200">
                Plano {getPlanLabel(authUser.plan)}
              </div>
              <div
                className={`inline-flex rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${getSubscriptionTone(
                  subscriptionStatus
                )}`}
              >
                {subscriptionStatusLabel}
              </div>
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white lg:text-5xl">
                  Bem-vindo de volta, {authUser.name?.split(" ")[0] || "voce"}.
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300 lg:text-lg">
                  Sua navegacao agora se adapta ao papel da conta e ao plano ativo. Voce ve primeiro o que ajuda no seu fluxo, sem perder acesso ao que importa.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-4">
                <div className="flex items-center gap-2 text-emerald-200">
                  <Sparkles size={16} />
                  <span className="text-sm font-medium">Como esta conta esta configurada</span>
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <div>
                    <strong>Papel:</strong> {getRoleLabel(authUser.role)}
                  </div>
                  <div>
                    <strong>Plano:</strong> {getPlanLabel(authUser.plan)}
                  </div>
                  <div>
                    <strong>Assinatura:</strong> {subscriptionStatusLabel}
                  </div>
                  <div>
                    <strong>Upload:</strong> {uploadAllowed ? "liberado" : "disponivel no Premium"}
                  </div>
                  <div>
                    <strong>Chat:</strong>{" "}
                    {remainingInteractions == null
                      ? "sem limite configurado para este plano"
                      : `${remainingInteractions} interacoes restantes neste mes`}
                  </div>
                  {canAccessTechnicalUploads(authUser.role) ? (
                    <div>
                      <strong>Observabilidade:</strong> habilitada para revisar OCR, parser e mapeamento.
                    </div>
                  ) : null}
                  {canManageKnowledgeBase(authUser.role) ? (
                    <div>
                      <strong>Base ativa:</strong> pode ser trocada no perfil dentro do chat.
                    </div>
                  ) : null}
                </div>
                {subscriptionStatus === "past_due" ? (
                  <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/10 px-3 py-3 text-sm leading-6 text-amber-100">
                    Seu pagamento esta pendente. Abra a area de upgrade para regularizar a assinatura.
                  </div>
                ) : null}
                {subscriptionStatus === "canceled" ? (
                  <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-3 py-3 text-sm leading-6 text-rose-100">
                    Sua assinatura foi cancelada. Se quiser voltar a usar documentos e conversas estendidas, faca um novo upgrade.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {roleCards.map((card) => {
              const Icon = card.icon;
              const cardContent = (
                <>
                  <div className="inline-flex rounded-2xl border border-white/10 bg-slate-950/35 p-3 text-emerald-200">
                    <Icon size={20} />
                  </div>
                  <div className="mt-4 text-lg font-semibold text-white">{card.title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{card.description}</p>
                  {card.disabledReason ? (
                    <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                      {card.disabledReason}
                    </div>
                  ) : null}
                  <div className="mt-5 text-sm font-medium text-emerald-200 transition group-hover:text-emerald-100">
                    {card.cta}
                  </div>
                </>
              );

              if (card.disabled) {
                return (
                  <div
                    key={card.href}
                    className="group rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 opacity-80 shadow-[0_24px_60px_rgba(2,6,23,0.14)] backdrop-blur-xl"
                  >
                    {cardContent}
                  </div>
                );
              }

              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group rounded-[1.6rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_60px_rgba(2,6,23,0.14)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.06]"
                >
                  {cardContent}
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
