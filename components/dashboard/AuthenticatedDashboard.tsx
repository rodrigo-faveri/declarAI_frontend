"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  FileCheck2,
  FileText,
  GraduationCap,
  MessageSquare,
  MoreHorizontal,
  Upload,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  canAccessTechnicalUploads,
  isPremiumPlan,
} from "@/lib/access-control";
import {
  getCurrentDeclarationDraft,
  listConversations,
  listMyUploads,
} from "@/services/api";
import type {
  AuthUser,
  ConversationSummary,
  DeclarationDraft,
  UploadRecordSummary,
} from "@/types/chat";

type DashboardData = {
  conversations: ConversationSummary[];
  draft: DeclarationDraft | null;
  uploads: UploadRecordSummary[];
  uploadTotal: number;
};

const EMPTY_DATA: DashboardData = {
  conversations: [],
  draft: null,
  uploads: [],
  uploadTotal: 0,
};

const DOCUMENT_COLORS = ["bg-emerald-400", "bg-sky-400", "bg-violet-400", "bg-slate-400"];

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function documentKindLabel(value?: string | null) {
  if (!value) return "Outros";
  const normalized = value.toLowerCase();
  if (normalized.includes("rendimento")) return "Comprovantes de rendimentos";
  if (normalized.includes("banco") || normalized.includes("banc")) return "Informes bancários";
  if (normalized.includes("medic") || normalized.includes("saude")) return "Despesas dedutíveis";
  if (normalized.includes("invest") || normalized.includes("corretora")) return "Investimentos";
  return value.replaceAll("_", " ");
}

export function buildProgress(draft: DeclarationDraft | null, uploadTotal: number) {
  const sheetCount = draft?.summary.sheet_count ?? 0;
  const reviewedSheetCount = draft?.summary.reviewed_sheet_count ?? 0;
  const filingReady = draft?.final_review.user_filing_status === "ready_for_filing";
  const steps = [
    { label: "Conta", complete: true },
    { label: "Documentos", complete: uploadTotal > 0 },
    { label: "Organização", complete: sheetCount > 0 },
    { label: "Revisão", complete: sheetCount > 0 && reviewedSheetCount >= sheetCount },
    { label: "Conferência", complete: Boolean(draft?.pre_submit.ready) },
    { label: "Pronto", complete: filingReady },
  ];
  const completed = steps.filter((step) => step.complete).length;
  return { completed, percentage: Math.round((completed / steps.length) * 100), steps };
}

export function getNextAction(draft: DeclarationDraft | null, uploadTotal: number) {
  if (uploadTotal === 0) {
    return {
      title: "Envie seu primeiro documento",
      description: "Adicione informes e comprovantes para iniciar a organização da declaração.",
      href: "/chat?prompt=Quero enviar e analisar meu primeiro documento",
      cta: "Enviar documento",
    };
  }
  if (!draft || draft.status === "empty") {
    return {
      title: "Organize os documentos enviados",
      description: "Gere o rascunho para transformar os arquivos em fichas revisáveis.",
      href: "/declaracao",
      cta: "Montar rascunho",
    };
  }
  if (draft.summary.review_item_count > 0 || draft.summary.pending_item_count > 0) {
    const pending = draft.summary.review_item_count + draft.summary.pending_item_count;
    return {
      title: `Revise ${pending} ${pending === 1 ? "item pendente" : "itens pendentes"}`,
      description: draft.final_checklist.next_step || "Confirme os dados sinalizados antes de avançar.",
      href: "/declaracao",
      cta: "Continuar revisão",
    };
  }
  return {
    title: draft.pre_submit.ready ? "Faça a conferência final" : "Continue sua declaração",
    description: draft.pre_submit.next_step || draft.final_checklist.next_step || "Confira os dados consolidados e avance para a próxima etapa.",
    href: "/declaracao",
    cta: "Continuar",
  };
}

