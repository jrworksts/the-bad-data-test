import Link from "next/link";
import { articles } from "@/config/articles";
import { Card, CardContent } from "@/components/ui/card";

export default function InsightsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Insights</p>
        <h1 className="font-display text-5xl font-bold text-paper">Diagnostic content built around bad data, signal loss, and recoverable pipeline</h1>
        <p className="text-lg leading-8 text-cloud/75">
          This route structure is ready for future SEO content around attribution failure, anonymous traffic, and rising CPA.
        </p>
      </div>
      <div className="mt-10 grid gap-6">
        {articles.map((article) => (
          <Card key={article.slug}>
            <CardContent className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Article</p>
              <h2 className="font-display text-3xl font-bold text-paper">
                <Link href={`/insights/${article.slug}`}>{article.title}</Link>
              </h2>
              <p className="text-base leading-7 text-cloud/72">{article.excerpt}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
