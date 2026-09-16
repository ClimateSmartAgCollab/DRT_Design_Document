"use client";

import Link from "next/link";
import {
  TABLE_COUNT_STATUS,
  buildOwnerListHref,
  filtersForSummaryRow,
} from "../utils/buildOwnerListHref";
import { summaryRowLabel } from "../utils/outcomeMix";

export interface SummaryTableRow {
  dataset_ID?: string;
  visible_label?: string;
  data_label: string;
  tag: string;
  record_label?: string;
  total_requests: number;
  accepted_requests: number;
  rejected_requests: number;
  requestor_open: number;
  owner_open: number;
  abandoned_requests: number;
  archived_requests: number;
  canceled_requests?: number;
  generated_at: string;
  last_updated?: string;
  last_activity?: string | null;
  negotiation_date_range?: {
    min_date: string | null;
    max_date: string | null;
  };
  validation_status?: {
    is_valid: boolean;
    message: string | null;
    difference?: number;
  };
}

const TABLE_HEADERS = [
  "Record Label",
  "Data Label",
  "Visible Label",
  "Dataset ID",
  "Total",
  "Accepted",
  "Rejected",
  "Req. Open",
  "Own. Open",
  "Abandoned",
  "Archived",
  "Canceled",
  "Activity & Dates",
];

const COUNT_LINK_CLASS =
  "block -mx-4 -my-2 px-4 py-2 cursor-pointer text-[rgb(55,125,28)] underline-offset-2 hover:bg-[rgba(180,230,160,0.25)] hover:underline focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[rgb(70,160,35)]";

const IDENTITY_LINK_CLASS =
  "cursor-pointer text-[rgb(55,125,28)] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[rgb(70,160,35)] rounded";

function splitTags(tag: string | undefined): string[] {
  if (!tag || !tag.trim()) return [];
  return tag.split(",").map((t) => t.trim()).filter(Boolean);
}

function CountCell({
  href,
  value,
  ariaLabel,
}: {
  href: string;
  value: number;
  ariaLabel: string;
}) {
  return (
    <td className="border px-4 py-2">
      <Link href={href} aria-label={ariaLabel} className={COUNT_LINK_CLASS}>
        {value}
      </Link>
    </td>
  );
}

