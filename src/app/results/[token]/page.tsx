import { ResultsPage } from "@/components/results-page";

export default async function SharedResultsRoute({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <ResultsPage sharedToken={token} />;
}
