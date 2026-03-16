import { notFound } from "next/navigation";
import { articles } from "@/config/articles";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = articles.find((item) => item.slug === slug);

  if (!article) return {};

  return {
    title: `${article.title} | The Bad Data Test`,
    description: article.excerpt,
  };
}

export default async function InsightArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = articles.find((item) => item.slug === slug);

  if (!article) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <article className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-glow">Insight</p>
        <h1 className="font-display text-5xl font-bold text-paper">{article.title}</h1>
        <p className="text-xl leading-8 text-cloud/75">{article.excerpt}</p>
        <div className="space-y-5 text-base leading-8 text-cloud/78">
          {article.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
