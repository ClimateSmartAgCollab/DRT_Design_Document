"use client";

import Link from "next/link";
import {
  ClickableKpiId,
  FULFILLMENT_LIST_STATUS,
  KPI_LIST_STATUS,
  decidedWindowLabel,
  formatAcceptanceRate,
  formatDurationSeconds,
  summarizeKpis,
  type DateField,
  type FulfillmentKpiId,
  type SummaryClocks,
  type SummaryFulfillment,
  type SummaryKpiSource,
} from "../utils/summaryKpis";
import { buildOwnerListHref } from "../utils/buildOwnerListHref";

type KpiTone = "urgent" | "neutral" | "negative";

interface KpiStripProps {
  rows: SummaryKpiSource[];
  tags?: string[];
  dataLabels?: string[];
  recordLabels?: string[];
  startDate?: string;
  endDate?: string;
  dateField?: DateField;
  clocks?: SummaryClocks | null;
  fulfillment?: SummaryFulfillment | null;
}

const TONE_CLASS: Record<KpiTone, string> = {
  urgent:
    "border-2 border-[rgb(70,160,35)] bg-[rgba(180,230,160,0.3)] text-[rgb(55,125,28)]",
  neutral: "border border-gray-200 bg-white text-gray-900",
  negative: "border border-red-200 bg-red-50 text-red-900",
};

function cardClass(tone: KpiTone, clickable: boolean): string {
  return [
    "rounded-lg p-4 shadow-sm flex flex-col gap-1 text-left",
    TONE_CLASS[tone],
    clickable
      ? "cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[rgb(70,160,35)] focus:ring-offset-2"
      : "",
  ].join(" ");
}

