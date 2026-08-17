"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Artifact, ArtifactType } from "@/lib/types";
import { ARTIFACT_TYPES } from "@/lib/types";

// Artifacts are never deleted, only superseded by uploading a new version —
// there is deliberately no remove button here.
export default function ArtifactsTab({
  engagementId,
  locked,
}: {
  engagementId: string;
  locked: boolean;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<Artifact[] | null>(null);
  const [artifactType, setArtifactType] = useState<ArtifactType>("Other");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("artifacts")
      .select("*")
      .eq("engagement_id", engagementId)
      .order("uploaded_at", { ascending: false });
    setRows((data ?? []) as Artifact[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount/id change
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);

    const path = `${engagementId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("artifacts")
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("artifacts").insert({
      engagement_id: engagementId,
      file_name: file.name,
      file_path: path,
      artifact_type: artifactType,
      uploaded_by: user?.email ?? null,
    });

    setUploading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setFile(null);
    load();
  }

  async function handleOpen(path: string) {
    const { data } = await supabase.storage.from("artifacts").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <div>
      {!locked && (
        <form
          onSubmit={handleUpload}
          className="flex flex-wrap gap-2 items-end mb-5 bg-white border border-neutral-200 rounded-lg p-4"
        >
          <div className="flex flex-col">
            <label className="text-xs text-neutral-500 mb-1">Type</label>
            <select
              value={artifactType}
              onChange={(e) => setArtifactType(e.target.value as ArtifactType)}
              className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm"
            >
              {ARTIFACT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
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
            disabled={uploading || !file}
            className="rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-1.5 hover:bg-neutral-800 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
          {error && <p className="text-sm text-red-600 w-full">{error}</p>}
        </form>
      )}

      {rows === null ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing uploaded yet.</p>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white divide-y divide-neutral-100">
          {rows.map((row) => (
            <button
              key={row.id}
              onClick={() => handleOpen(row.file_path)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-neutral-50"
            >
              <span className="text-neutral-800">{row.file_name}</span>
              <span className="text-neutral-400 text-xs shrink-0 ml-3">
                {row.artifact_type}
                {row.uploaded_by ? ` · ${row.uploaded_by}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
