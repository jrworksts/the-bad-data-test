import type { OpportunityEstimate, OpportunityInputs } from "@/lib/types";

function moneyRange(min: number, max: number) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  return `${formatter.format(min)}-${formatter.format(max)}`;
}

export function estimateOpportunity(inputs: OpportunityInputs): OpportunityEstimate {
  const traffic = inputs.monthlyTraffic || 15000;
  const cpa = inputs.cpa || 180;
  const closeRate = (inputs.leadToCloseRate || 3.6) / 100;
  const averageDeal = inputs.averageDealValue || 18000;
  const identificationRate = inputs.identificationRate || 5;

  const anonymousVisitors = traffic * ((100 - identificationRate) / 100);
  const conservativeRecoveredLeads = anonymousVisitors * 0.01;
  const aggressiveRecoveredLeads = anonymousVisitors * 0.025;

  const wastedSpendLow = cpa * conservativeRecoveredLeads * 0.6;
  const wastedSpendHigh = cpa * aggressiveRecoveredLeads;

  const pipelineLow = conservativeRecoveredLeads * closeRate * averageDeal;
  const pipelineHigh = aggressiveRecoveredLeads * closeRate * averageDeal * 1.15;

  return {
    wastedSpendRange: moneyRange(Math.round(wastedSpendLow), Math.round(wastedSpendHigh)),
    recoverablePipelineRange: moneyRange(Math.round(pipelineLow), Math.round(pipelineHigh)),
    anonymousTrafficUpside: `${Math.round(anonymousVisitors).toLocaleString()} additional visitors per month could become usable signal with a modest 20% lift in identification.`,
    assumptions: [
      `Using ${traffic.toLocaleString()} monthly visitors`,
      `Using ${cpa.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} CPA`,
      `Using ${inputs.leadToCloseRate || 3.6}% sales conversion rate`,
      `Using ${averageDeal.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} average deal value`,
      `Using ${identificationRate}% current traffic identification rate`,
    ],
  };
}
