import type { Status } from "@/lib/types";

const STYLES: Record<Status, string> = {
  "Not Started": "bg-neutral-100 text-neutral-600",
  Contacted: "bg-blue-100 text-blue-700",
  "Meeting Booked": "bg-indigo-100 text-indigo-700",
  "Requirement Confirmed": "bg-violet-100 text-violet-700",
  "Proposal Sent": "bg-amber-100 text-amber-700",
  Landed: "bg-green-100 text-green-700",
  Stalled: "bg-red-100 text-red-700",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
