import type { AuthUser } from "@/types/chat";

export function canAccessAdmin(role?: string | null) {
  return role === "admin";
}

export function canAccessTechnicalUploads(role?: string | null) {
  return role === "technical" || canAccessAdmin(role);
}

export function canManageKnowledgeBase(role?: string | null) {
  return canAccessAdmin(role);
}

export function isPremiumPlan(plan?: string | null) {
  return plan === "premium";
}

export function canUploadDocumentsForUser(user?: AuthUser | null) {
  return Boolean(
    user &&
      (isPremiumPlan(user.plan) || canAccessTechnicalUploads(user.role))
  );
}
