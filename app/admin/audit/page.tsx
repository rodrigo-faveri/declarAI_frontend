"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { getAuthStatus, listAdminAuditEvents } from "@/services/api";
import { AdminAuditEventRecord, AdminAuditListResponse, AuthUser } from "@/types/chat";

function canAccessAdmin(role?: string | null) {
  return role === "admin";
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

function formatActionLabel(action?: string | null) {
  return (action || "evento").replaceAll("_", " ");
}

type FilterState = {
  query: string;
  actionType: string;
  resourceType: string;
};

export default function AdminAuditPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [auditData, setAuditData] = useState<AdminAuditListResponse | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    query: "",
    actionType: "",
    resourceType: "",
  });

  useEffect(() => {
    let active = true;

    async function loadAuth() {
      try {
        const authStatus = await getAuthStatus();
        if (!active) return;
        setAuthUser(authStatus.user);
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    void loadAuth();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!canAccessAdmin(authUser?.role)) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadAudit() {
      try {
        setLoading(true);
        const response = await listAdminAuditEvents({
          limit: 80,
          query: filters.query || undefined,
          actionType: filters.actionType || undefined,
          resourceType: filters.resourceType || undefined,
        });
        if (!active) return;
        setAuditData(response);
      } catch (error) {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar a auditoria."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAudit();
    return () => {
      active = false;
    };
  }, [authUser?.role, filters.actionType, filters.query, filters.resourceType]);

  const items = auditData?.items || [];
  const actionTypes = useMemo(() => auditData?.summary.action_types || [], [auditData]);
  const resourceTypes = useMemo(
    () => auditData?.summary.resource_types || [],
    [auditData]
  );

  function renderEventCard(event: AdminAuditEventRecord) {
    return (
      <div
        key={event.id}
        className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-100">
            {formatActionLabel(event.action_type)}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
            {event.resource_type}
          </span>
          <span className="text-slate-500">{formatEventDate(event.created_at)}</span>
        </div>
        <div className="mt-3 text-sm leading-6 text-slate-200">
          {event.note || "Evento sensivel registrado."}
        </div>
        <div className="mt-2 text-xs leading-6 text-slate-400">
          {event.actor_user_email
            ? `ator: ${event.actor_user_email}`
            : "ator nao identificado"}
          {event.target_user_email ? ` · alvo: ${event.target_user_email}` : ""}
          {event.resource_id ? ` · recurso: ${event.resource_id}` : ""}
          {event.ip_address ? ` · ip: ${event.ip_address}` : ""}
        </div>
        {Object.keys(event.metadata || {}).length ? (
          <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-3 text-[11px] leading-5 text-slate-300">
            <code>{JSON.stringify(event.metadata, null, 2)}</code>
          </pre>
        ) : null}
      </div>
    );
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        <div className="mx-auto max-w-6xl rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-6 py-5 text-sm text-slate-300">
          Validando acesso a auditoria...
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
          <h1 className="mt-4 text-3xl font-semibold text-white">Auditoria de seguranca</h1>
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

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[1.9rem] border border-white/10 bg-white/[0.045] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-100">
                Admin
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-white">Auditoria de seguranca</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Revise acoes sensiveis do sistema, com foco em billing, administracao, logins de desenvolvimento e limpeza de sessao.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/billing"
                className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
              >
                Ver billing
              </Link>
              <Link
                href="/admin/users"
                className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
              >
                Ver usuarios
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Eventos visiveis
            </div>
            <div className="mt-3 text-3xl font-semibold text-white">
              {loading ? "..." : auditData?.summary.total_visible ?? 0}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Tipos de acao
            </div>
            <div className="mt-3 text-3xl font-semibold text-emerald-200">
              {loading ? "..." : auditData?.summary.action_types.length ?? 0}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Atores distintos
            </div>
            <div className="mt-3 text-3xl font-semibold text-sky-200">
              {loading ? "..." : auditData?.summary.actor_count ?? 0}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Alvos distintos
            </div>
            <div className="mt-3 text-3xl font-semibold text-amber-200">
              {loading ? "..." : auditData?.summary.target_count ?? 0}
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
          <div className="flex items-center gap-2 text-slate-200">
            <Search size={16} />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
            <input
              value={filters.query}
              onChange={(event) =>
                setFilters((current) => ({ ...current, query: event.target.value }))
              }
              placeholder="Buscar por acao, recurso, id ou nota"
              className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
            <select
              value={filters.actionType}
              onChange={(event) =>
                setFilters((current) => ({ ...current, actionType: event.target.value }))
              }
              className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="">Todas as acoes</option>
              {actionTypes.map((item) => (
                <option key={item} value={item}>
                  {formatActionLabel(item)}
                </option>
              ))}
            </select>
            <select
              value={filters.resourceType}
              onChange={(event) =>
                setFilters((current) => ({ ...current, resourceType: event.target.value }))
              }
              className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="">Todos os recursos</option>
              {resourceTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
          <div className="flex items-center gap-2 text-slate-200">
            <ShieldCheck size={16} />
            <span className="text-sm font-medium">Eventos registrados</span>
          </div>
          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 px-4 py-4 text-sm text-slate-300">
                Carregando auditoria...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 px-4 py-4 text-sm text-slate-300">
                Nenhum evento encontrado para os filtros atuais.
              </div>
            ) : (
              items.map(renderEventCard)
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
