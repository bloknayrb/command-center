"use client";

import dynamic from "next/dynamic";
import { StatusCards } from "@/components/dashboard/StatusCards";
import { NewItemsFeed } from "@/components/dashboard/NewItemsFeed";
import { JeremyPriorities } from "@/components/dashboard/JeremyPriorities";
import { TaskTable } from "@/components/dashboard/TaskTable";

const PIPEvidence =
  process.env.NEXT_PUBLIC_ENABLE_PIP === "true"
    ? dynamic(() =>
        import("@/components/dashboard/PIPEvidence").then((m) => m.PIPEvidence)
      )
    : null;

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Summary cards */}
      <StatusCards />

      {/* 3-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Column 1: New Items */}
        <NewItemsFeed />

        {/* Column 2: Priorities */}
        <JeremyPriorities />

        {/* Column 3: PIP evidence (when enabled) */}
        {PIPEvidence ? <PIPEvidence /> : <div />}
      </div>

      {/* Full-width task table */}
      <TaskTable />
    </div>
  );
}
