import type { AuthStatusResponse, AuthUser } from "@/types/chat";

const baseUser: AuthUser = {
  id: "user-1",
  email: "usuario@example.com",
  name: "Usuário de Teste",
  provider: "authentik",
  role: "user",
  plan: "free",
  is_active: true,
  usage: {
    period_key: "2026-10",
    chat_interactions_used: 0,
    chat_interactions_limit: 20,
    chat_interactions_remaining: 20,
    uploads_allowed: false,
    plan: "free",
  },
  subscription: null,
};

export function createAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    ...baseUser,
    ...overrides,
    usage: overrides.usage === undefined ? baseUser.usage : overrides.usage,
  };
}

export function createAuthStatus(
  user: AuthUser | null = createAuthUser()
): AuthStatusResponse {
  return {
    authenticated: user !== null,
    user,
  };
}
