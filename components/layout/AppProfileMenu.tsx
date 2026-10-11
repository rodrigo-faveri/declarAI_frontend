"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import ProfileMenu from "@/components/chat/ProfileMenu";
import { canManageKnowledgeBase, isPremiumPlan } from "@/lib/access-control";
import {
  getKnowledgeBaseSettings,
  getUserProfile,
  logout,
  updateKnowledgeBaseSettings,
  updateUserProfile,
} from "@/services/api";
import type {
  AuthUser,
  ProfileDetails,
  ProfilePreferences,
  UpdateUserProfileRequest,
  UserProfileResponse,
} from "@/types/chat";

const DEFAULT_PREFERENCES: ProfilePreferences = {
  showHistoryBadges: true,
  showTriageInsights: true,
  historyCardDensity: "comfortable",
};

function detailsFromUser(user?: AuthUser | null): ProfileDetails {
  const [firstName = "", ...lastName] = user?.name?.trim().split(/\s+/) ?? [];
  return {
    firstName,
    lastName: lastName.join(" "),
    phone: "",
    city: "",
    taxProfileNote: "",
    avatarDataUrl: "",
  };
}

function mapDetails(profile: UserProfileResponse): ProfileDetails {
  return {
    firstName: profile.first_name ?? "",
    lastName: profile.last_name ?? "",
    phone: profile.phone ?? "",
    city: profile.city ?? "",
    taxProfileNote: profile.tax_profile_note ?? "",
    avatarDataUrl: profile.avatar_data_url ?? "",
  };
}

function mapPreferences(profile: UserProfileResponse): ProfilePreferences {
  return {
    showHistoryBadges: profile.preferences?.show_history_badges ?? true,
    showTriageInsights: profile.preferences?.show_triage_insights ?? true,
    historyCardDensity: profile.preferences?.history_card_density ?? "comfortable",
  };
}

function buildPayload(
  details: ProfileDetails,
  preferences: ProfilePreferences
): UpdateUserProfileRequest {
  return {
    first_name: details.firstName,
    last_name: details.lastName,
    phone: details.phone,
    city: details.city,
    tax_profile_note: details.taxProfileNote,
    avatar_data_url: details.avatarDataUrl,
    preferences: {
      show_history_badges: preferences.showHistoryBadges,
      show_triage_insights: preferences.showTriageInsights,
      history_card_density: preferences.historyCardDensity,
    },
  };
}

type AppProfileMenuProps = {
  user: AuthUser;
  isDark: boolean;
  taxYear?: string | number | null;
};

export default function AppProfileMenu({ user, isDark, taxYear }: AppProfileMenuProps) {
  const router = useRouter();
  const fallbackYear = String(taxYear || new Date().getFullYear());
  const [profileDetails, setProfileDetails] = useState<ProfileDetails>(() => detailsFromUser(user));
  const [preferences, setPreferences] = useState<ProfilePreferences>(DEFAULT_PREFERENCES);
  const [activeTaxYear, setActiveTaxYear] = useState(fallbackYear);
  const [availableTaxYears, setAvailableTaxYears] = useState([fallbackYear]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const lastPayloadRef = useRef("");
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canChangeKnowledgeBase = canManageKnowledgeBase(user.role);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const [profile, settings] = await Promise.all([
          getUserProfile(),
          canChangeKnowledgeBase ? getKnowledgeBaseSettings().catch(() => null) : Promise.resolve(null),
        ]);
        if (!active) return;
        const nextDetails = mapDetails(profile);
        if (!nextDetails.firstName && !nextDetails.lastName) {
          const fallbackDetails = detailsFromUser(user);
          nextDetails.firstName = fallbackDetails.firstName;
          nextDetails.lastName = fallbackDetails.lastName;
        }
        const nextPreferences = mapPreferences(profile);
        setProfileDetails(nextDetails);
        setPreferences(nextPreferences);
        lastPayloadRef.current = JSON.stringify(buildPayload(nextDetails, nextPreferences));
        if (settings) {
          setActiveTaxYear(settings.active_tax_year);
          setAvailableTaxYears(settings.available_tax_years.length ? settings.available_tax_years : [settings.active_tax_year]);
        }
      } catch {
        if (!active) return;
        const fallbackDetails = detailsFromUser(user);
        setProfileDetails(fallbackDetails);
        lastPayloadRef.current = JSON.stringify(buildPayload(fallbackDetails, DEFAULT_PREFERENCES));
      } finally {
        if (active) setProfileReady(true);
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [canChangeKnowledgeBase, user]);

  const serializedPayload = useMemo(
    () => JSON.stringify(buildPayload(profileDetails, preferences)),
    [preferences, profileDetails]
  );

  useEffect(() => {
    if (!profileReady || serializedPayload === lastPayloadRef.current) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    syncTimerRef.current = setTimeout(async () => {
      try {
        await updateUserProfile(JSON.parse(serializedPayload) as UpdateUserProfileRequest);
        lastPayloadRef.current = serializedPayload;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar o perfil.");
      }
    }, 500);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [profileReady, serializedPayload]);

  async function handleTaxYearChange(nextTaxYear: string) {
    if (!canChangeKnowledgeBase || nextTaxYear === activeTaxYear) return;
    const previousTaxYear = activeTaxYear;
    setActiveTaxYear(nextTaxYear);
    setSettingsLoading(true);
    try {
      const settings = await updateKnowledgeBaseSettings(nextTaxYear);
      setActiveTaxYear(settings.active_tax_year);
      setAvailableTaxYears(settings.available_tax_years.length ? settings.available_tax_years : [settings.active_tax_year]);
      toast.success(`Base ativa ajustada para IRPF ${settings.active_tax_year}.`);
    } catch (error) {
      setActiveTaxYear(previousTaxYear);
      toast.error(error instanceof Error ? error.message : "Não foi possível trocar o exercício ativo.");
    } finally {
      setSettingsLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      router.replace("/");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível encerrar a sessão.");
    }
  }

  const profileDisplayName =
    `${profileDetails.firstName} ${profileDetails.lastName}`.trim() ||
    user.name ||
    user.email;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProfileMenu
        email={user.email}
        name={profileDisplayName}
        provider={user.provider}
        role={user.role}
        plan={user.plan}
        usage={user.usage}
        isDark={isDark}
        profileDetails={profileDetails}
        preferences={preferences}
        activeTaxYear={activeTaxYear}
        availableTaxYears={availableTaxYears}
        canManageKnowledgeBase={canChangeKnowledgeBase}
        knowledgeBaseSettingsLoading={settingsLoading}
        onChangeActiveTaxYear={handleTaxYearChange}
        onUpdateProfileDetails={(updates) => setProfileDetails((current) => ({ ...current, ...updates }))}
        onUpdatePreferences={(updates) => setPreferences((current) => ({ ...current, ...updates }))}
        onLogout={handleLogout}
      />
      <div className="hidden min-w-0 sm:block">
        <div className={`max-w-48 truncate text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
          {profileDisplayName}
        </div>
        <div className="text-[11px] text-emerald-500">
          Plano {isPremiumPlan(user.plan) ? "Premium" : "Free"}
        </div>
      </div>
    </div>
  );
}
