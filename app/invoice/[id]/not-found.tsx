import Link from "next/link";

export default function InvoiceNotFound() {
  return (
    <div className="min-h-screen bg-[var(--brand-bg)] flex flex-col items-center justify-center gap-4">
      <p className="text-[var(--brand-primary)] font-bold text-xl">Invoice Not Found</p>
      <p className="text-sm text-[var(--brand-text-muted)]">The requested invoice record could not be found or has been removed.</p>
      <Link
        href="/"
        className="px-6 py-2 bg-[var(--brand-border)] hover:bg-[var(--brand-border)] rounded-lg text-[#000000] font-bold transition-colors mt-2"
      >
        Return to Home
      </Link>
    </div>
  );
}
