"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface WeeklyReportData {
  markdown: string;
  dateRange: { start: string; end: string };
  taskCount: number;
  clients: string[];
  type: string;
}

export function PIPEvidence() {
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery<WeeklyReportData>({
    queryKey: ["pip", "weekly"],
    queryFn: async () => {
      const res = await fetch("/api/pip");
      if (!res.ok) throw new Error(`PIP report failed: ${res.status}`);
      return res.json();
    },
    staleTime: 300_000, // 5 min
  });

  async function handleCopy() {
    if (!data?.markdown) return;
    try {
      await navigator.clipboard.writeText(data.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Deprecated fallback for non-HTTPS contexts
      const ta = document.createElement("textarea");
      ta.value = data.markdown;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to generate PIP report: {error.message}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Weekly Status Report
        </h2>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-xs text-gray-400">
              {data.taskCount} tasks · {data.clients.length} clients
            </span>
          )}
          <button
            onClick={handleCopy}
            disabled={!data?.markdown || isLoading}
            className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {copied ? "Copied!" : "Copy Report"}
          </button>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-400">Generating report...</p>
      )}

      {data && (
        <div className="rounded-md bg-gray-50 p-4">
          {data.dateRange && (
            <div className="mb-2 text-xs text-gray-500">
              {data.dateRange.start} — {data.dateRange.end}
            </div>
          )}
          <pre className="whitespace-pre-wrap text-sm text-gray-700">
            {data.markdown}
          </pre>
        </div>
      )}

      {data && data.taskCount === 0 && (
        <p className="mt-2 text-sm text-gray-400">
          No completed tasks this week yet. Complete tasks to build evidence.
        </p>
      )}
    </div>
  );
}
