"use client";

import Link from "next/link";
import {
  ClickableKpiId,
  KPI_LIST_STATUS,
  decidedWindowLabel,
  formatAcceptanceRate,
  summarizeKpis,
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
}: KpiStripProps) {
  const kpis = summarizeKpis(rows);
  const windowLabel = decidedWindowLabel(startDate, endDate);
  const filterState = {
    tags,
    dataLabel: dataLabels,
    recordLabel: recordLabels,
    startDate,
    endDate,
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

  return (
    <section
      aria-label="Summary totals"
      className={`grid grid-cols-2 gap-4 ${
        kpis.acceptanceRate !== null ? "xl:grid-cols-5" : "xl:grid-cols-4"
      }`}
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
    </section>
  );
}
