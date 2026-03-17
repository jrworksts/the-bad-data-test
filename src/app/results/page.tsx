import { Suspense } from "react";
import { ResultsPage } from "@/components/results-page";

export default function ResultsRoute() {
  return (
    <Suspense fallback={null}>
      <ResultsPage />
    </Suspense>
  );
}
