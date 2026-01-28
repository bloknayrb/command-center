"use client";

import { useTasks } from "@/hooks/useTasks";
import { Skeleton } from "@/components/ui/Skeleton";

interface StatCard {
  label: string;
  value: number | string;
  color: string;
}

export function StatusCards() {
  const { data, isLoading } = useTasks({
    status: ["open", "in-progress", "waiting", "done"],
  });

  const tasks = data?.tasks ?? [];
  const openCount = tasks.filter(
    (t) => t.status === "open" || t.status === "in-progress"
  ).length;
  const overdueCount = tasks.filter(
    (t) =>
      t.due &&
      t.status !== "done" &&
      t.due < new Date().toISOString().split("T")[0]
  ).length;
  const waitingCount = tasks.filter((t) => t.status === "waiting").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  const cards: StatCard[] = [
    {
      label: "Open Tasks",
      value: isLoading ? "—" : openCount,
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      label: "Overdue",
      value: isLoading ? "—" : overdueCount,
      color: "text-red-600 bg-red-50 border-red-200",
    },
    {
      label: "Waiting",
      value: isLoading ? "—" : waitingCount,
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      label: "Done This Week",
      value: isLoading ? "—" : doneCount,
      color: "text-green-600 bg-green-50 border-green-200",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
            <Skeleton className="mb-2 h-8 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg border p-4 ${card.color}`}
        >
          <div className="text-2xl font-bold">{card.value}</div>
          <div className="text-sm opacity-75">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
