"use client";

import { useEffect, useState } from "react";
import { FileCheck2, ShieldCheck, Sparkles } from "lucide-react";

import AuthenticatedDashboard from "@/components/dashboard/AuthenticatedDashboard";
import { devLogin, getAuthStatus, getLoginUrl } from "@/services/api";
import type { AuthUser } from "@/types/chat";

export default function LandingPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loggingInAs, setLoggingInAs] = useState<string | null>(null);
  const showDevelopmentAccess = process.env.NODE_ENV === "development";

  useEffect(() => {
    let active = true;
    getAuthStatus()
      .then((status) => {
        if (active) setAuthUser(status.user);
      })
      .finally(() => {
        if (active) setCheckingAuth(false);
      });
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
      const status = await devLogin({ email, name });
      setAuthUser(status.user);
    } finally {
      setLoggingInAs(null);
    }
  }

  if (checkingAuth) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#07101f] text-slate-100">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5 text-sm text-slate-300" role="status">
          Validando sessão…
        </div>
      </main>
    );
  }

  if (authUser) {
    return <AuthenticatedDashboard user={authUser} />;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_55%,#020617_100%)] text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-10 sm:px-8 lg:px-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
              <FileCheck2 size={15} /> DeclarIA
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Sua declaração organizada, do primeiro documento à revisão final.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 lg:text-lg">
              Um copiloto para tirar dúvidas, organizar documentos e acompanhar cada etapa do seu Imposto de Renda.
            </p>
            <button type="button" onClick={handleLogin} className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_40px_rgba(16,185,129,0.25)] hover:bg-emerald-300">
              <ShieldCheck size={18} /> Entrar com Authentik
            </button>

            {showDevelopmentAccess ? (
              <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">Acesso local de desenvolvimento</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    ["usuario.free@declaria.local", "Usuario Free", "Free"],
                    ["tecnico@declaria.local", "Time Tecnico", "Técnico"],
                    ["admin@declaria.local", "Administrador", "Admin"],
                  ].map(([email, name, label]) => (
                    <button key={email} type="button" onClick={() => handleDevLogin(email, name)} disabled={loggingInAs !== null} className="rounded-full border border-amber-200/20 bg-white/[0.08] px-3 py-1.5 text-xs text-amber-50 hover:bg-white/[0.14] disabled:opacity-50">
                      {loggingInAs === email ? "Entrando…" : `Entrar como ${label}`}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.18)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-200"><Sparkles size={18} /> Prévia demonstrativa</div>
            <div className="mt-6 space-y-4">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-emerald-400 px-4 py-3 text-sm leading-6 text-slate-950">Recebi um informe de rendimentos. Qual é o próximo passo?</div>
              <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-white/10 bg-slate-950/55 p-4">
                <div className="text-sm font-semibold text-white">DeclarIA</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">Vamos identificar o documento, conferir o ano-calendário e organizar os campos que precisam de revisão.</p>
                <div className="mt-3 inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">Próxima ação: enviar o informe</div>
              </div>
              <div className="rounded-2xl border border-sky-300/15 bg-sky-400/10 px-4 py-3 text-xs leading-5 text-sky-100">Exemplo ilustrativo. Confirme os dados e fontes antes do uso fiscal.</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