function ActivityDatesCell({
  lastActivity,
  lastUpdated,
  dateRange,
}: {
  lastActivity?: string | null;
  lastUpdated: string;
  dateRange?: { min_date: string | null; max_date: string | null };
}) {
  const dateRangeDisplay =
    dateRange && dateRange.min_date && dateRange.max_date
      ? dateRange.min_date === dateRange.max_date
        ? { single: true, date: new Date(dateRange.min_date).toLocaleDateString() }
        : {
            single: false,
            first: new Date(dateRange.min_date).toLocaleDateString(),
            last: new Date(dateRange.max_date).toLocaleDateString(),
          }
      : null;
  const lastActivityText = lastActivity
    ? new Date(lastActivity).toLocaleString()
    : null;

  return (
    <div className="space-y-2">
      {lastActivityText ? (
        <>
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Last activity
            </div>
            <div className="text-sm text-gray-900">{lastActivityText}</div>
          </div>
          {dateRangeDisplay && (
            <div className="pt-2 border-t border-gray-200">
              {dateRangeDisplay.single ? (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Request created
                  </div>
                  <div className="text-xs text-gray-700">{dateRangeDisplay.date}</div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Request created
                  </div>
                  <div className="text-xs text-gray-700 space-y-0.5">
                    <div>
                      <span className="text-gray-500">First:</span> {dateRangeDisplay.first}
                    </div>
                    <div>
                      <span className="text-gray-500">Last:</span> {dateRangeDisplay.last}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-gray-600">
          {new Date(lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
}

interface SummaryResultsTableProps {
  rows: SummaryTableRow[];
  tags: string[];
  startDate: string;
  endDate: string;
  dateField?: "created" | "decided";
}

export function SummaryResultsTable({
  rows,
  tags,
  startDate,
  endDate,
  dateField,
}: SummaryResultsTableProps) {
  return (
    <section className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">
            {TABLE_HEADERS.map((header) => (
              <th key={header} className="border px-4 py-2">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={TABLE_HEADERS.length}
                className="border px-4 py-8 text-center text-gray-500"
              >
                No data available
              </td>
            </tr>
          ) : (
            rows.map((d, idx) => {
              const tagsList = splitTags(d.tag);
              const invalid = Boolean(
                d.validation_status && !d.validation_status.is_valid
              );
              const groupFilters = filtersForSummaryRow({
                recordLabel: d.record_label,
                dataLabel: d.data_label,
                tags,
                startDate,
                endDate,
                dateField,
              });
              const rowHref = buildOwnerListHref(groupFilters);
              const rowName = summaryRowLabel(d);
              const hrefForStatus = (status: readonly string[]) =>
                buildOwnerListHref({
                  ...groupFilters,
                  status: [...status],
                });

              return (
                <tr
                  key={`record-${d.dataset_ID}-${d.record_label}-${d.data_label}-${idx}`}
                  className={invalid ? "bg-red-50" : undefined}
                >
                  <td className="border px-4 py-2">
                    <Link
                      href={rowHref}
                      aria-label={`Open owner list for ${rowName}`}
                      className={IDENTITY_LINK_CLASS}
                    >
                      {d.record_label || "All"}
                    </Link>
                    {tagsList.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tagsList.map((t) => (
                          <span
                            key={t}
                            className="inline-block bg-[rgba(180,230,160,0.3)] text-[rgb(55,125,28)] text-xs font-medium px-2 py-1 rounded"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="border px-4 py-2">
                    <Link
                      href={rowHref}
                      aria-label={`Open owner list for ${rowName}`}
                      className={IDENTITY_LINK_CLASS}
                    >
                      {d.data_label}
                    </Link>
                  </td>
                  <td className="border px-4 py-2">{d.visible_label || "—"}</td>
                  <td className="border px-4 py-2 font-mono text-xs">
                    {d.dataset_ID || "—"}
                  </td>
                  <CountCell
                    href={rowHref}
                    value={d.total_requests}
                    ariaLabel={`Total ${d.total_requests} for ${rowName}. Open owner list for this group.`}
                  />
                  <CountCell
                    href={hrefForStatus(TABLE_COUNT_STATUS.accepted)}
                    value={d.accepted_requests}
                    ariaLabel={`Accepted ${d.accepted_requests} for ${rowName}. Open owner list filtered to accepted.`}
                  />
                  <CountCell
                    href={hrefForStatus(TABLE_COUNT_STATUS.rejected)}
                    value={d.rejected_requests}
                    ariaLabel={`Rejected ${d.rejected_requests} for ${rowName}. Open owner list filtered to rejected.`}
                  />
                  <CountCell
                    href={hrefForStatus(TABLE_COUNT_STATUS.requestor_open)}
                    value={d.requestor_open}
                    ariaLabel={`Requestor open ${d.requestor_open} for ${rowName}. Open owner list filtered to requestor open.`}
                  />
                  <CountCell
                    href={hrefForStatus(TABLE_COUNT_STATUS.owner_open)}
                    value={d.owner_open}
                    ariaLabel={`Owner open ${d.owner_open} for ${rowName}. Open owner list filtered to owner open.`}
                  />
                  <CountCell
                    href={hrefForStatus(TABLE_COUNT_STATUS.abandoned)}
                    value={d.abandoned_requests || 0}
                    ariaLabel={`Abandoned ${d.abandoned_requests || 0} for ${rowName}. Open owner list filtered to abandoned.`}
                  />
                  <td className="border px-4 py-2">{d.archived_requests || 0}</td>
                  <td className="border px-4 py-2">{d.canceled_requests || 0}</td>
                  <td className="border px-4 py-2">
                    <ActivityDatesCell
                      lastActivity={d.last_activity}
                      lastUpdated={d.last_updated || d.generated_at}
                      dateRange={d.negotiation_date_range}
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </section>
  );
}
