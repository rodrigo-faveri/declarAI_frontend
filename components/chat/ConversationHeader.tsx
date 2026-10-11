"use client";

import { Menu } from "lucide-react";

type ConversationHeaderProps = {
  title?: string;
  isDark?: boolean;
  onOpenDrawer?: () => void;
};

export default function ConversationHeader({
  title,
  isDark = true,
  onOpenDrawer,
}: ConversationHeaderProps) {
  const hasTitle = Boolean(title?.trim());

  if (!hasTitle) {
    if (!onOpenDrawer) {
      return null;
    }

    return (
      <div className="flex justify-end px-5 pt-4 lg:hidden">
        <button
          type="button"
          onClick={onOpenDrawer}
          className={`inline-flex rounded-2xl border p-2 transition ${
            isDark
              ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
              : "border-slate-300/80 bg-white text-slate-600 hover:bg-slate-50"
          }`}
          aria-label="Abrir painel"
        >
          <Menu size={18} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`border-b px-5 py-4 ${
        isDark
          ? "border-white/10 bg-slate-950/30"
          : "border-slate-200/80 bg-white/70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {hasTitle ? (
          <div>
            <h2
              className={`text-lg font-semibold sm:text-xl ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {title?.trim()}
            </h2>
          </div>
        ) : (
          <div />
        )}
        {onOpenDrawer ? (
          <button
            type="button"
            onClick={onOpenDrawer}
            className={`inline-flex rounded-2xl border p-2 transition lg:hidden ${
              isDark
                ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                : "border-slate-300/80 bg-white text-slate-600 hover:bg-slate-50"
            }`}
            aria-label="Abrir painel"
          >
            <Menu size={18} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
