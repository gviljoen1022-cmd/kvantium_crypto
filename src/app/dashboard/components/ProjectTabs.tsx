"use client";

import { useState } from "react";
import SimpleTable from "./SimpleTable";
import FileTable from "./FileTable";

const TABS = [
  "Stakeholders",
  "Commercials",
  "Timeframes",
  "Actions",
  "Evidence",
  "Artifacts",
] as const;

type Tab = (typeof TABS)[number];

export default function ProjectTabs({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<Tab>("Stakeholders");

  return (
    <div>
      <div className="flex gap-1 border-b border-neutral-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
              tab === t
                ? "border-neutral-900 text-neutral-900 font-medium"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Stakeholders" && (
        <SimpleTable
          table="stakeholders"
          projectId={projectId}
          emptyLabel="No stakeholders added yet."
          columns={[
            { key: "name", label: "Name", type: "text" },
            { key: "role", label: "Role", type: "text" },
            { key: "organization", label: "Organization", type: "text" },
            { key: "contact_info", label: "Contact", type: "text" },
          ]}
        />
      )}

      {tab === "Commercials" && (
        <SimpleTable
          table="commercials"
          projectId={projectId}
          emptyLabel="No commercial entries yet."
          columns={[
            {
              key: "category",
              label: "Category",
              type: "select",
              options: ["profit_share", "input_cost"],
            },
            { key: "label", label: "Description", type: "text" },
            {
              key: "cost_type",
              label: "Cost type",
              type: "select",
              options: ["deemed", "actual", "budgeted"],
            },
            { key: "party", label: "Party", type: "text" },
            { key: "amount", label: "Amount", type: "number" },
            { key: "currency", label: "Currency", type: "text" },
          ]}
        />
      )}

      {tab === "Timeframes" && (
        <SimpleTable
          table="timeframes"
          projectId={projectId}
          emptyLabel="No milestones added yet."
          columns={[
            { key: "title", label: "Milestone", type: "text" },
            { key: "due_date", label: "Due date", type: "date" },
            {
              key: "status",
              label: "Status",
              type: "select",
              options: ["pending", "in_progress", "done"],
            },
          ]}
        />
      )}

      {tab === "Actions" && (
        <SimpleTable
          table="actions"
          projectId={projectId}
          emptyLabel="No actions added yet."
          columns={[
            { key: "title", label: "Action", type: "text" },
            { key: "owner", label: "Owner", type: "text" },
            { key: "due_date", label: "Due date", type: "date" },
            {
              key: "status",
              label: "Status",
              type: "select",
              options: ["open", "in_progress", "done"],
            },
          ]}
        />
      )}

      {tab === "Evidence" && (
        <FileTable table="evidence" projectId={projectId} bucket="evidence" />
      )}

      {tab === "Artifacts" && (
        <FileTable
          table="artifacts"
          projectId={projectId}
          bucket="artifacts"
          typeOptions={["presentation", "document", "spreadsheet", "other"]}
        />
      )}
    </div>
  );
}
