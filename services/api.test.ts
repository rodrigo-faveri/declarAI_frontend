import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

describe("cliente HTTP", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    document.cookie = "declaria_csrf=; Max-Age=0; Path=/";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("normaliza a URL configurada e codifica a URL de documentos", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com///");
    const { getSourceDocumentUrl } = await import("./api");

    expect(getSourceDocumentUrl("fontes/arquivo com espaço.pdf", "2026")).toBe(
      "https://api.example.com/sources/raw?path=fontes%2Farquivo+com+espa%C3%A7o.pdf&tax_year=2026"
    );
  });

  it("envia cookies de sessão sem CSRF em requisições de leitura", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ authenticated: false }));
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "declaria_csrf=token-de-leitura; Path=/";
    const { getAuthStatus } = await import("./api");

    await getAuthStatus();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/auth/me",
      expect.objectContaining({
        credentials: "include",
        method: "GET",
        headers: expect.not.objectContaining({ "X-CSRF-Token": expect.anything() }),
      })
    );
  });

  it("envia o token CSRF decodificado em requisições de escrita", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "declaria_csrf=token%20seguro; Path=/";
    const { logout } = await import("./api");

    await logout();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/auth/logout",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-CSRF-Token": "token seguro" }),
      })
    );
  });

  it("não define Content-Type ao enviar FormData", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "upload-1" }));
    vi.stubGlobal("fetch", fetchMock);
    const { uploadDocument } = await import("./api");
    const file = new File(["conteúdo"], "informe.pdf", { type: "application/pdf" });

    await uploadDocument(file);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers).not.toHaveProperty("Content-Type");
  });

  it("preserva detalhe, status e Retry-After de erros HTTP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { detail: "Muitas tentativas" },
          { status: 429, headers: { "Retry-After": "30" } }
        )
      )
    );
    const { ApiError, getAuthStatus } = await import("./api");

    const error = await getAuthStatus().catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      message: "Muitas tentativas",
      status: 429,
      retryAfter: 30,
    });
  });

  it("usa mensagem padrão quando o erro HTTP não contém JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("indisponível", { status: 503 }))
    );
    const { getAuthStatus } = await import("./api");

    await expect(getAuthStatus()).rejects.toMatchObject({
      message: "Erro ao chamar API",
      status: 503,
      retryAfter: null,
    });
  });

  it("converte falha de rede em ApiError distinguível", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const { getAuthStatus } = await import("./api");

    await expect(getAuthStatus()).rejects.toMatchObject({
      status: 0,
      retryAfter: null,
      message: expect.stringContaining("conectar ao backend"),
    });
  });
});
