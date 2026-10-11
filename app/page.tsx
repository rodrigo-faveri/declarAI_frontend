"use client";

import { useEffect, useState } from "react";

import AuthenticatedDashboard from "@/components/dashboard/AuthenticatedDashboard";
import PublicLanding from "@/components/landing/PublicLanding";
import { devLogin, getAuthStatus, getLoginUrl } from "@/services/api";
import type { AuthUser } from "@/types/chat";

export default function HomePage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loggingInAs, setLoggingInAs] = useState<string | null>(null);

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
      <main className="grid min-h-screen place-items-center bg-[#04101d] text-slate-100">
        <div
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5 text-sm text-slate-300"
          role="status"
        >
          Validando sessão…
        </div>
      </main>
    );
  }

  if (authUser) {
    return <AuthenticatedDashboard user={authUser} />;
  }

  return (
    <PublicLanding
      loggingInAs={loggingInAs}
      onDevLogin={handleDevLogin}
      onLogin={handleLogin}
      showDevelopmentAccess={process.env.NODE_ENV === "development"}
    />
  );
}
