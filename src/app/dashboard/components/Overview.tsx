"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TabName =
  | "Stakeholders"
  | "Commercials"
  | "Timeframes"
  | "Actions"
  | "Evidence"
  | "Artifacts";

type CardStat = { label: string; value: string };

type Card = {
  tab: TabName;
  title: string;
  count: number;
  emptyLabel: string;
  stats: CardStat[];
  icon: React.ReactNode;
};

const icons: Record<TabName, React.ReactNode> = {
  Stakeholders: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m5-2.13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-5a4 4 0 0 1 0 7.75"
    />
  ),
  Commercials: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
    />
  ),
  Timeframes: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 2v4M16 2v4M3 10h18"
      />
      <rect x="3" y="4" width="18" height="18" rx="2" />
    </>
  ),
  Actions: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m9 11 3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
    />
  ),
  Evidence: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M9 15h6M9 18h6"
    />
  ),
  Artifacts: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m21 8-9-5-9 5 9 5 9-5Zm0 0v8l-9 5m9-13-9 5m0 8-9-5V8m9 13V10"
    />
  ),
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Overview({
  projectId,
  onSelect,
}: {
  projectId: string;
  onSelect: (tab: TabName) => void;
}) {
  const supabase = createClient();
  const [cards, setCards] = useState<Card[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [stakeholders, commercials, timeframes, actions, evidence, artifacts] =
        await Promise.all([
          supabase
            .from("stakeholders")
            .select("organization")
            .eq("project_id", projectId),
          supabase
            .from("commercials")
            .select("category, amount, currency")
            .eq("project_id", projectId),
          supabase
            .from("timeframes")
            .select("title, status, due_date")
            .eq("project_id", projectId),
          supabase
            .from("actions")
            .select("status, due_date")
            .eq("project_id", projectId),
          supabase
            .from("evidence")
            .select("id", { count: "exact", head: true })
            .eq("project_id", projectId),
          supabase
            .from("artifacts")
            .select("type")
            .eq("project_id", projectId),
        ]);

      if (cancelled) return;

      const sh = stakeholders.data ?? [];
      const orgCount = new Set(
        sh.map((r) => r.organization).filter(Boolean)
      ).size;

      const comm = commercials.data ?? [];
      const profitShare = comm.filter((r) => r.category === "profit_share");
      const inputCost = comm.filter((r) => r.category === "input_cost");
      const sumByCurrency = (rows: typeof comm) => {
        const totals = new Map<string, number>();
        for (const r of rows) {
          if (r.amount == null) continue;
          const cur = r.currency || "—";
          totals.set(cur, (totals.get(cur) ?? 0) + Number(r.amount));
        }
        return [...totals.entries()]
          .map(([cur, total]) => `${total.toLocaleString()} ${cur}`)
          .join(", ");
      };

      const tf = timeframes.data ?? [];
      const tfDone = tf.filter((r) => r.status === "done").length;
      const tfUpcoming = tf
        .filter((r) => r.status !== "done" && r.due_date)
        .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))[0];

      const act = actions.data ?? [];
      const actOpen = act.filter((r) => r.status !== "done").length;
      const actOverdue = act.filter(
        (r) => r.status !== "done" && r.due_date && r.due_date < todayISO()
      ).length;

      const art = artifacts.data ?? [];
      const artTypes = new Set(art.map((r) => r.type).filter(Boolean)).size;

      setCards([
        {
          tab: "Stakeholders",
          title: "Stakeholders",
          count: sh.length,
          emptyLabel: "No stakeholders yet",
          icon: icons.Stakeholders,
          stats:
            sh.length === 0
              ? []
              : [{ label: "Organizations", value: String(orgCount) }],
        },
        {
          tab: "Commercials",
          title: "Commercials",
          count: comm.length,
          emptyLabel: "No commercial entries yet",
          icon: icons.Commercials,
          stats:
            comm.length === 0
              ? []
              : [
                  {
                    label: "Profit share",
                    value: sumByCurrency(profitShare) || `${profitShare.length} entries`,
                  },
                  {
                    label: "Input cost",
                    value: sumByCurrency(inputCost) || `${inputCost.length} entries`,
                  },
                ],
        },
        {
          tab: "Timeframes",
          title: "Timeframes",
          count: tf.length,
          emptyLabel: "No milestones yet",
          icon: icons.Timeframes,
          stats:
            tf.length === 0
              ? []
              : [
                  { label: "Done", value: `${tfDone}/${tf.length}` },
                  {
                    label: "Next due",
                    value: tfUpcoming
                      ? `${tfUpcoming.due_date} — ${tfUpcoming.title ?? ""}`.slice(0, 40)
                      : "—",
                  },
                ],
        },
        {
          tab: "Actions",
          title: "Actions",
          count: act.length,
          emptyLabel: "No actions yet",
          icon: icons.Actions,
          stats:
            act.length === 0
              ? []
              : [
                  { label: "Open", value: String(actOpen) },
                  { label: "Overdue", value: String(actOverdue) },
                ],
        },
        {
          tab: "Evidence",
          title: "Evidence",
          count: evidence.count ?? 0,
          emptyLabel: "Nothing uploaded yet",
          icon: icons.Evidence,
          stats: [],
        },
        {
          tab: "Artifacts",
          title: "Artifacts",
          count: art.length,
          emptyLabel: "Nothing uploaded yet",
          icon: icons.Artifacts,
          stats:
            art.length === 0
              ? []
              : [{ label: "Types", value: String(artTypes) }],
        },
      ]);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (!cards) {
    return <p className="text-sm text-neutral-400">Loading overview…</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <button
          key={card.tab}
          onClick={() => onSelect(card.tab)}
          className="text-left bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-400 hover:shadow-sm transition-all group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                {card.icon}
              </svg>
            </div>
            <span className="text-2xl font-semibold text-neutral-900 tabular-nums">
              {card.count}
            </span>
          </div>

          <h3 className="text-sm font-medium text-neutral-900 mb-1">
            {card.title}
          </h3>

          {card.stats.length === 0 ? (
            <p className="text-xs text-neutral-400">{card.emptyLabel}</p>
          ) : (
            <dl className="space-y-0.5">
              {card.stats.map((s) => (
                <div key={s.label} className="flex justify-between gap-2 text-xs">
                  <dt className="text-neutral-400">{s.label}</dt>
                  <dd className="text-neutral-600 truncate">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-4 text-xs font-medium text-neutral-400 group-hover:text-neutral-900 transition-colors">
            View all →
          </div>
        </button>
      ))}
    </div>
  );
}
