import Link from "next/link";

/** Landing page: plain-words explanation + links to the form and the admin panel. */
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <div className="rounded-2xl bg-navy px-6 py-8 text-white shadow">
        <h1 className="text-2xl font-bold tracking-wide sm:text-3xl">
          DAILY STUDENT HABIT &amp; TIME REPORT
        </h1>
        <p className="mt-2 text-sm text-white/80 sm:text-base">
          A simple daily report for students — and a clear colour-coded table for the teacher.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/report"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-500 hover:shadow"
        >
          <h2 className="text-lg font-semibold text-slate-900">I am a student</h2>
          <p className="mt-1 text-sm text-slate-600">
            Fill in today&apos;s report: school, study, subjects, sleep, fun time, exercise,
            water, other activities, habit development and phone screen time.
          </p>
          <span className="mt-3 inline-block rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white">
            Open the student form →
          </span>
        </Link>
        <Link
          href="/admin"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-500 hover:shadow"
        >
          <h2 className="text-lg font-semibold text-slate-900">I am the teacher (admin)</h2>
          <p className="mt-1 text-sm text-slate-600">
            See every student&apos;s report for the day in one colour-coded table, edit or delete
            entries, manage the roster, change the colour rules and export Excel, PDF or a PNG
            image.
          </p>
          <span className="mt-3 inline-block rounded-md bg-navy px-4 py-2 text-sm font-medium text-white">
            Open the admin panel →
          </span>
        </Link>
      </div>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
        <h2 className="font-semibold text-slate-900">How it works</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Each student picks their name and fills in how they spent their 24 hours.</li>
          <li>One report per student per day — submitting again updates the old one.</li>
          <li>
            Cells turn <span className="font-medium text-green-600">green</span>,{" "}
            <span className="font-medium text-yellow-600">yellow</span> or{" "}
            <span className="font-medium text-red-600">red</span> by the rules (study 7h+, sleep
            8h+, exercise 30 min+, water 3 L and so on).
          </li>
          <li>
            The total must add up to 24 hours (within 5 minutes) — otherwise the table shows how
            much is missing or over.
          </li>
        </ol>
      </section>
    </main>
  );
}
