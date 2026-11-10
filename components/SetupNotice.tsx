/** Shown instead of a form/table when Supabase env vars are missing. */
export default function SetupNotice() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Setup needed — Supabase is not connected yet.</p>
      <p className="mt-1">
        Add your Supabase keys in <code className="rounded bg-amber-100 px-1">.env.local</code>{" "}
        (locally) or in Vercel → Project Settings → Environment Variables, then restart the app.
        See <code className="rounded bg-amber-100 px-1">README.md</code> for the exact steps and the
        SQL to run in the Supabase SQL editor.
      </p>
    </div>
  );
}
