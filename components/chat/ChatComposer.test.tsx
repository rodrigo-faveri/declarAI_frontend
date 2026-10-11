import { createRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ChatComposer from "./ChatComposer";

afterEach(cleanup);

function renderComposer(overrides: Partial<React.ComponentProps<typeof ChatComposer>> = {}) {
  const props: React.ComponentProps<typeof ChatComposer> = {
    message: "",
    loading: false,
    resetting: false,
    error: "",
    rateLimitMessage: "",
    rateLimitRemainingSeconds: 0,
    maxMessageLength: 1000,
    onChange: vi.fn(),
    onKeyDown: vi.fn(),
    onSend: vi.fn(),
    onPickDocument: vi.fn(),
    onRemoveUploadedDocument: vi.fn(),
    textareaRef: createRef<HTMLTextAreaElement>(),
    ...overrides,
  };

  render(<ChatComposer {...props} />);
  return props;
}

describe("ChatComposer", () => {
  it("mantém instruções de teclado e botão de envio acessíveis", () => {
    const props = renderComposer({ message: "Minha dúvida" });

    expect(screen.getByLabelText("Mensagem para o DeclarIA")).toBeTruthy();
    expect(screen.getByText("Enter envia · Shift+Enter quebra a linha")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(props.onSend).toHaveBeenCalledOnce();
  });

  it("oferece nova tentativa quando há erro", () => {
    const onRetry = vi.fn();
    renderComposer({ message: "Tentar de novo", error: "Falha temporária", onRetry });

    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert").textContent).toContain("Falha temporária");
  });

  it("troca o envio por cancelamento enquanto processa", () => {
    const onCancel = vi.fn();
    renderComposer({ message: "Processando", loading: true, onCancel });

    fireEvent.click(screen.getByRole("button", { name: /cancelar resposta/i }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Enviar" })).toBeNull();
  });
});
