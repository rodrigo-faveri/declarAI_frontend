"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MessageSquare,
  MessagesSquare,
  Plus,
  Search,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getAuthStatus, listConversations } from "@/services/api";
import type { AuthUser, ConversationSummary } from "@/types/chat";

function formatConversationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function conversationTypeLabel(conversation: ConversationSummary) {
  if (conversation.triage_active && !conversation.triage_finished) return "Triagem em andamento";
  if (conversation.triage_finished) return "Triagem concluída";
  return conversation.mode === "triage" ? "Triagem" : "Conversa";
}

async function fetchConversationHistory() {
  const status = await getAuthStatus();
  if (!status.authenticated || !status.user) {
    return { user: null, conversations: [] as ConversationSummary[] };
  }
  const items = await listConversations();
  return {
    user: status.user,
    conversations: [...items].sort(
      (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    ),
  };
}

export default function ConversationHistoryPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    async function hydrateHistory() {
      try {
        const result = await fetchConversationHistory();
        if (!active) return;
        setAuthUser(result.user);
        setConversations(result.conversations);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar o histórico.");
      } finally {
        if (active) {
          setLoading(false);
          setAuthLoading(false);
        }
      }
    }
    void hydrateHistory();
    return () => {
      active = false;
    };
  }, []);

  async function handleRetry() {
    setLoading(true);
    setError("");
    try {
      const result = await fetchConversationHistory();
      setAuthUser(result.user);
      setConversations(result.conversations);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o histórico.");
    } finally {
      setLoading(false);
    }
  }

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalizedQuery) return conversations;
    return conversations.filter((conversation) =>
      [conversation.title, conversation.preview, conversation.mode]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase("pt-BR").includes(normalizedQuery))
    );
  }, [conversations, query]);

  const panelTone = isDark
    ? "border-white/10 bg-[#0d1a2d]"
    : "border-slate-200 bg-white shadow-[0_16px_42px_rgba(100,116,139,0.10)]";
  const mutedTone = isDark ? "text-slate-400" : "text-slate-600";

  if (authLoading) {
    return (
      <main className={`grid min-h-screen place-items-center px-4 ${isDark ? "bg-[#07101f] text-slate-200" : "bg-slate-50 text-slate-700"}`}>
        <div className={`rounded-2xl border px-5 py-4 text-sm ${panelTone}`}>Carregando seu histórico...</div>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className={`grid min-h-screen place-items-center px-4 ${isDark ? "bg-[#07101f] text-slate-100" : "bg-slate-50 text-slate-900"}`}>
        <section className={`w-full max-w-md rounded-2xl border p-6 text-center ${panelTone}`}>
          <MessagesSquare className="mx-auto text-emerald-500" size={28} />
          <h1 className="mt-4 text-xl font-semibold">Entre para ver seu histórico</h1>
          <p className={`mt-2 text-sm leading-6 ${mutedTone}`}>As conversas são vinculadas à sua conta e ficam disponíveis depois da autenticação.</p>
          <Link href="/" className="mt-5 inline-flex rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950">Voltar para o início</Link>
        </section>
      </main>
    );
  }

  return (
    <AppShell activeSection="history" user={authUser} maxWidth="max-w-[1400px]">
      <div className="space-y-4">
        <section className={`rounded-2xl border p-5 sm:p-6 ${panelTone}`}>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-500"><Clock3 size={15} /> Histórico</div>
              <h1 className={`mt-3 text-2xl font-semibold tracking-tight sm:text-3xl ${isDark ? "text-white" : "text-slate-950"}`}>Todas as suas conversas</h1>
              <p className={`mt-2 max-w-2xl text-sm leading-6 ${mutedTone}`}>Retome qualquer conversa anterior mantendo as perguntas, respostas e o contexto já construído.</p>
            </div>
            <Link href="/chat" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"><Plus size={16} /> Nova conversa</Link>
          </div>

          <label className={`mt-6 flex items-center gap-3 rounded-xl border px-4 py-3 ${isDark ? "border-white/10 bg-slate-950/35" : "border-slate-200 bg-slate-50"}`}>
            <Search className={mutedTone} size={18} />
            <span className="sr-only">Buscar no histórico</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título ou conteúdo..." className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${isDark ? "text-white placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400"}`} />
            <span className={`text-xs ${mutedTone}`}>{filteredConversations.length} {filteredConversations.length === 1 ? "conversa" : "conversas"}</span>
          </label>
        </section>

        <section className={`overflow-hidden rounded-2xl border ${panelTone}`} aria-live="polite">
          {loading ? (
            <div className={`px-6 py-12 text-center text-sm ${mutedTone}`}>Carregando conversas...</div>
          ) : error ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-rose-500">{error}</p>
              <button type="button" onClick={() => void handleRetry()} className="mt-4 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950">Tentar novamente</button>
            </div>
          ) : filteredConversations.length ? (
            <div className={isDark ? "divide-y divide-white/8" : "divide-y divide-slate-200"}>
              {filteredConversations.map((conversation) => (
                <Link key={conversation.id} href={`/chat?conversation=${encodeURIComponent(conversation.id)}`} className={`group grid gap-3 px-5 py-5 transition sm:grid-cols-[minmax(220px,0.8fr)_minmax(260px,1.2fr)_170px_32px] sm:items-center ${isDark ? "hover:bg-white/[0.035]" : "hover:bg-slate-50"}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isDark ? "bg-slate-800 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}><MessageSquare size={17} /></span>
                    <div className="min-w-0">
                      <div className={`truncate text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{conversation.title || "Conversa sem título"}</div>
                      <div className={`mt-1 text-xs ${mutedTone}`}>{conversation.message_count} {conversation.message_count === 1 ? "mensagem" : "mensagens"}</div>
                    </div>
                  </div>
                  <p className={`line-clamp-2 text-sm leading-6 ${mutedTone}`}>{conversation.preview || "Sem prévia disponível."}</p>
                  <div className={`space-y-1 text-xs ${mutedTone}`}>
                    <span className="flex items-center gap-1.5"><CalendarDays size={14} /> {formatConversationDate(conversation.updated_at)}</span>
                    <span className="inline-flex rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] font-medium text-emerald-500">{conversationTypeLabel(conversation)}</span>
                  </div>
                  <ArrowRight className="hidden text-emerald-500 transition group-hover:translate-x-1 sm:block" size={18} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <MessagesSquare className="mx-auto text-emerald-500" size={30} />
              <h2 className={`mt-4 font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{query ? "Nenhuma conversa encontrada" : "Seu histórico ainda está vazio"}</h2>
              <p className={`mt-2 text-sm ${mutedTone}`}>{query ? "Tente buscar por outro termo." : "Comece uma conversa e ela aparecerá aqui automaticamente."}</p>
              {!query ? <Link href="/chat" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950">Começar agora <ArrowRight size={15} /></Link> : null}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
