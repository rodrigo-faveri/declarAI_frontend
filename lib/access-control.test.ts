import { describe, expect, it } from "vitest";

import { createAuthUser } from "@/tests/fixtures/auth";
import {
  canAccessAdmin,
  canAccessTechnicalUploads,
  canManageKnowledgeBase,
  canUploadDocumentsForUser,
  isPremiumPlan,
} from "./access-control";

describe("regras de acesso", () => {
  it.each([
    ["user", false],
    ["technical", false],
    ["admin", true],
    [undefined, false],
  ])("restringe administração para o papel %s", (role, expected) => {
    expect(canAccessAdmin(role)).toBe(expected);
    expect(canManageKnowledgeBase(role)).toBe(expected);
  });

  it.each([
    ["user", false],
    ["technical", true],
    ["admin", true],
    ["unknown", false],
  ])("controla uploads técnicos para o papel %s", (role, expected) => {
    expect(canAccessTechnicalUploads(role)).toBe(expected);
  });

  it("reconhece apenas o plano Premium", () => {
    expect(isPremiumPlan("premium")).toBe(true);
    expect(isPremiumPlan("free")).toBe(false);
    expect(isPremiumPlan("enterprise")).toBe(false);
  });

  it.each([
    ["free comum", createAuthUser(), false],
    ["premium", createAuthUser({ plan: "premium" }), true],
    ["técnico", createAuthUser({ role: "technical" }), true],
    ["admin", createAuthUser({ role: "admin" }), true],
    ["anônimo", null, false],
  ])("controla upload para usuário %s", (_label, user, expected) => {
    expect(canUploadDocumentsForUser(user)).toBe(expected);
  });
});
