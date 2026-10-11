import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import type { AuthUser } from "@/types/chat";
import { AppShell, FocusModeNavigation } from "./AppShell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const user: AuthUser = {
  id: "user-1",
  email: "rodrigo@example.com",
  name: "Rodrigo Faveri",
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
  it("mantém a navegação, a conta e o conteúdo no mesmo layout", () => {
    renderWithTheme(
      <AppShell activeSection="documents" user={user} taxYear={2026}>
        <h1>Meus documentos</h1>
      </AppShell>
    );

    expect(screen.getByRole("heading", { name: "Meus documentos" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Documentos" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Rodrigo Faveri")).toBeTruthy();
    expect(screen.getByText("Base IRPF 2026")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Administração" })).toBeTruthy();
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
