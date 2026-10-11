import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import type { AuthUser } from "@/types/chat";
import { AppShell, FocusModeNavigation } from "./AppShell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/services/api", () => ({
  getAuthStatus: vi.fn().mockResolvedValue({ authenticated: true, user: null }),
  getKnowledgeBaseSettings: vi.fn().mockResolvedValue({
    active_tax_year: "2026",
    available_tax_years: ["2026"],
  }),
  getUserProfile: vi.fn().mockResolvedValue({
    email: "rodrigo@example.com",
    name: "authentik Default Admin",
    provider: "authentik",
    role: "admin",
    plan: "premium",
    is_active: true,
    first_name: "Rodrigo",
    last_name: "Faveri",
    phone: "",
    city: "",
    tax_profile_note: "",
    avatar_data_url: "",
    preferences: {
      show_history_badges: true,
      show_triage_insights: true,
      history_card_density: "comfortable",
    },
  }),
  logout: vi.fn().mockResolvedValue(undefined),
  updateKnowledgeBaseSettings: vi.fn(),
  updateUserProfile: vi.fn().mockResolvedValue({}),
}));

const user: AuthUser = {
  id: "user-1",
  email: "rodrigo@example.com",
  name: "authentik Default Admin",
  provider: "authentik",
  role: "admin",
  plan: "premium",
  is_active: true,
};

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false }),
  });
});

afterEach(cleanup);

function renderWithTheme(element: React.ReactNode) {
  return render(<ThemeProvider>{element}</ThemeProvider>);
}

describe("AppShell", () => {
  it("usa fora do avatar o mesmo nome configurado no perfil", async () => {
    renderWithTheme(
      <AppShell activeSection="documents" user={user} taxYear={2026}>
        <h1>Meus documentos</h1>
      </AppShell>
    );

    expect(screen.getByRole("heading", { name: "Meus documentos" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Documentos" }).length).toBeGreaterThan(0);
    expect(await screen.findByText("Rodrigo Faveri")).toBeTruthy();
    expect(screen.queryByText("authentik Default Admin")).toBeNull();
    expect(screen.getByText("Base IRPF 2026")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Administração" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Histórico" })[0]?.getAttribute("href")).toBe("/historico");
  });

  it("oferece navegação compartilhada no modo foco do chat", () => {
    renderWithTheme(<FocusModeNavigation />);

    expect(screen.getByRole("navigation", { name: "Navegação do aplicativo" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "DeclarIA — início" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Chat" }).getAttribute("aria-current")).toBe("page");
  });

  it("abre o menu funcional do avatar e alterna o tema por ele", () => {
    renderWithTheme(
      <AppShell activeSection="home" user={user}>
        <div>Dashboard</div>
      </AppShell>
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir perfil" }));
    expect(screen.getByText("Dados do perfil")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Tema da interface/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Tema da interface/ }));
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
