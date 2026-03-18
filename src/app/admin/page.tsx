import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, hasAdminPassword, isAuthorizedAdmin, readLocalSubmissions } from "@/lib/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const params = searchParams ? await searchParams : {};
  const hasError = params.error === "1";
  const isAuthed = isAuthorizedAdmin(adminCookie);
  const submissions = isAuthed ? await readLocalSubmissions() : [];

  if (!hasAdminPassword()) {
    return (
      <main className="min-h-screen bg-ink px-4 py-12 text-paper sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardContent className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Admin</p>
              <h1 className="font-display text-4xl font-bold">Set an admin password first</h1>
              <p className="text-base leading-7 text-cloud/75">
                Add <code>ADMIN_PASSWORD</code> to your local env file and Vercel environment variables to enable the dashboard.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <main className="min-h-screen bg-ink px-4 py-12 text-paper sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md">
          <Card className="border-glow/15 bg-[radial-gradient(circle_at_top_left,rgba(121,242,210,0.12),transparent_28%),linear-gradient(160deg,rgba(12,23,40,0.96),rgba(7,14,25,1))]">
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Admin</p>
                <h1 className="font-display text-4xl font-bold">Bad Data Test dashboard</h1>
                <p className="text-sm leading-7 text-cloud/72">
                  Password protection is enabled without a full login system. Enter the dashboard password to continue.
                </p>
              </div>
              <form action="/api/admin-auth" method="POST" className="space-y-4">
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold uppercase tracking-[0.14em] text-paper/88">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-paper outline-none transition focus:border-glow/50"
                  />
                </div>
                {hasError ? <p className="text-sm text-rose">Incorrect password.</p> : null}
                <Button type="submit" size="lg">Open dashboard</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const totalResponses = submissions.length;
  const averageScore = average(submissions.map((item) => item.result.score));
  const highFit = submissions.filter((item) => item.result.qualification === "High fit").length;
  const highUrgency = submissions.filter((item) => item.result.score >= 70).length;

  return (
    <main className="min-h-screen bg-ink px-4 py-10 text-paper sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Admin dashboard</p>
            <h1 className="font-display text-5xl font-bold">Funnel performance and responses</h1>
            <p className="max-w-3xl text-base leading-7 text-cloud/74">
              Best first version: executive funnel metrics on top, response list underneath, and a lightweight password gate instead of a full auth system.
            </p>
          </div>
          <form action="/api/admin-logout" method="POST">
            <Button variant="secondary" type="submit">Lock dashboard</Button>
          </form>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total responses", value: totalResponses.toLocaleString() },
            { label: "Average bad data score", value: averageScore ? averageScore.toFixed(1) : "0" },
            { label: "High-fit leads", value: highFit.toLocaleString() },
            { label: "High-urgency responses", value: highUrgency.toLocaleString() },
          ].map((metric) => (
            <Card key={metric.label}>
              <CardContent className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cloud/60">{metric.label}</p>
                <p className="font-display text-4xl font-bold text-paper">{metric.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-glow">Responses</p>
              <h2 className="font-display text-3xl font-bold">Recent quiz submissions</h2>
              <p className="text-sm leading-7 text-cloud/68">
                This list reads from the local submission store. For durable production history on Vercel, the next step would be a real database or CRM sync readback.
              </p>
            </div>

            {submissions.length === 0 ? (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 text-sm text-cloud/68">
                No local responses found yet. If you are on Vercel with local storage disabled, this dashboard will need a durable storage source for a persistent response list.
              </div>
            ) : (
              <div className="grid gap-4">
                {submissions.map((submission, index) => (
                  <div key={`${submission.submittedAt}-${index}`} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-paper">
                          {submission.lead.firstName || "Anonymous responder"}
                          {submission.lead.workEmail ? ` • ${submission.lead.workEmail}` : ""}
                          {submission.lead.phone ? ` • ${submission.lead.phone}` : ""}
                        </p>
                        <p className="text-sm text-cloud/60">{formatDate(submission.submittedAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-cloud/75">
                          Score {submission.result.score}
                        </span>
                        <span className="rounded-full border border-glow/15 bg-glow/10 px-3 py-1 text-sm text-glow">
                          {submission.result.qualification}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cloud/50">Result</p>
                        <p className="mt-2 text-sm text-paper">{submission.result.label}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cloud/50">Recommended next step</p>
                        <p className="mt-2 text-sm text-paper">{submission.result.recommendedNextStep}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cloud/50">Monthly visitors</p>
                        <p className="mt-2 text-sm text-paper">{submission.opportunity?.monthlyTraffic?.toLocaleString() || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cloud/50">CPA</p>
                        <p className="mt-2 text-sm text-paper">{submission.opportunity?.cpa ? `$${submission.opportunity.cpa}` : "—"}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cloud/50">Findings</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {submission.result.findings.map((finding) => (
                          <span key={finding} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-cloud/72">
                            {finding}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
