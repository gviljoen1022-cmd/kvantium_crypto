"use client";

import Link from "next/link";
import type { Engagement } from "@/lib/types";
import StatusUpdateControl from "./StatusUpdateControl";

export default function EngagementTable({
  rows,
  emptyLabel,
  onChanged,
}: {
  rows: Engagement[];
  emptyLabel: string;
  onChanged: () => void;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-neutral-500">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="px-3 py-2 font-medium">Customer</th>
            <th className="px-3 py-2 font-medium">Contact</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Next Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-3 py-2">
                <Link
                  href={`/dashboard/engagement/${row.id}`}
                  className="text-neutral-900 font-medium hover:underline"
                >
                  {row.customer_name}
                </Link>
              </td>
              <td className="px-3 py-2 text-neutral-600">{row.contact_name ?? "—"}</td>
              <td className="px-3 py-2">
                <StatusUpdateControl
                  engagementId={row.id}
                  status={row.status}
                  locked={!!row.locked_at}
                  onChanged={onChanged}
                />
              </td>
              <td className="px-3 py-2 text-neutral-600 tabular-nums">
                {row.next_action_date ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
