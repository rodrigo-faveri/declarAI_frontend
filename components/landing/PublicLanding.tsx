"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CirclePlay,
  FileCheck2,
  FileText,
  FolderCheck,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

type DemoKey = "document" | "question" | "progress";

type PublicLandingProps = {
  loggingInAs: string | null;
  onDevLogin: (email: string, name: string) => void | Promise<void>;
  onLogin: () => void;
  showDevelopmentAccess: boolean;
};

const demos: Record<
  DemoKey,
  {
    label: string;
    description: string;
    prompt: string;
    answer: string;
    action: string;
    icon: typeof MessageSquareText;
  }
> = {
  document: {
    label: "Organizar documentos",
    description: "Informe de rendimentos, recibos e comprovantes",
    prompt: "Recebi um informe de rendimentos. O que faço com ele na declaração?",
    answer:
      "Primeiro, confirme o ano-calendário e a fonte pagadora. Depois do envio, o DeclarIA identifica os dados do documento e sinaliza o que precisa da sua revisão.",
    action: "Simular envio do informe",
    icon: FileText,
  },
  question: {
    label: "Tirar dúvidas",
    description: "Orientação contextual com fontes disponíveis",
    prompt: "Uma despesa médica reembolsada pode ser declarada integralmente?",
    answer:
      "O tratamento depende do valor efetivamente pago e do reembolso recebido. Posso ajudar a organizar os valores e mostrar as fontes cadastradas para sua conferência.",
    action: "Ver fontes do exemplo",
    icon: MessageSquareText,
  },
  progress: {
    label: "Acompanhar a declaração",
    description: "Pendências e próximas ações em um só lugar",
    prompt: "O que ainda falta revisar antes de finalizar minha declaração?",
    answer:
      "Há dois itens aguardando sua confirmação: um rendimento e uma despesa. Ao revisar os dados, seu painel atualiza o progresso e indica a próxima etapa.",
    action: "Visualizar pendências",
    icon: CheckCircle2,
  },
};

const devProfiles = [
  ["usuario.free@declaria.local", "Usuario Free", "Free"],
  ["tecnico@declaria.local", "Time Tecnico", "Técnico"],
  ["admin@declaria.local", "Administrador", "Admin"],
] as const;

