import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import type { AuthUser } from "@/types/chat";
import { AppShell, FocusModeNavigation } from "./AppShell";

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
});
