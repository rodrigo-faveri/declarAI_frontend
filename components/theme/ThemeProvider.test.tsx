import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeProvider, useTheme } from "./ThemeProvider";

function ThemeProbe() {
  const { resolvedTheme } = useTheme();
  return <div data-testid="theme">{resolvedTheme}</div>;
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({
        matches: false,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });
  });

  afterEach(cleanup);

  it("usa o mesmo tema inicial do servidor durante a hidratação", () => {
    window.localStorage.setItem("declaria_theme", "light");

    const serverHtml = renderToString(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(serverHtml).toContain(">dark<");
  });

  it("aplica a preferência salva depois que o cliente assume a interface", () => {
    window.localStorage.setItem("declaria_theme", "light");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
