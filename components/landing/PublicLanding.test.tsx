import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PublicLanding from "./PublicLanding";

describe("landing pública", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("destaca o acesso principal e mantém os perfis locais ocultos em produção", () => {
    const onLogin = vi.fn();

    render(
      <PublicLanding
        loggingInAs={null}
        onDevLogin={vi.fn()}
        onLogin={onLogin}
        showDevelopmentAccess={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /começar gratuitamente/i }));

    expect(onLogin).toHaveBeenCalledOnce();
    expect(screen.queryByText("Acessos de desenvolvimento")).toBeNull();
  });

  it("oferece uma demonstração interativa dos fluxos do produto", () => {
    render(
      <PublicLanding
        loggingInAs={null}
        onDevLogin={vi.fn()}
        onLogin={vi.fn()}
        showDevelopmentAccess={true}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /veja como funciona/i }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: /tirar dúvidas/i }));
    expect(
      screen.getByText(/uma despesa médica reembolsada pode ser declarada integralmente/i)
    ).toBeTruthy();
    expect(screen.getByText("Acessos de desenvolvimento")).toBeTruthy();
  });
});
