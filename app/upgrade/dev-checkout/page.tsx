"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, CreditCard, Loader2, XCircle } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { ApiError, completeDevBillingCheckout } from "@/services/api";

export default function DevCheckoutPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleConfirm() {
    try {
      setSubmitting(true);
      setErrorMessage(null);
      await completeDevBillingCheckout();
      router.push("/upgrade?checkout=success");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nao foi possivel concluir o checkout local agora.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell activeSection="upgrade" maxWidth="max-w-3xl" forceDark>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.18)] backdrop-blur-xl lg:p-8">
          <div className="inline-flex rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-100">
            Checkout local de teste
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-white">Simular compra do Premium</h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Esta etapa existe para validar a jornada de compra no ambiente local antes de conectar Stripe ou Asaas.
            Ao confirmar, sua conta atual sera promovida para o plano Premium usando o fluxo interno de teste.
          </p>

          <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-5">
            <div className="flex items-center gap-2 text-slate-100">
              <CreditCard size={18} />
              <span className="text-lg font-semibold">O que esta simulacao valida</span>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-300" />
                <span>Redirecionamento do upgrade para um checkout hospedado.</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-300" />
                <span>Ativacao do plano Premium na conta atual.</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-300" />
                <span>Retorno para o <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-100">/upgrade</code> com status de sucesso.</span>
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Confirmar compra de teste
            </button>
            <Link
              href="/upgrade?checkout=cancel"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
            >
              <XCircle size={16} />
              Cancelar simulacao
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
