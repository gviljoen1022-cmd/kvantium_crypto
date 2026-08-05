"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Column = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
};

export default function SimpleTable({
  table,
  projectId,
  columns,
  emptyLabel,
}: {
  table: string;
  projectId: string;
  columns: Column[];
  emptyLabel: string;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from(table)
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, projectId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    const payload: Record<string, any> = { project_id: projectId };
    for (const col of columns) {
      if (form[col.key] !== undefined && form[col.key] !== "") {
        payload[col.key] =
          col.type === "number" ? Number(form[col.key]) : form[col.key];
      }
    }
    await supabase.from(table).insert(payload);
    setForm({});
    setAdding(false);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from(table).delete().eq("id", id);
    load();
  }

  return (
    <div>
      <form
        onSubmit={handleAdd}
        className="flex flex-wrap gap-2 items-end mb-5 bg-white border border-neutral-200 rounded-lg p-4"
      >
        {columns.map((col) => (
          <div key={col.key} className="flex flex-col">
            <label className="text-xs text-neutral-500 mb-1">
              {col.label}
            </label>
            {col.type === "select" ? (
              <select
                value={form[col.key] ?? ""}
                onChange={(e) =>
                  setForm({ ...form, [col.key]: e.target.value })
                }
                className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm"
              >
                <option value="">—</option>
                {col.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={col.type}
                value={form[col.key] ?? ""}
                onChange={(e) =>
                  setForm({ ...form, [col.key]: e.target.value })
                }
                className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm w-40"
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          disabled={adding}
          className="rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-1.5 hover:bg-neutral-800 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-neutral-500">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                {columns.map((col) => (
                  <th key={col.key} className="px-3 py-2 font-medium">
                    {col.label}
                  </th>
                ))}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100 last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 text-neutral-800">
                      {row[col.key] ?? ""}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="text-neutral-400 hover:text-red-600 text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
