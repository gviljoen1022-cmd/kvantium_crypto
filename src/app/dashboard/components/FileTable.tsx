"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function FileTable({
  table,
  projectId,
  bucket,
  typeOptions,
}: {
  table: string;
  projectId: string;
  bucket: string;
  typeOptions?: string[];
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [type, setType] = useState(typeOptions?.[0] ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) return;
    setUploading(true);

    const path = `${projectId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file);

    if (!uploadError) {
      await supabase.from(table).insert({
        project_id: projectId,
        title,
        type: type || null,
        file_path: path,
      });
      setTitle("");
      setFile(null);
      load();
    }
    setUploading(false);
  }

  async function handleOpen(path: string) {
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function handleDelete(id: string, path: string) {
    await supabase.storage.from(bucket).remove([path]);
    await supabase.from(table).delete().eq("id", id);
    load();
  }

  return (
    <div>
      <form
        onSubmit={handleUpload}
        className="flex flex-wrap gap-2 items-end mb-5 bg-white border border-neutral-200 rounded-lg p-4"
      >
        <div className="flex flex-col">
          <label className="text-xs text-neutral-500 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm w-48"
          />
        </div>
        {typeOptions && (
          <div className="flex flex-col">
            <label className="text-xs text-neutral-500 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm"
            >
              {typeOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col">
          <label className="text-xs text-neutral-500 mb-1">File</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={uploading || !file || !title}
          className="rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-1.5 hover:bg-neutral-800 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing uploaded yet.</p>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white divide-y divide-neutral-100">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between px-4 py-2.5 text-sm"
            >
              <button
                onClick={() => handleOpen(row.file_path)}
                className="text-neutral-800 hover:underline text-left"
              >
                {row.title}{" "}
                {row.type && (
                  <span className="text-neutral-400">— {row.type}</span>
                )}
              </button>
              <button
                onClick={() => handleDelete(row.id, row.file_path)}
                className="text-neutral-400 hover:text-red-600 text-xs"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
