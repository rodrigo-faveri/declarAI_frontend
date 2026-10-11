"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  CircleUserRound,
  ImagePlus,
  LogOut,
  Mail,
  Moon,
  ShieldCheck,
  SlidersHorizontal,
  CalendarRange,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  HistoryCardDensity,
  ProfileDetails,
  ProfilePreferences,
  UsageSummary,
} from "@/types/chat";

type ProfileMenuProps = {
  email?: string | null;
  name?: string | null;
  provider?: string | null;
  role?: string | null;
  plan?: string | null;
  usage?: UsageSummary | null;
  isDark?: boolean;
  menuPlacement?: "down" | "up";
  profileDetails: ProfileDetails;
  preferences: ProfilePreferences;
  activeTaxYear: string;
  availableTaxYears: string[];
  canManageKnowledgeBase?: boolean;
  knowledgeBaseSettingsLoading?: boolean;
  devSwitchProfiles?: Array<{ email: string; name: string; label: string }>;
  switchingDevProfileEmail?: string | null;
  onSwitchDevProfile?: (email: string, name: string) => void;
  onChangeActiveTaxYear: (taxYear: string) => void;
  onUpdateProfileDetails: (updates: Partial<ProfileDetails>) => void;
  onUpdatePreferences: (updates: Partial<ProfilePreferences>) => void;
  onLogout: () => void;
};

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
  isDark,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  isDark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition ${isDark
          ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
        }`}
    >
      <div>
        <div className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
          {label}
        </div>
        <div
          className={`mt-1 text-xs leading-5 ${isDark ? "text-slate-400" : "text-slate-500"
            }`}
        >
          {description}
        </div>
      </div>
      <span
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition ${checked
            ? isDark
              ? "bg-emerald-400/80"
              : "bg-emerald-500"
            : isDark
              ? "bg-slate-700"
              : "bg-slate-300"
          }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-[22px]" : "left-0.5"
            }`}
        />
      </span>
    </button>
  );
}

function PreferenceSegmentedControl({
  label,
  description,
  value,
  options,
  onChange,
  isDark,
}: {
  label: string;
  description: string;
  value: HistoryCardDensity;
  options: Array<{ value: HistoryCardDensity; label: string }>;
  onChange: (value: HistoryCardDensity) => void;
  isDark: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-3 py-3 ${isDark
          ? "border-white/10 bg-white/[0.04]"
          : "border-slate-200 bg-slate-50"
        }`}
    >
      <div className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
        {label}
      </div>
      <div
        className={`mt-1 text-xs leading-5 ${isDark ? "text-slate-400" : "text-slate-500"
          }`}
      >
        {description}
      </div>
      <div
        className={`mt-3 inline-flex rounded-full border p-1 ${isDark ? "border-white/10 bg-slate-950/80" : "border-slate-200 bg-white"
          }`}
      >
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${active
                  ? isDark
                    ? "bg-emerald-400/15 text-emerald-100"
                    : "bg-emerald-50 text-emerald-700"
                  : isDark
                    ? "text-slate-300 hover:bg-white/[0.06]"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getProfileInitials(profileDetails: ProfileDetails, fallbackName?: string | null) {
  const compositeName = `${profileDetails.firstName} ${profileDetails.lastName}`.trim();
  const base = compositeName || fallbackName?.trim() || "U";
  const parts = base.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? "U"}${parts[1][0] ?? ""}`.toUpperCase();
  }

  return base.slice(0, 2).toUpperCase();
}

async function createAvatarDataUrl(imageSrc: string, scale: number) {
  return new Promise<string>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 320;
      canvas.width = size;
      canvas.height = size;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Nao foi possivel preparar a imagem."));
        return;
      }

      const sourceSize = Math.min(image.width, image.height);
      const cropSize = sourceSize / scale;
      const sourceX = (image.width - cropSize) / 2;
      const sourceY = (image.height - cropSize) / 2;

      context.clearRect(0, 0, size, size);
      context.drawImage(
        image,
        sourceX,
        sourceY,
        cropSize,
        cropSize,
        0,
        0,
        size,
        size
      );

      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    image.onerror = () => reject(new Error("Nao foi possivel carregar a imagem."));
    image.src = imageSrc;
  });
}

