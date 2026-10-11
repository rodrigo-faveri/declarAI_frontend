"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  BookOpen,
  CircleHelp,
  Clock3,
  Crown,
  FileCheck2,
  FileText,
  Home,
  MessageSquare,
  ShieldCheck,
  Upload,
} from "lucide-react";

import ThemeToggle from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { canAccessAdmin, canAccessTechnicalUploads, isPremiumPlan } from "@/lib/access-control";
import type { AuthUser } from "@/types/chat";

export type AppSection =
  | "home"
  | "chat"
  | "declaration"
  | "documents"
  | "uploads"
  | "admin"
  | "upgrade";

type AppShellProps = {
  activeSection: AppSection;
  children: ReactNode;
  user?: AuthUser | null;
  taxYear?: string | number | null;
  maxWidth?: string;
  forceDark?: boolean;
};

const primaryNavigation = [
  { section: "home" as const, label: "Início", href: "/", icon: Home },
  { section: "chat" as const, label: "Chat", href: "/chat", icon: MessageSquare },
  { section: "declaration" as const, label: "Minha declaração", href: "/declaracao", icon: FileCheck2 },
  { section: "documents" as const, label: "Documentos", href: "/documentos", icon: FileText },
  { section: "chat" as const, label: "Histórico", href: "/chat", icon: Clock3 },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="DeclarIA — início">
      <span className={`${compact ? "h-8 w-8" : "h-9 w-9"} grid place-items-center rounded-xl bg-emerald-400/12 text-emerald-300`}>
        <FileCheck2 size={compact ? 18 : 21} />
      </span>
      <span className={compact ? "text-base" : "text-xl"}>Declar<span className="text-emerald-400">IA</span></span>
    </Link>
  );
}

function UserSummary({ user, isDark }: { user?: AuthUser | null; isDark: boolean }) {
  const displayName = user?.name || user?.email || "Conta DeclarIA";
  const initials = displayName
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-300 to-emerald-400 text-xs font-bold text-slate-950">
        {initials || "U"}
      </div>
      <div className="hidden min-w-0 sm:block">
        <div className={`max-w-48 truncate text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>{displayName}</div>
        {user ? <div className="text-[11px] text-emerald-500">Plano {isPremiumPlan(user.plan) ? "Premium" : "Free"}</div> : null}
      </div>
    </div>
  );
}

export function AppShell({
  activeSection,
  children,
  user,
  taxYear,
  maxWidth = "max-w-[1500px]",
  forceDark = false,
}: AppShellProps) {
  const { resolvedTheme } = useTheme();
  const isDark = forceDark || resolvedTheme === "dark";
  const pageTone = isDark ? "bg-[#07101f] text-slate-100" : "bg-[#f3f7fb] text-slate-900";
  const railTone = isDark ? "border-white/8 bg-[#081322]" : "border-slate-200 bg-white";
  const headerTone = isDark ? "border-white/8 bg-[#091526]/92" : "border-slate-200 bg-white/92";
  const inactiveTone = isDark ? "text-slate-400 hover:bg-white/5 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950";
  const activeTone = isDark ? "bg-slate-800/85 text-emerald-300" : "bg-emerald-50 text-emerald-700";

  return (
    <main className={`min-h-screen ${pageTone}`}>
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <aside className={`hidden w-60 shrink-0 flex-col border-r lg:flex ${railTone}`}>
          <div className={`flex h-20 items-center border-b px-5 ${isDark ? "border-white/8" : "border-slate-200"}`}>
            <Brand />
          </div>
          <nav aria-label="Navegação principal" className="space-y-1.5 p-3">
            {primaryNavigation.map((item) => {
              const Icon = item.icon;
              const active = item.section === activeSection && item.label !== "Histórico";
              return (
                <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${active ? activeTone : inactiveTone}`}>
                  <Icon size={17} /> {item.label}
                </Link>
              );
            })}
            {!user || !isPremiumPlan(user.plan) ? (
              <Link href="/upgrade" aria-current={activeSection === "upgrade" ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${activeSection === "upgrade" ? activeTone : inactiveTone}`}>
                <Crown size={17} /> Plano Premium
              </Link>
            ) : null}
            {canAccessTechnicalUploads(user?.role) ? (
              <Link href="/uploads" aria-current={activeSection === "uploads" ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${activeSection === "uploads" ? activeTone : inactiveTone}`}>
                <Upload size={17} /> Operação
              </Link>
            ) : null}
            {canAccessAdmin(user?.role) ? (
              <Link href="/admin/users" aria-current={activeSection === "admin" ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${activeSection === "admin" ? activeTone : inactiveTone}`}>
                <ShieldCheck size={17} /> Administração
              </Link>
            ) : null}
          </nav>
          <div className="mt-auto space-y-1 p-3">
            <Link href="/chat?prompt=Quero aprender a organizar minha declaração" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${inactiveTone}`}><BookOpen size={16} /> Aprender</Link>
            <Link href="/chat?prompt=Preciso de ajuda para usar o DeclarIA" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${inactiveTone}`}><CircleHelp size={16} /> Ajuda</Link>
            <div className="mt-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.07] p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500"><FileCheck2 size={15} /> {taxYear ? `Base IRPF ${taxYear}` : "Base IRPF"}</div>
              <div className={`mt-1 text-[11px] ${isDark ? "text-slate-500" : "text-slate-500"}`}>Conectada à base ativa</div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className={`sticky top-0 z-30 flex h-20 items-center justify-between border-b px-4 backdrop-blur sm:px-6 xl:px-8 ${headerTone}`}>
            <div className="lg:hidden"><Brand compact /></div>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2 sm:gap-3">
              {!forceDark ? <ThemeToggle className="[&>span:last-child]:hidden xl:[&>span:last-child]:inline" /> : null}
              <div className={`hidden h-8 w-px sm:block ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
              <UserSummary user={user} isDark={isDark} />
            </div>
          </header>

          <nav aria-label="Navegação móvel" className={`sticky top-20 z-20 flex gap-1 overflow-x-auto border-b px-3 py-2 lg:hidden ${headerTone}`}>
            {primaryNavigation.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const active = item.section === activeSection;
              return <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${active ? activeTone : inactiveTone}`}><Icon size={15} /> {item.label}</Link>;
            })}
          </nav>

          <div className="overflow-x-hidden p-4 sm:p-6 xl:p-8">
            <div className={`mx-auto w-full ${maxWidth}`}>{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function FocusModeNavigation({ activeSection = "chat" }: { activeSection?: AppSection }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <nav aria-label="Navegação do aplicativo" className={`mb-3 flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 ${isDark ? "border-white/10 bg-[#091526]" : "border-slate-200 bg-white"}`}>
      <Brand compact />
      <div className="flex items-center gap-1 overflow-x-auto">
        {primaryNavigation.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = item.section === activeSection;
          return <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined} title={item.label} className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${active ? "bg-emerald-400/15 text-emerald-400" : isDark ? "text-slate-400 hover:bg-white/5 hover:text-white" : "text-slate-500 hover:bg-slate-100"}`}><Icon size={17} /><span className="sr-only">{item.label}</span></Link>;
        })}
        <ThemeToggle className="ml-1 [&>span:last-child]:hidden" />
      </div>
    </nav>
  );
}
