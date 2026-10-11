"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { canAccessAdmin } from "@/lib/access-control";
import {
  createAdminUser,
  getAuthStatus,
  listAdminUsers,
  syncBillingSubscription,
  updateAdminUser,
} from "@/services/api";
import {
  AdminCreateUserRequest,
  AdminUserRecord,
  AuthUser,
} from "@/types/chat";

const ROLE_OPTIONS = [
  { value: "user", label: "Usuario" },
  { value: "technical", label: "Time tecnico" },
  { value: "admin", label: "Admin" },
];

const PLAN_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
];

type AdminUserFilter = "all" | "free_near_limit" | "free_at_limit" | "premium" | "inactive";

function isFreeUserNearLimit(user: AdminUserRecord) {
  const remaining = user.usage?.chat_interactions_remaining;
  const limit = user.usage?.chat_interactions_limit;
  return user.plan === "free" && typeof limit === "number" && typeof remaining === "number" && remaining > 0 && remaining <= 5;
}

function isFreeUserAtLimit(user: AdminUserRecord) {
  const remaining = user.usage?.chat_interactions_remaining;
  const limit = user.usage?.chat_interactions_limit;
  return user.plan === "free" && typeof limit === "number" && typeof remaining === "number" && remaining <= 0;
}

function formatPlanLabel(plan?: string | null) {
  return (plan || "free").toLowerCase() === "premium" ? "Premium" : "Free";
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

function formatSubscriptionStatusLabel(status?: string | null) {
  const normalized = (status || "inactive").toLowerCase();
  if (normalized === "active") return "Ativa";
  if (normalized === "trialing") return "Em teste";
  if (normalized === "past_due") return "Pagamento pendente";
  if (normalized === "canceled") return "Cancelada";
  return "Inativa";
}

function formatSubscriptionEventLabel(eventType?: string | null) {
  const normalized = (eventType || "").toLowerCase();
  if (normalized === "subscription_initialized") return "Assinatura inicial";
  if (normalized === "subscription_plan_synced") return "Plano sincronizado";
  if (normalized === "subscription_activated") return "Assinatura ativada";
  if (normalized === "subscription_deactivated") return "Assinatura desativada";
  return eventType || "Evento de assinatura";
}

function buildFutureIsoDate(daysAhead: number) {
  const target = new Date();
  target.setDate(target.getDate() + daysAhead);
  return target.toISOString();
}

export default function AdminUsersPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<AdminUserFilter>("all");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<AdminCreateUserRequest>({
    email: "",
    name: "",
    role: "user",
    plan: "free",
    is_active: true,
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
      setLoadingUsers(false);
      return;
    }

    let active = true;

    async function loadUsers() {
      try {
        setLoadingUsers(true);
        const response = await listAdminUsers(search.trim() || undefined);
        if (!active) return;
        setUsers(response.items);
      } catch (error) {
        if (!active) return;
        const message =
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar os usuarios.";
        toast.error(message);
      } finally {
        if (active) {
          setLoadingUsers(false);
        }
      }
    }

    void loadUsers();
    return () => {
      active = false;
    };
  }, [authUser?.role, search]);

  const totals = useMemo(() => {
    return {
      total: users.length,
      premium: users.filter((user) => user.plan === "premium").length,
      admins: users.filter((user) => user.role === "admin").length,
      inactive: users.filter((user) => !user.is_active).length,
      nearLimit: users.filter(isFreeUserNearLimit).length,
      atLimit: users.filter(isFreeUserAtLimit).length,
    };
  }, [users]);

  const visibleUsers = useMemo(() => {
    const filtered = users.filter((user) => {
      if (activeFilter === "free_near_limit") return isFreeUserNearLimit(user);
      if (activeFilter === "free_at_limit") return isFreeUserAtLimit(user);
      if (activeFilter === "premium") return user.plan === "premium";
      if (activeFilter === "inactive") return !user.is_active;
      return true;
    });

    return [...filtered].sort((left, right) => {
      const leftScore =
        (isFreeUserAtLimit(left) ? 100 : 0) +
        (isFreeUserNearLimit(left) ? 50 : 0) +
        (!left.is_active ? 20 : 0) +
        (left.plan === "premium" ? -10 : 0);
      const rightScore =
        (isFreeUserAtLimit(right) ? 100 : 0) +
        (isFreeUserNearLimit(right) ? 50 : 0) +
        (!right.is_active ? 20 : 0) +
        (right.plan === "premium" ? -10 : 0);

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return (right.last_login_at || "").localeCompare(left.last_login_at || "");
    });
  }, [activeFilter, users]);

  async function handleCreateUser() {
    if (!draft.email.trim()) {
      toast.error("Informe um email para criar o usuario.");
      return;
    }

    try {
      setCreating(true);
      const created = await createAdminUser({
        ...draft,
        email: draft.email.trim(),
        name: draft.name?.trim() || null,
      });
      setUsers((current) => [created, ...current]);
      setDraft({
        email: "",
        name: "",
        role: "user",
        plan: "free",
        is_active: true,
      });
      toast.success("Usuario criado.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar o usuario.";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateUser(
    userId: string,
    payload: Partial<Pick<AdminUserRecord, "role" | "plan" | "is_active">>
  ) {
    const currentUser = users.find((item) => item.id === userId);
    if (!currentUser) return;

    try {
      setSavingUserId(userId);
      const updated = await updateAdminUser(userId, payload);
      setUsers((current) =>
        current.map((item) => (item.id === userId ? updated : item))
      );
      toast.success("Usuario atualizado.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel atualizar o usuario.";
      toast.error(message);
      setUsers((current) =>
        current.map((item) =>
          item.id === userId ? { ...item, ...currentUser } : item
        )
      );
    } finally {
      setSavingUserId(null);
    }
  }

  async function reloadUsers() {
    const response = await listAdminUsers(search.trim() || undefined);
    setUsers(response.items);
  }

  async function handleSyncSubscription(
    user: AdminUserRecord,
    mode: "activate_premium" | "cancel_to_free"
  ) {
    try {
      setSavingUserId(user.id);
      if (mode === "activate_premium") {
        await syncBillingSubscription({
          user_id: user.id,
          provider: "manual",
          status: "active",
          plan_code: "premium",
          current_period_start: new Date().toISOString(),
          current_period_end: buildFutureIsoDate(30),
          note: "Assinatura premium simulada pelo admin para teste interno.",
          raw_payload: {
            simulated: true,
            action: "activate_premium",
          },
        });
        toast.success("Assinatura premium simulada.");
      } else {
        await syncBillingSubscription({
          user_id: user.id,
          provider: "manual",
          status: "canceled",
          plan_code: "free",
          cancel_at_period_end: false,
          canceled_at: new Date().toISOString(),
          note: "Assinatura cancelada manualmente pelo admin para teste interno.",
          raw_payload: {
            simulated: true,
            action: "cancel_to_free",
          },
        });
        toast.success("Assinatura cancelada e plano ajustado.");
      }

      await reloadUsers();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel sincronizar a assinatura.";
      toast.error(message);
    } finally {
      setSavingUserId(null);
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        <div className="mx-auto max-w-6xl rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-6 py-5 text-sm text-slate-300">
          Validando acesso do admin...
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
          <h1 className="mt-4 text-3xl font-semibold text-white">Painel de usuarios</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Esta area fica disponivel apenas para contas com papel de admin.
          </p>
          <div className="mt-6">
            <Link
              href="/admin/audit"
              className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
            >
              Ver auditoria
            </Link>
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
    <AppShell activeSection="admin" user={authUser} maxWidth="max-w-6xl" forceDark>
      <div className="space-y-6">
        <div className="rounded-[1.9rem] border border-white/10 bg-white/[0.045] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-100">
                Admin
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-white">Gerenciar usuarios</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Ajuste papel, plano e status das contas atuais. Aqui tambem fica o cadastro inicial de novos usuarios.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
            >
              Voltar para a home
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Usuarios
            </div>
            <div className="mt-3 text-3xl font-semibold text-white">{totals.total}</div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Premium
            </div>
            <div className="mt-3 text-3xl font-semibold text-emerald-200">{totals.premium}</div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Admins
            </div>
            <div className="mt-3 text-3xl font-semibold text-amber-200">{totals.admins}</div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Inativos
            </div>
            <div className="mt-3 text-3xl font-semibold text-rose-200">{totals.inactive}</div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-500/10 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100/80">
              Free perto do limite
            </div>
            <div className="mt-3 text-3xl font-semibold text-amber-100">{totals.nearLimit}</div>
            <div className="mt-2 text-sm text-amber-50/80">
              Usuarios free com 5 ou menos interacoes restantes neste mes.
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-rose-300/20 bg-rose-500/10 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-100/80">
              Free no limite
            </div>
            <div className="mt-3 text-3xl font-semibold text-rose-100">{totals.atLimit}</div>
            <div className="mt-2 text-sm text-rose-50/80">
              Usuarios free que ja esgotaram o limite mensal e podem pedir upgrade.
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
            <div className="flex items-center gap-2 text-emerald-200">
              <UserPlus size={16} />
              <span className="text-sm font-medium">Novo usuario</span>
            </div>
            <div className="mt-5 space-y-4">
              <input
                value={draft.email}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="email@dominio.com"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <input
                value={draft.name ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Nome opcional"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={draft.role}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      role: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={draft.plan}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      plan: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none"
                >
                  {PLAN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                  className="rounded border-white/10 bg-slate-950/35"
                />
                Usuario ativo
              </label>
              <button
                type="button"
                onClick={handleCreateUser}
                disabled={creating}
                className="inline-flex rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Criando..." : "Criar usuario"}
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-200">
                <ShieldCheck size={16} />
                <span className="text-sm font-medium">Usuarios atuais</span>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por email ou nome"
                className="w-full max-w-xs rounded-full border border-white/10 bg-slate-950/35 px-4 py-2 text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { key: "all", label: "Todos" },
                { key: "free_near_limit", label: "Perto do limite" },
                { key: "free_at_limit", label: "No limite" },
                { key: "premium", label: "Premium" },
                { key: "inactive", label: "Inativos" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveFilter(item.key as AdminUserFilter)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
                    activeFilter === item.key
                      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {loadingUsers ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4 text-sm text-slate-300">
                  Carregando usuarios...
                </div>
              ) : visibleUsers.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4 text-sm text-slate-300">
                  Nenhum usuario encontrado para esse filtro.
                </div>
              ) : (
                visibleUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {user.name || user.email}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">{user.email}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                            {user.provider}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                            {user.plan === "premium" ? "Premium" : "Free"}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                            {user.usage?.chat_interactions_limit == null
                              ? "Sem limite"
                              : `${user.usage?.chat_interactions_remaining ?? 0} restantes`}
                          </span>
                          {isFreeUserAtLimit(user) ? (
                            <span className="rounded-full border border-rose-300/20 bg-rose-500/10 px-2.5 py-1 text-rose-100">
                              No limite
                            </span>
                          ) : null}
                          {isFreeUserNearLimit(user) ? (
                            <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2.5 py-1 text-amber-100">
                              Perto do limite
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {user.plan !== "premium" ? (
                            <button
                              type="button"
                              disabled={savingUserId === user.id}
                              onClick={() =>
                                handleUpdateUser(user.id, { plan: "premium" })
                              }
                              className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Promover para Premium
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={savingUserId === user.id}
                              onClick={() =>
                                handleUpdateUser(user.id, { plan: "free" })
                              }
                              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Voltar para Free
                            </button>
                          )}
                          {user.subscription?.status !== "active" || user.subscription?.plan_code !== "premium" ? (
                            <button
                              type="button"
                              disabled={savingUserId === user.id}
                              onClick={() => handleSyncSubscription(user, "activate_premium")}
                              className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Simular assinatura ativa
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={savingUserId === user.id}
                              onClick={() => handleSyncSubscription(user, "cancel_to_free")}
                              className="rounded-full border border-rose-300/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-100 transition hover:-translate-y-0.5 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Simular cancelamento
                            </button>
                          )}
                        </div>
                        {user.plan_events?.length ? (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Historico de plano
                            </div>
                            <div className="mt-3 space-y-2">
                              {user.plan_events.slice(0, 3).map((event) => (
                                <div
                                  key={event.id}
                                  className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2"
                                >
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">
                                      {event.previous_plan
                                        ? `${formatPlanLabel(event.previous_plan)} -> ${formatPlanLabel(event.new_plan)}`
                                        : `Plano inicial: ${formatPlanLabel(event.new_plan)}`}
                                    </span>
                                    <span className="text-slate-500">
                                      {formatEventDate(event.changed_at)}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-[11px] text-slate-400">
                                    {event.actor_user_email
                                      ? `por ${event.actor_user_email}`
                                      : "sem ator identificado"}
                                    {event.note ? ` · ${event.note}` : ""}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {user.subscription ? (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Assinatura
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                                {user.subscription.provider}
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                                {formatSubscriptionStatusLabel(user.subscription.status)}
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                                Plano {formatPlanLabel(user.subscription.plan_code)}
                              </span>
                            </div>
                            {user.subscription_events?.length ? (
                              <div className="mt-3 space-y-2">
                                {user.subscription_events.slice(0, 2).map((event) => (
                                  <div
                                    key={event.id}
                                    className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2"
                                  >
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
                                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">
                                        {formatSubscriptionEventLabel(event.event_type)}
                                      </span>
                                      <span className="text-slate-500">
                                        {formatEventDate(event.created_at)}
                                      </span>
                                    </div>
                                    <div className="mt-1 text-[11px] text-slate-400">
                                      {event.actor_user_email
                                        ? `por ${event.actor_user_email}`
                                        : "sem ator identificado"}
                                      {event.note ? ` · ${event.note}` : ""}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <select
                          value={user.role}
                          disabled={savingUserId === user.id}
                          onChange={(event) =>
                            handleUpdateUser(user.id, { role: event.target.value })
                          }
                          className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-2 text-xs text-white outline-none"
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={user.plan}
                          disabled={savingUserId === user.id}
                          onChange={(event) =>
                            handleUpdateUser(user.id, { plan: event.target.value })
                          }
                          className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-2 text-xs text-white outline-none"
                        >
                          {PLAN_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <label className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-slate-950/35 px-3 py-2 text-xs text-slate-200">
                          <input
                            type="checkbox"
                            checked={user.is_active}
                            disabled={savingUserId === user.id}
                            onChange={(event) =>
                              handleUpdateUser(user.id, {
                                is_active: event.target.checked,
                              })
                            }
                          />
                          Ativo
                        </label>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