export default function ProfileMenu({
  email,
  name,
  provider,
  role,
  plan,
  usage,
  isDark = true,
  menuPlacement = "down",
  profileDetails,
  preferences,
  activeTaxYear,
  availableTaxYears,
  canManageKnowledgeBase = false,
  knowledgeBaseSettingsLoading = false,
  devSwitchProfiles = [],
  switchingDevProfileEmail = null,
  onSwitchDevProfile,
  onChangeActiveTaxYear,
  onUpdateProfileDetails,
  onUpdatePreferences,
  onLogout,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [pendingAvatarSrc, setPendingAvatarSrc] = useState<string | null>(null);
  const [pendingAvatarScale, setPendingAvatarScale] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { theme, toggleTheme } = useTheme();
  const isThemeDark = theme === "dark";
  const roleLabel =
    role === "admin"
      ? "Admin"
      : role === "technical"
        ? "Time técnico"
        : "Usuário";
  const planLabel = plan === "premium" ? "Premium" : "Free";

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex h-12 w-12 items-center justify-center rounded-full border shadow-[0_18px_40px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 ${isDark
            ? "border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.10]"
            : "border-slate-200 bg-white/95 text-slate-700 hover:border-emerald-200 hover:bg-white"
          }`}
        aria-label="Abrir perfil"
        aria-expanded={open}
      >
        {profileDetails.avatarDataUrl ? (
          <Image
            src={profileDetails.avatarDataUrl}
            alt="Foto do perfil"
            className="h-11 w-11 rounded-full object-cover"
            width={44}
            height={44}
            unoptimized
          />
        ) : profileDetails.firstName.trim() || profileDetails.lastName.trim() ? (
          <span
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold ${isDark
                ? "bg-emerald-500/15 text-emerald-100"
                : "bg-emerald-50 text-emerald-700"
              }`}
          >
            {getProfileInitials(profileDetails, name)}
          </span>
        ) : (
          <CircleUserRound size={22} />
        )}
      </button>

      {open ? (
        <div
          className={`absolute right-0 z-30 w-[320px] max-h-[min(82vh,760px)] overflow-y-auto overscroll-contain rounded-[1.75rem] border p-4 shadow-[0_32px_80px_rgba(15,23,42,0.22)] backdrop-blur-xl [scrollbar-gutter:stable] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding ${isDark
              ? "[&::-webkit-scrollbar-thumb]:bg-white/12 [&::-webkit-scrollbar-thumb:hover]:bg-white/18 [&::-webkit-scrollbar-track]:bg-transparent"
              : "[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb:hover]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-transparent"
            } [&::-webkit-scrollbar]:w-2 ${menuPlacement === "up" ? "bottom-full mb-3" : "mt-3"
            } ${isDark
              ? "border-white/10 bg-slate-950/95"
              : "border-slate-200 bg-white/95"
            }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`relative inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl ${isDark
                  ? "bg-emerald-500/10 text-emerald-100"
                  : "bg-emerald-50 text-emerald-700"
                }`}
            >
              {profileDetails.avatarDataUrl ? (
                <Image
                  src={profileDetails.avatarDataUrl}
                  alt="Foto do perfil"
                  className="h-full w-full object-cover"
                  width={64}
                  height={64}
                  unoptimized
                />
              ) : profileDetails.firstName.trim() || profileDetails.lastName.trim() ? (
                <span className="text-lg font-semibold">
                  {getProfileInitials(profileDetails, name)}
                </span>
              ) : (
                <UserRound size={24} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                {`${profileDetails.firstName} ${profileDetails.lastName}`.trim() ||
                  name?.trim() ||
                  "Seu perfil"}
              </div>
              <div
                className={`mt-1 flex items-center gap-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"
                  }`}
              >
                <Mail size={13} />
                <span className="truncate">{email ?? "Conta autenticada"}</span>
              </div>
              <div
                className={`mt-1 flex items-center gap-2 text-xs ${isDark ? "text-slate-500" : "text-slate-400"
                  }`}
              >
                <ShieldCheck size={13} />
                <span>Login via {provider || "Authentik"}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    role === "admin"
                      ? isDark
                        ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                      : role === "technical"
                        ? isDark
                          ? "border-sky-400/20 bg-sky-500/10 text-sky-100"
                          : "border-sky-200 bg-sky-50 text-sky-700"
                        : isDark
                          ? "border-white/10 bg-white/[0.04] text-slate-300"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {roleLabel}
                </span>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    plan === "premium"
                      ? isDark
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : isDark
                        ? "border-white/10 bg-white/[0.04] text-slate-300"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  Plano {planLabel}
                </span>
              </div>
            </div>
          </div>

          {usage ? (
            <div
              className={`mt-4 rounded-2xl border px-3 py-3 ${
                isDark
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div
                className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Uso do plano
              </div>
              <div className={`mt-2 space-y-1 text-sm ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                <div>
                  <strong>Periodo:</strong> {usage.period_key}
                </div>
                <div>
                  <strong>Chat:</strong>{" "}
                  {usage.chat_interactions_limit == null
                    ? "sem limite"
                    : `${usage.chat_interactions_used}/${usage.chat_interactions_limit}`}
                </div>
                <div>
                  <strong>Upload:</strong> {usage.uploads_allowed ? "liberado" : "Premium"}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                if (!file.type.startsWith("image/")) {
                  event.target.value = "";
                  return;
                }

                const reader = new FileReader();
                reader.onload = () => {
                  const result = typeof reader.result === "string" ? reader.result : "";
                  setPendingAvatarSrc(result);
                  setPendingAvatarScale(1);
                };
                reader.readAsDataURL(file);
                event.target.value = "";
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition ${isDark
                  ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
            >
              <ImagePlus size={16} />
              {profileDetails.avatarDataUrl ? "Trocar foto" : "Adicionar foto"}
            </button>

            {profileDetails.avatarDataUrl ? (
              <button
                type="button"
                onClick={() => onUpdateProfileDetails({ avatarDataUrl: "" })}
                className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition ${isDark
                    ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <Trash2 size={16} />
                Remover
              </button>
            ) : null}
          </div>

          <div className="mt-4">
            <div
              className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"
                }`}
            >
              Dados do perfil
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                {
                  key: "firstName",
                  label: "Nome",
                  value: profileDetails.firstName,
                  placeholder: "Seu nome",
                },
                {
                  key: "lastName",
                  label: "Sobrenome",
                  value: profileDetails.lastName,
                  placeholder: "Seu sobrenome",
                },
                {
                  key: "phone",
                  label: "Telefone",
                  value: profileDetails.phone,
                  placeholder: "(11) 99999-9999",
                },
                {
                  key: "city",
                  label: "Cidade / UF",
                  value: profileDetails.city,
                  placeholder: "Sao Paulo / SP",
                },
              ].map((field) => (
                <label key={field.key} className="block">
                  <span
                    className={`mb-1 block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-600"
                      }`}
                  >
                    {field.label}
                  </span>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(event) =>
                      onUpdateProfileDetails({
                        [field.key]: event.target.value,
                      } as Partial<ProfileDetails>)
                    }
                    placeholder={field.placeholder}
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition ${isDark
                        ? "border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-emerald-400/30"
                        : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-emerald-300"
                      }`}
                  />
                </label>
              ))}
            </div>

            <label className="mt-2 block">
              <span
                className={`mb-1 block text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-600"
                  }`}
              >
                Observacoes do perfil
              </span>
              <textarea
                value={profileDetails.taxProfileNote}
                onChange={(event) =>
                  onUpdateProfileDetails({
                    taxProfileNote: event.target.value,
                  })
                }
                placeholder="Ex.: declaro junto com conjuge, tenho renda PJ, foco em IRPF simplificado..."
                rows={3}
                className={`w-full resize-none rounded-2xl border px-3 py-2.5 text-sm outline-none transition ${isDark
                    ? "border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-emerald-400/30"
                    : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-emerald-300"
                  }`}
              />
            </label>
          </div>

          <div className="mt-4">
            <div
              className={`mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-slate-500" : "text-slate-400"
                }`}
            >
              <SlidersHorizontal size={13} />
              Preferencias
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={toggleTheme}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition ${isDark
                    ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
              >
                <div>
                  <div
                    className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-900"
                      }`}
                  >
                    Tema da interface
                  </div>
                  <div
                    className={`mt-1 text-xs leading-5 ${isDark ? "text-slate-400" : "text-slate-500"
                      }`}
                  >
                    Alterna entre modo claro e escuro dentro do proprio perfil.
                  </div>
                </div>
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${isDark
                      ? "bg-white/[0.06] text-slate-100"
                      : "bg-sky-50 text-sky-700"
                    }`}
                >
                  {isThemeDark ? <Sun size={18} /> : <Moon size={18} />}
                </span>
              </button>
              <PreferenceToggle
                label="Badges no Histórico"
                description="Mostra o nivel de contexto diretamente na lista de conversas."
                checked={preferences.showHistoryBadges}
                onChange={() =>
                  onUpdatePreferences({
                    showHistoryBadges: !preferences.showHistoryBadges,
                  })
                }
                isDark={isDark}
              />
              <PreferenceToggle
                label="Insights da triagem"
                description="Exibe os cards de confianca e progresso durante a triagem."
                checked={preferences.showTriageInsights}
                onChange={() =>
                  onUpdatePreferences({
                    showTriageInsights: !preferences.showTriageInsights,
                  })
                }
                isDark={isDark}
              />
              <PreferenceSegmentedControl
                label="Tamanho do Histórico"
                description="Define se os cards da lateral ficam mais compactos ou mais confortaveis."
                value={preferences.historyCardDensity}
                options={[
                  { value: "compact", label: "Compacto" },
                  { value: "comfortable", label: "Confortavel" },
                ]}
                onChange={(value) =>
                  onUpdatePreferences({
                    historyCardDensity: value,
                  })
                }
                isDark={isDark}
              />
              <div
                className={`rounded-2xl border px-3 py-3 ${isDark
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-slate-200 bg-slate-50"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <CalendarRange
                    size={14}
                    className={isDark ? "text-slate-400" : "text-slate-500"}
                  />
                  <div
                    className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-900"
                      }`}
                  >
                    Exercicio ativo do IRPF
                  </div>
                </div>
                <div
                  className={`mt-1 text-xs leading-5 ${isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                >
                  {canManageKnowledgeBase
                    ? "Escolha qual base anual deve ser priorizada nas respostas quando voce nao explicitar um ano."
                    : "A base anual ativa e controlada pelo time administrador."}
                </div>
                <select
                  value={activeTaxYear}
                  onChange={(event) => onChangeActiveTaxYear(event.target.value)}
                  disabled={
                    !canManageKnowledgeBase ||
                    knowledgeBaseSettingsLoading ||
                    availableTaxYears.length === 0
                  }
                  className={`mt-3 w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${isDark
                      ? "border-white/10 bg-slate-950/80 text-white focus:border-emerald-400/30"
                      : "border-slate-200 bg-white text-slate-900 focus:border-emerald-300"
                    }`}
                >
                  {availableTaxYears.map((taxYear) => (
                    <option key={taxYear} value={taxYear}>
                      IRPF {taxYear}
                    </option>
                  ))}
                </select>
                {!canManageKnowledgeBase ? (
                  <div
                    className={`mt-2 text-[11px] leading-5 ${isDark ? "text-slate-500" : "text-slate-400"}`}
                  >
                    Somente contas com papel de admin podem trocar o exercício ativo.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div
            className={`mt-4 rounded-2xl border px-3 py-3 text-xs leading-5 ${isDark
                ? "border-white/10 bg-white/[0.03] text-slate-400"
                : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
          >
            Seus dados e preferencias acompanham a conta autenticada. As alteracoes
            tambem ficam espelhadas localmente para deixar a experiencia mais rapida.
          </div>

          {devSwitchProfiles.length > 0 && onSwitchDevProfile ? (
            <div
              className={`mt-4 rounded-2xl border px-3 py-3 ${
                isDark
                  ? "border-amber-300/20 bg-amber-500/10"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div
                className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                  isDark ? "text-amber-100/90" : "text-amber-700"
                }`}
              >
                Trocar perfil de teste
              </div>
              <div
                className={`mt-1 text-xs leading-5 ${
                  isDark ? "text-amber-50/90" : "text-amber-700"
                }`}
              >
                Atalho local de desenvolvimento para alternar rapidamente entre contas de teste.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {devSwitchProfiles.map((account) => {
                  const isCurrent = email?.toLowerCase() === account.email.toLowerCase();
                  const isSwitching = switchingDevProfileEmail === account.email;
                  return (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => onSwitchDevProfile(account.email, account.name)}
                      disabled={isCurrent || switchingDevProfileEmail !== null}
                      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        isCurrent
                          ? isDark
                            ? "border-white/10 bg-white/[0.08] text-slate-200"
                            : "border-slate-200 bg-white text-slate-600"
                          : isDark
                            ? "border-amber-200/20 bg-white/[0.08] text-amber-50 hover:bg-white/[0.14]"
                            : "border-amber-300 bg-white text-amber-700 hover:bg-amber-100"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {isCurrent ? `${account.label} atual` : isSwitching ? "Entrando..." : account.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onLogout}
            className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${isDark
                ? "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      ) : null}

      {pendingAvatarSrc ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-[1.75rem] border p-4 shadow-[0_32px_80px_rgba(15,23,42,0.28)] ${isDark
                ? "border-white/10 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-900"
              }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Ajustar foto do perfil</div>
                <div
                  className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                >
                  Use o zoom para enquadrar melhor antes de salvar.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingAvatarSrc(null)}
                className={`rounded-2xl border px-3 py-2 text-sm transition ${isDark
                    ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 flex justify-center">
              <div className="relative h-64 w-64 overflow-hidden rounded-[2rem] border border-emerald-300/30 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingAvatarSrc}
                  alt="Preview da foto"
                  className="h-full w-full object-cover"
                  style={{ transform: `scale(${pendingAvatarScale})` }}
                />
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/40" />
              </div>
            </div>

            <div className="mt-4">
              <div
                className={`mb-2 text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-600"
                  }`}
              >
                Zoom
              </div>
              <input
                type="range"
                min="1"
                max="2.4"
                step="0.05"
                value={pendingAvatarScale}
                onChange={(event) =>
                  setPendingAvatarScale(Number(event.target.value))
                }
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingAvatarSrc(null)}
                className={`rounded-2xl border px-4 py-2.5 text-sm transition ${isDark
                    ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const avatarDataUrl = await createAvatarDataUrl(
                      pendingAvatarSrc,
                      pendingAvatarScale
                    );
                    onUpdateProfileDetails({ avatarDataUrl });
                  } finally {
                    setPendingAvatarSrc(null);
                  }
                }}
                className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${isDark
                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
              >
                Salvar foto
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