export function KpiStrip({
  rows,
  tags,
  dataLabels,
  recordLabels,
  startDate,
  endDate,
  dateField = "created",
  clocks,
  fulfillment,
}: KpiStripProps) {
  const kpis = summarizeKpis(rows);
  const windowLabel = decidedWindowLabel(startDate, endDate, dateField);
  const filterState = {
    tags,
    dataLabel: dataLabels,
    recordLabel: recordLabels,
    startDate,
    endDate,
    dateField,
  };

  const hrefFor = (id: ClickableKpiId) =>
    buildOwnerListHref({
      ...filterState,
      status: KPI_LIST_STATUS[id],
    });

  const clickableCards: Array<{
    id: ClickableKpiId;
    label: string;
    value: number;
    subtitle: string;
    tone: KpiTone;
    ariaLabel: string;
  }> = [
    {
      id: "waitingOnYou",
      label: "Waiting on you",
      value: kpis.waitingOnYou,
      subtitle: "Owner open",
      tone: "urgent",
      ariaLabel: `Waiting on you: ${kpis.waitingOnYou}. Open owner list filtered to owner open.`,
    },
    {
      id: "waitingOnRequestor",
      label: "Waiting on requestor",
      value: kpis.waitingOnRequestor,
      subtitle: "Requestor open",
      tone: "neutral",
      ariaLabel: `Waiting on requestor: ${kpis.waitingOnRequestor}. Open owner list filtered to requestor open.`,
    },
    {
      id: "decided",
      label: "Decided",
      value: kpis.decided,
      subtitle: windowLabel,
      tone: "neutral",
      ariaLabel: `Decided: ${kpis.decided} (${windowLabel}). Open owner list filtered to accepted and rejected.`,
    },
    {
      id: "abandoned",
      label: "Abandoned",
      value: kpis.abandoned,
      subtitle: "Idle after reminder",
      tone: "negative",
      ariaLabel: `Abandoned: ${kpis.abandoned}. Open owner list filtered to abandoned.`,
    },
  ];

  const fulfillmentCards: Array<{
    id: FulfillmentKpiId;
    label: string;
    value: number;
    subtitle: string;
    tone: KpiTone;
    ariaLabel: string;
  }> = [
    {
      id: "pending",
      label: "Pending delivery",
      value: fulfillment?.pending ?? 0,
      subtitle: "Accepted, not yet delivered",
      tone: "urgent",
      ariaLabel: `Pending delivery: ${fulfillment?.pending ?? 0}. Open owner list filtered to accepted pending delivery.`,
    },
    {
      id: "delivered",
      label: "Delivered",
      value: fulfillment?.delivered ?? 0,
      subtitle: "Access recorded as delivered",
      tone: "neutral",
      ariaLabel: `Delivered: ${fulfillment?.delivered ?? 0}. Open owner list filtered to accepted delivered.`,
    },
    {
      id: "withdrawn",
      label: "Withdrawn",
      value: fulfillment?.withdrawn ?? 0,
      subtitle: "Access withdrawn for this requestor",
      tone: "negative",
      ariaLabel: `Withdrawn: ${fulfillment?.withdrawn ?? 0}. Open owner list filtered to accepted withdrawn.`,
    },
  ];

  return (
    <div className="space-y-6">
      <section
        aria-label="Summary totals"
        className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-4"
      >
      {clickableCards.map((card) => (
        <Link
          key={card.id}
          href={hrefFor(card.id)}
          aria-label={card.ariaLabel}
          className={cardClass(card.tone, true)}
        >
          <span className="text-xs font-medium uppercase tracking-wide opacity-80">
            {card.label}
          </span>
          <span className="text-2xl sm:text-3xl font-bold">{card.value}</span>
          <span className="text-xs opacity-80">{card.subtitle}</span>
        </Link>
      ))}
      {kpis.acceptanceRate !== null && (
        <div className={cardClass("neutral", false)} aria-label="Acceptance rate">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Acceptance rate
          </span>
          <span className="text-2xl sm:text-3xl font-bold">
            {formatAcceptanceRate(kpis.acceptanceRate)}
          </span>
          <span className="text-xs text-gray-500">
            {kpis.accepted} accepted / {kpis.decided} decided
          </span>
        </div>
      )}
      <div
        className={cardClass("neutral", false)}
        aria-label={`Median time to first look: ${formatDurationSeconds(
          clocks?.median_time_to_first_look_seconds,
          clocks?.first_look_sample_size ?? 0
        )}. Sample size ${clocks?.first_look_sample_size ?? 0}.`}
      >
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Median time to first look
        </span>
        <span className="text-2xl sm:text-3xl font-bold">
          {formatDurationSeconds(
            clocks?.median_time_to_first_look_seconds,
            clocks?.first_look_sample_size ?? 0
          )}
        </span>
        <span className="text-xs text-gray-500">
          n={clocks?.first_look_sample_size ?? 0} with clocks
        </span>
      </div>
      <div
        className={cardClass("neutral", false)}
        aria-label={`Median time to decision: ${formatDurationSeconds(
          clocks?.median_time_to_decision_seconds,
          clocks?.decision_sample_size ?? 0
        )}. Sample size ${clocks?.decision_sample_size ?? 0}.`}
      >
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Median time to decision
        </span>
        <span className="text-2xl sm:text-3xl font-bold">
          {formatDurationSeconds(
            clocks?.median_time_to_decision_seconds,
            clocks?.decision_sample_size ?? 0
          )}
        </span>
        <span className="text-xs text-gray-500">
          n={clocks?.decision_sample_size ?? 0} with clocks
        </span>
      </div>
    </section>

      <section aria-label="Delivery totals" className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Delivery</h2>
          <p className="mt-1 text-xs text-gray-500">
            Recorded after accept. Historical accepted cases that were never
            marked are omitted. This is not file access over time.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {fulfillmentCards.map((card) => (
            <Link
              key={card.id}
              href={buildOwnerListHref({
                ...filterState,
                status: ["accepted"],
                fulfillmentStatus: FULFILLMENT_LIST_STATUS[card.id],
              })}
              aria-label={card.ariaLabel}
              className={cardClass(card.tone, true)}
            >
              <span className="text-xs font-medium uppercase tracking-wide opacity-80">
                {card.label}
              </span>
              <span className="text-2xl sm:text-3xl font-bold">{card.value}</span>
              <span className="text-xs opacity-80">{card.subtitle}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
