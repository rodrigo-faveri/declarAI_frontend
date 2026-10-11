export function PageLoading({ label = "Carregando..." }: { label?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--page-gradient)] px-6 text-[var(--foreground)]">
      <div
        className="rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 text-sm shadow-lg backdrop-blur-xl"
        role="status"
        aria-live="polite"
      >
        {label}
      </div>
    </main>
  );
}
