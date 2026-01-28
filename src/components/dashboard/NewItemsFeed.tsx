"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";

interface ScanResult {
  total: number;
  scanDuration: number;
  categories: {
    emails: number;
    teams: number;
    meetings: number;
    tasks: number;
    other: number;
  };
  files: Array<{
    path: string;
    name: string;
    mtime: string;
  }>;
}

function getLastSessionTime(): string {
  // Default: items from the last 24 hours
  const d = new Date();
  d.setHours(d.getHours() - 24);
  return d.toISOString();
}

export function NewItemsFeed() {
  const since = useMemo(() => getLastSessionTime(), []);

  const { data, isLoading, error } = useQuery<ScanResult>({
    queryKey: ["scan", since],
    queryFn: async () => {
      const res = await fetch(`/api/scan?since=${encodeURIComponent(since)}`);
      if (!res.ok) throw new Error(`Scan failed: ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to scan vault: {error.message}
      </div>
    );
  }

  return (
    <Card
      title="New Items"
      meta={data ? `${data.total} new · ${data.scanDuration}ms` : isLoading ? "Scanning..." : undefined}
      loading={isLoading && !data}
    >
      {data && (
        <>
          {/* Category summary */}
          <div className="mb-4 flex flex-wrap gap-2">
            {data.categories.emails > 0 && (
              <CategoryBadge label="Emails" count={data.categories.emails} color="bg-blue-100 text-blue-700" />
            )}
            {data.categories.teams > 0 && (
              <CategoryBadge label="Teams" count={data.categories.teams} color="bg-purple-100 text-purple-700" />
            )}
            {data.categories.meetings > 0 && (
              <CategoryBadge label="Meetings" count={data.categories.meetings} color="bg-green-100 text-green-700" />
            )}
            {data.categories.tasks > 0 && (
              <CategoryBadge label="Tasks" count={data.categories.tasks} color="bg-amber-100 text-amber-700" />
            )}
            {data.categories.other > 0 && (
              <CategoryBadge label="Other" count={data.categories.other} color="bg-gray-100 text-gray-600" />
            )}
          </div>

          {/* Recent files list */}
          <ul className="space-y-1.5">
            {data.files.slice(0, 15).map((file) => (
              <li
                key={file.path}
                className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-50"
              >
                <span className="truncate text-gray-700" title={file.path}>
                  {file.name.replace(/\.md$/, "")}
                </span>
                <span className="ml-2 flex-shrink-0 text-xs text-gray-400">
                  {formatRelativeTime(file.mtime)}
                </span>
              </li>
            ))}
          </ul>

          {data.total === 0 && (
            <p className="text-center text-sm text-gray-400">
              No new items since last session
            </p>
          )}
        </>
      )}

      {!data && !isLoading && (
        <p className="text-center text-sm text-gray-400">
          Vault not configured
        </p>
      )}
    </Card>
  );
}

function CategoryBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}: {count}
    </span>
  );
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = now - then;

  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}