export default function AuthenticatedDashboard({ user }: { user: AuthUser }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      const [conversationsResult, uploadsResult, draftResult] = await Promise.allSettled([
        listConversations(),
        listMyUploads(50),
        getCurrentDeclarationDraft(),
      ]);
      if (!active) return;
      setData({
        conversations: conversationsResult.status === "fulfilled" ? conversationsResult.value : [],
        uploads: uploadsResult.status === "fulfilled" ? uploadsResult.value.items : [],
        uploadTotal: uploadsResult.status === "fulfilled" ? uploadsResult.value.total : 0,
        draft: draftResult.status === "fulfilled" ? draftResult.value : null,
      });
      setLoading(false);
    }
    void loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const progress = useMemo(() => buildProgress(data.draft, data.uploadTotal), [data.draft, data.uploadTotal]);
  const nextAction = useMemo(() => getNextAction(data.draft, data.uploadTotal), [data.draft, data.uploadTotal]);
  const documentGroups = useMemo(() => {
    const counts = new Map<string, number>();
    data.uploads.forEach((upload) => {
      const label = documentKindLabel(upload.user_confirmed_document_kind || upload.document_kind);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 4);
  }, [data.uploads]);

  const taxYear = data.draft?.tax_year;
  const uploadAllowed = user.usage?.uploads_allowed ?? (isPremiumPlan(user.plan) || canAccessTechnicalUploads(user.role));
  const quickActions = [
    { label: "Conversar com a IA", description: "Tire dúvidas sobre o IRPF", href: "/chat", icon: MessageSquare, tone: "emerald" },
    { label: "Enviar documentos", description: uploadAllowed ? "Analise informes e comprovantes" : "Disponível no Premium", href: uploadAllowed ? "/chat?prompt=Quero enviar e analisar um documento" : "/upgrade", icon: Upload, tone: "sky" },
    { label: "Ver rascunho", description: "Acompanhe e revise suas informações", href: "/declaracao", icon: FileText, tone: "amber" },
    { label: "Aprender sobre o IR", description: "Guias, dicas e orientações", href: "/chat?prompt=Quero aprender os principais passos da declaração do IRPF", icon: GraduationCap, tone: "violet" },
  ] as const;
  const panelTone = isDark
    ? "border-white/8 bg-[#0d1a2d]"
    : "border-slate-200 bg-white shadow-[0_14px_36px_rgba(100,116,139,0.10)]";
  const headingTone = isDark ? "text-white" : "text-slate-950";
  const mutedTone = isDark ? "text-slate-400" : "text-slate-600";
  const subtleTone = isDark ? "text-slate-500" : "text-slate-500";
  const subpanelTone = isDark
    ? "border-white/8 bg-slate-900/35 hover:border-white/15 hover:bg-slate-800/60"
    : "border-slate-200 bg-slate-50 hover:border-emerald-200 hover:bg-emerald-50/50";

  return (
    <AppShell activeSection="home" user={user} taxYear={taxYear} maxWidth="max-w-[1400px]">
      <div className="space-y-4">
              <section className={`grid overflow-hidden rounded-2xl border lg:grid-cols-[1.08fr_0.92fr] ${panelTone}`}>
                <div className="p-6 sm:p-8 xl:p-10">
                  <p className={`text-sm ${mutedTone}`}>Olá 👋</p>
                  <h1 className={`mt-2 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl xl:text-5xl ${headingTone}`}>Vamos cuidar da sua declaração {taxYear ? `do IRPF ${taxYear}` : "de IRPF"}?</h1>
                  <p className={`mt-4 max-w-xl text-sm leading-6 sm:text-base ${mutedTone}`}>Tire dúvidas, organize seus documentos e acompanhe o progresso da sua declaração com ajuda da IA.</p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Link href="/chat" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"><MessageSquare size={16} /> Fazer uma pergunta <ArrowRight size={15} /></Link>
                    <Link href={uploadAllowed ? "/chat?prompt=Quero enviar e analisar um documento" : "/upgrade"} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition ${isDark ? "border-white/10 bg-slate-800/65 text-slate-200 hover:bg-slate-700/70" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"}`}><Upload size={16} /> Enviar documentos</Link>
                  </div>
                </div>
                <div className={`relative min-h-72 overflow-hidden p-5 ${isDark ? "bg-[radial-gradient(circle_at_75%_35%,rgba(37,99,235,0.55),transparent_34%),radial-gradient(circle_at_35%_80%,rgba(16,185,129,0.45),transparent_38%),linear-gradient(135deg,#071629,#0c2552)]" : "bg-[radial-gradient(circle_at_76%_30%,rgba(59,130,246,0.22),transparent_36%),radial-gradient(circle_at_34%_82%,rgba(16,185,129,0.20),transparent_40%),linear-gradient(135deg,#eff6ff,#e8f4f2)]"}`}>
                  <div className="relative z-10 grid max-w-xs gap-2">
                    {([[FileText, "Analisa seus documentos"], [Bot, "Responde suas dúvidas com base na legislação"], [FileCheck2, "Ajuda a revisar e evitar erros"]] as const).map(([Icon, label]) => <div key={label} className={`flex items-center gap-3 rounded-xl border p-3 text-xs backdrop-blur ${isDark ? "border-white/8 bg-slate-950/35 text-slate-200" : "border-white/80 bg-white/85 text-slate-700 shadow-[0_10px_28px_rgba(59,130,246,0.10)]"}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${isDark ? "bg-emerald-400/15 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}><Icon size={17} /></span>{label}</div>)}
                  </div>
                  <div className="absolute -bottom-10 right-4 w-44 rotate-[-6deg] rounded-xl bg-slate-50 p-5 pb-16 text-center shadow-2xl sm:right-10 sm:w-52"><div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-blue-100 text-blue-700"><FileCheck2 size={28} /></div><div className="mt-3 text-sm font-bold text-blue-900">Receita Federal</div><div className="text-xl font-black text-blue-800">IRPF {taxYear || ""}</div><div className="mt-5 space-y-2"><div className="h-2 rounded bg-slate-200" /><div className="h-2 w-4/5 rounded bg-slate-200" /><div className="h-2 rounded bg-slate-200" /></div><span className="absolute -left-3 bottom-12 grid h-11 w-11 place-items-center rounded-full border-4 border-slate-50 bg-emerald-400 text-slate-950"><Check size={20} strokeWidth={3} /></span></div>
                </div>
              </section>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.75fr)]">
                <section className={`rounded-2xl border p-5 sm:p-6 ${panelTone}`} aria-labelledby="progress-title">
                  <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="progress-title" className={`font-semibold ${headingTone}`}>Progresso da sua declaração</h2><span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Em andamento</span></div>
                  <div className="mt-5 grid items-center gap-6 sm:grid-cols-[112px_1fr]">
                    <div className="relative mx-auto grid h-24 w-24 place-items-center rounded-full" style={{ background: `conic-gradient(#34d399 ${progress.percentage}%, ${isDark ? "#26354b" : "#e2e8f0"} 0)` }}><div className={`grid h-[72px] w-[72px] place-items-center rounded-full text-xl font-bold ${isDark ? "bg-[#0d1a2d] text-white" : "bg-white text-slate-950"}`}>{loading ? "—" : `${progress.percentage}%`}</div></div>
                    <div><div className={`mb-2 text-xs ${mutedTone}`}>Etapas concluídas: <strong className={isDark ? "text-slate-200" : "text-slate-800"}>{progress.completed} de {progress.steps.length}</strong></div><div className={`h-2 overflow-hidden rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`}><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all" style={{ width: `${progress.percentage}%` }} /></div><ol className="mt-5 grid grid-cols-3 gap-y-4 sm:grid-cols-6">{progress.steps.map((step, index) => { const active = !step.complete && progress.steps.slice(0, index).every((item) => item.complete); return <li key={step.label} className="text-center"><span className={`mx-auto grid h-6 w-6 place-items-center rounded-full border text-[10px] font-semibold ${step.complete ? "border-emerald-400 bg-emerald-400 text-slate-950" : active ? "border-cyan-300 bg-cyan-300 text-slate-950" : isDark ? "border-slate-600 text-slate-500" : "border-slate-300 text-slate-500"}`}>{step.complete ? <Check size={13} /> : index + 1}</span><span className={`mt-1 block text-[10px] ${active ? `font-medium ${headingTone}` : subtleTone}`}>{step.label}</span></li>; })}</ol></div>
                  </div>
                </section>
                <section className={`rounded-2xl border p-5 sm:p-6 ${panelTone}`} aria-labelledby="next-step-title"><h2 id="next-step-title" className={`font-semibold ${headingTone}`}>Próximo passo</h2><div className="mt-4 flex gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${isDark ? "bg-slate-800 text-slate-200" : "bg-emerald-50 text-emerald-700"}`}><FileText size={19} /></span><div><div className={`text-sm font-medium ${headingTone}`}>{nextAction.title}</div><p className={`mt-1 text-xs leading-5 ${mutedTone}`}>{nextAction.description}</p></div></div><Link href={nextAction.href} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300">{nextAction.cta} <ArrowRight size={15} /></Link></section>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.75fr)]">
                <section className={`rounded-2xl border p-5 ${panelTone}`} aria-labelledby="quick-actions-title"><h2 id="quick-actions-title" className={`font-semibold ${headingTone}`}>Ações rápidas</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{quickActions.map((action) => { const Icon = action.icon; const tones = { emerald: "bg-emerald-400/15 text-emerald-500", sky: "bg-sky-400/15 text-sky-500", amber: "bg-amber-400/15 text-amber-500", violet: "bg-violet-400/15 text-violet-500" }; return <Link key={action.label} href={action.href} className={`group rounded-xl border p-4 transition hover:-translate-y-0.5 ${subpanelTone}`}><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[action.tone]}`}><Icon size={19} /></span><div className={`mt-3 text-sm font-semibold ${headingTone}`}>{action.label}</div><div className={`mt-1 text-xs leading-5 ${subtleTone}`}>{action.description}</div></Link>; })}</div></section>
                <section className={`rounded-2xl border p-5 ${panelTone}`} aria-labelledby="documents-title"><div className="flex items-center justify-between gap-3"><h2 id="documents-title" className={`font-semibold ${headingTone}`}>Meus documentos</h2><Link href="/documentos" className="inline-flex items-center gap-1 text-xs text-sky-500 hover:text-sky-600">Ver todos <ChevronRight size={13} /></Link></div><p className={`mt-3 text-xs ${mutedTone}`}>{data.uploadTotal} {data.uploadTotal === 1 ? "documento enviado" : "documentos enviados"}</p>{documentGroups.length ? <><div className={`mt-3 flex h-2 overflow-hidden rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>{documentGroups.map(([label, count], index) => <span key={label} className={DOCUMENT_COLORS[index]} style={{ width: `${Math.max(10, (count / data.uploadTotal) * 100)}%` }} />)}</div><ul className="mt-3 space-y-2">{documentGroups.map(([label, count], index) => <li key={label} className={`flex items-center justify-between gap-3 text-[11px] ${mutedTone}`}><span className="flex min-w-0 items-center gap-2"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOCUMENT_COLORS[index]}`} /><span className="truncate">{label}</span></span><strong className={isDark ? "text-slate-300" : "text-slate-700"}>{count}</strong></li>)}</ul></> : <p className={`mt-4 text-xs leading-5 ${subtleTone}`}>Seus documentos aparecerão aqui depois do primeiro envio.</p>}</section>
              </div>

              <section className={`overflow-hidden rounded-2xl border ${panelTone}`} aria-labelledby="recent-conversations-title"><div className={`flex items-center justify-between gap-3 border-b px-5 py-4 ${isDark ? "border-white/8" : "border-slate-200"}`}><h2 id="recent-conversations-title" className={`font-semibold ${headingTone}`}>Conversas recentes</h2><Link href="/historico" className="inline-flex items-center gap-1 text-xs text-sky-500 hover:text-sky-600">Ver todas <ChevronRight size={13} /></Link></div>{data.conversations.length ? <div className={isDark ? "divide-y divide-white/5" : "divide-y divide-slate-100"}>{data.conversations.slice(0, 4).map((conversation) => <Link key={conversation.id} href={`/chat?conversation=${encodeURIComponent(conversation.id)}`} className={`grid gap-2 px-5 py-3.5 transition sm:grid-cols-[minmax(220px,0.8fr)_minmax(260px,1.2fr)_100px_32px] sm:items-center ${isDark ? "hover:bg-white/[0.025]" : "hover:bg-slate-50"}`}><div className="flex min-w-0 items-center gap-3"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${isDark ? "bg-slate-800 text-slate-300" : "bg-emerald-50 text-emerald-700"}`}><MessageSquare size={14} /></span><span className={`truncate text-xs font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>{conversation.title}</span></div><span className={`truncate text-xs ${subtleTone}`}>{conversation.preview}</span><span className={`text-[11px] ${subtleTone}`}>{formatShortDate(conversation.updated_at)}</span><MoreHorizontal className={`hidden sm:block ${isDark ? "text-slate-600" : "text-slate-400"}`} size={16} /></Link>)}</div> : <div className={`px-5 py-8 text-center text-sm ${subtleTone}`}>Sua primeira conversa aparecerá aqui. <Link href="/chat" className="text-emerald-500">Começar agora</Link></div>}</section>
      </div>
    </AppShell>
  );
}