export default function PublicLanding({
  loggingInAs,
  onDevLogin,
  onLogin,
  showDevelopmentAccess,
}: PublicLandingProps) {
  const [activeDemo, setActiveDemo] = useState<DemoKey>("document");
  const demoRef = useRef<HTMLDivElement>(null);
  const demo = demos[activeDemo];

  function showDemo() {
    const demoElement = demoRef.current;
    if (!demoElement) return;

    demoElement.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => demoElement.focus(), 450);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#04101d] text-slate-100">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-52 h-[34rem] w-[48rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-40 top-0 h-[34rem] w-[48rem] rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
      </div>

      <header className="relative z-20 border-b border-white/[0.07] bg-[#04101d]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="#inicio" className="flex items-center gap-3" aria-label="DeclarIA — início">
            <span className="grid size-10 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
              <FileCheck2 size={23} strokeWidth={1.8} />
            </span>
            <span className="text-xl font-bold tracking-tight text-white">
              Declar<span className="text-emerald-400">IA</span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex" aria-label="Navegação principal">
            <a className="transition-colors hover:text-white" href="#como-funciona">Como funciona</a>
            <a className="transition-colors hover:text-white" href="#funcionalidades">Funcionalidades</a>
          </nav>

          <button
            type="button"
            onClick={onLogin}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-slate-950 shadow-[0_12px_34px_rgba(16,185,129,0.2)] transition hover:bg-emerald-300 sm:px-5"
          >
            <ShieldCheck size={17} />
            <span className="hidden sm:inline">Entrar com Authentik</span>
            <span className="sm:hidden">Entrar</span>
          </button>
        </div>
      </header>

      <section id="inicio" className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:px-12 lg:pb-20 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[0.82fr_1.18fr] xl:gap-16">
          <div className="max-w-2xl">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/[0.08] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                <Sparkles size={13} /> Assistente fiscal com IA
              </span>
              <span className="inline-flex items-center rounded-full border border-sky-300/25 bg-sky-400/[0.08] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                IRPF 2026
              </span>
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-[1.06] tracking-[-0.045em] text-white sm:text-5xl lg:text-[3.6rem] xl:text-[4.15rem]">
              Seu Imposto de Renda, <span className="text-emerald-400">mais simples com IA.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Tire dúvidas, organize seus documentos e acompanhe cada etapa da declaração em um único lugar, sempre com você no controle da revisão final.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onLogin}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 text-sm font-bold text-slate-950 shadow-[0_18px_45px_rgba(16,185,129,0.25)] transition hover:-translate-y-0.5 hover:bg-emerald-300"
              >
                Começar gratuitamente <ArrowRight size={18} />
              </button>
              <button
                type="button"
                onClick={showDemo}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.035] px-6 text-sm font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/[0.07]"
              >
                <CirclePlay size={19} className="text-emerald-300" /> Veja como funciona
              </button>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Acesso pela autenticação segura configurada no ambiente. O DeclarIA apoia sua organização e não substitui a conferência profissional.
            </p>

            {showDevelopmentAccess ? (
              <details className="mt-6 max-w-xl rounded-xl border border-amber-300/15 bg-amber-400/[0.04] p-3 text-xs text-amber-100/80">
                <summary className="cursor-pointer select-none font-semibold uppercase tracking-[0.16em]">
                  Acessos de desenvolvimento
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {devProfiles.map(([email, name, label]) => (
                    <button
                      key={email}
                      type="button"
                      onClick={() => onDevLogin(email, name)}
                      disabled={loggingInAs !== null}
                      className="rounded-full border border-amber-200/20 bg-white/[0.06] px-3 py-1.5 text-amber-50 transition hover:bg-white/[0.12] disabled:opacity-50"
                    >
                      {loggingInAs === email ? "Entrando…" : `Entrar como ${label}`}
                    </button>
                  ))}
                </div>
              </details>
            ) : null}
          </div>

          <div
            ref={demoRef}
            id="demonstracao"
            tabIndex={-1}
            aria-label="Demonstração interativa do DeclarIA"
            className="scroll-mt-24 rounded-[2rem] border border-emerald-300/15 bg-[#071426]/85 p-3 shadow-[0_35px_100px_rgba(0,0,0,0.38)] outline-none ring-emerald-300/40 backdrop-blur-xl focus-visible:ring-2 sm:p-4"
          >
            <div className="rounded-[1.45rem] border border-white/[0.08] bg-gradient-to-br from-[#0b1d31] to-[#071222] p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Bot size={20} className="text-emerald-300" /> Veja o DeclarIA em ação
                </div>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                  Simulação
                </span>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_17rem]">
                <div className="min-w-0">
                  <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-gradient-to-r from-emerald-400 to-teal-300 px-4 py-3.5 text-sm font-medium leading-6 text-slate-950 shadow-[0_12px_30px_rgba(16,185,129,0.15)]">
                    {demo.prompt}
                  </div>

                  <div className="mt-4 max-w-[94%] rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.035] p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
                        <Bot size={20} />
                      </span>
                      <span className="font-semibold text-white">DeclarIA</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{demo.answer}</p>
                    <button
                      type="button"
                      onClick={onLogin}
                      className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-400 px-4 text-xs font-bold text-slate-950 transition hover:bg-emerald-300"
                    >
                      <Upload size={15} /> {demo.action}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-3">
                  <div className="px-2 pb-2 text-xs font-semibold text-slate-300">Experimente um fluxo</div>
                  <div className="space-y-2" role="list" aria-label="Cenários da demonstração">
                    {(Object.entries(demos) as [DemoKey, (typeof demos)[DemoKey]][]).map(([key, item]) => {
                      const Icon = item.icon;
                      const selected = activeDemo === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setActiveDemo(key)}
                          aria-pressed={selected}
                          className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                            selected
                              ? "border-emerald-300/25 bg-emerald-400/10"
                              : "border-transparent bg-white/[0.035] hover:bg-white/[0.07]"
                          }`}
                        >
                          <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${selected ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.06] text-slate-300"}`}>
                            <Icon size={18} />
                          </span>
                          <span>
                            <span className="block text-xs font-semibold text-white">{item.label}</span>
                            <span className="mt-1 block text-[11px] leading-4 text-slate-400">{item.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="relative z-10 border-y border-white/[0.07] bg-white/[0.018]">
        <div className="mx-auto grid w-full max-w-[1440px] gap-px px-5 py-4 sm:px-8 md:grid-cols-3 lg:px-12">
          {[
            {
              icon: MessageSquareText,
              title: "Orientação contextual",
              text: "Respostas ligadas ao seu momento da declaração e às fontes disponíveis no sistema.",
            },
            {
              icon: FolderCheck,
              title: "Documentos organizados",
              text: "Envie comprovantes e acompanhe os dados identificados que ainda precisam de revisão.",
            },
            {
              icon: CheckCircle2,
              title: "Progresso visível",
              text: "Veja etapas concluídas, pendências e a próxima ação recomendada no seu painel.",
            },
          ].map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article key={benefit.title} className="flex gap-4 border-white/[0.08] px-2 py-6 md:border-r md:px-6 md:last:border-r-0 lg:px-8">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-400/[0.08] text-emerald-300">
                  <Icon size={23} />
                </span>
                <div>
                  <h2 className="font-semibold text-white">{benefit.title}</h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-400">{benefit.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="como-funciona" className="relative z-10 mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Como funciona</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Da primeira dúvida à revisão final</h2>
          <p className="mt-4 leading-7 text-slate-400">O DeclarIA reúne sua jornada sem tirar de você a decisão sobre os dados que serão usados.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["01", "Converse", "Conte sua dúvida ou o ponto da declaração em que precisa de ajuda."],
            ["02", "Organize", "Envie documentos e confira as informações identificadas pelo sistema."],
            ["03", "Revise", "Acompanhe pendências e valide os dados antes de concluir sua jornada."],
          ].map(([number, title, text]) => (
            <article key={number} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
              <span className="text-sm font-bold text-emerald-300">{number}</span>
              <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 text-center">
          <button type="button" onClick={onLogin} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 text-sm font-bold text-slate-950 transition hover:bg-emerald-300">
            Começar agora <ArrowRight size={17} />
          </button>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.07] px-5 py-7 text-center text-xs leading-5 text-slate-500">
        DeclarIA é uma ferramenta de apoio à organização e revisão. Confira as informações antes do uso fiscal.
      </footer>
    </main>
  );
}
