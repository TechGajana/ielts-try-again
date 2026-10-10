import Link from 'next/link';

export default function AccessDenied() {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
      <h1 className="text-xl font-semibold tracking-tight">Access denied</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This section is available to primary administrators only.
      </p>
      <Link
        href="/admin"
        className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Return to dashboard
      </Link>
    </div>
  );
}
