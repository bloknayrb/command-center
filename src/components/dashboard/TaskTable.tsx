"use client";

import { useState, useMemo } from "react";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import type { TaskNote, TaskStatus, TaskPriority } from "@/types/task";

type SortField = "title" | "priority" | "due" | "client" | "status";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  "in-progress": "bg-indigo-100 text-indigo-700",
  waiting: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-red-600 font-bold",
  high: "text-orange-600 font-semibold",
  medium: "text-gray-700",
  low: "text-gray-400",
};

export function TaskTable() {
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>(["open", "in-progress", "waiting"]);
  const [clientFilter, setClientFilter] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data, isLoading, error } = useTasks({
    status: statusFilter.length > 0 ? statusFilter : undefined,
    client: clientFilter || undefined,
  });
  const updateTask = useUpdateTask();

  const sortedTasks = useMemo(() => {
    if (!data?.tasks) return [];
    const tasks = [...data.tasks];

    tasks.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "priority":
          cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
          break;
        case "due":
          cmp = (a.due ?? "9999").localeCompare(b.due ?? "9999");
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "client":
          cmp = (a.client ?? "").localeCompare(b.client ?? "");
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return tasks;
  }, [data?.tasks, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function handleStatusToggle(status: TaskStatus) {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  }

  function handleMarkDone(taskId: string) {
    updateTask.mutate({ taskId, status: "done", completed: new Date().toISOString().split("T")[0] });
  }

  const sortArrow = (field: SortField) =>
    sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load tasks: {error.message}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
        <span className="text-xs font-medium text-gray-500">Status:</span>
        {(["open", "in-progress", "waiting", "done"] as TaskStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => handleStatusToggle(s)}
            className={`rounded-full px-2.5 py-0.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${
              statusFilter.includes(s)
                ? STATUS_COLORS[s]
                : "bg-gray-50 text-gray-400"
            }`}
          >
            {s}
          </button>
        ))}
        <span className="ml-4 text-xs font-medium text-gray-500">Client:</span>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="rounded border border-gray-200 px-2 py-0.5 text-xs"
        >
          <option value="">All</option>
          <option value="DRPA">DRPA</option>
          <option value="VDOT">VDOT</option>
          <option value="MDTA">MDTA</option>
          <option value="DelDOT">DelDOT</option>
        </select>
        {isLoading && (
          <span className="ml-auto text-xs text-gray-400">Loading...</span>
        )}
        {data && (
          <span className="ml-auto text-xs text-gray-400">
            {data.total} tasks
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-gray-100 bg-white text-xs text-gray-500">
              <th scope="col" aria-sort={sortField === "title" ? (sortDir === "asc" ? "ascending" : "descending") : "none"} className="cursor-pointer px-4 py-2 font-medium hover:text-gray-900" onClick={() => handleSort("title")}>
                Title{sortArrow("title")}
              </th>
              <th scope="col" aria-sort={sortField === "priority" ? (sortDir === "asc" ? "ascending" : "descending") : "none"} className="cursor-pointer px-4 py-2 font-medium hover:text-gray-900" onClick={() => handleSort("priority")}>
                Priority{sortArrow("priority")}
              </th>
              <th scope="col" aria-sort={sortField === "due" ? (sortDir === "asc" ? "ascending" : "descending") : "none"} className="cursor-pointer px-4 py-2 font-medium hover:text-gray-900" onClick={() => handleSort("due")}>
                Due{sortArrow("due")}
              </th>
              <th scope="col" aria-sort={sortField === "client" ? (sortDir === "asc" ? "ascending" : "descending") : "none"} className="cursor-pointer px-4 py-2 font-medium hover:text-gray-900" onClick={() => handleSort("client")}>
                Client{sortArrow("client")}
              </th>
              <th scope="col" aria-sort={sortField === "status" ? (sortDir === "asc" ? "ascending" : "descending") : "none"} className="cursor-pointer px-4 py-2 font-medium hover:text-gray-900" onClick={() => handleSort("status")}>
                Status{sortArrow("status")}
              </th>
              <th scope="col" className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onMarkDone={handleMarkDone}
              />
            ))}
            {sortedTasks.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No tasks matching filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onMarkDone,
}: {
  task: TaskNote;
  onMarkDone: (id: string) => void;
}) {
  const isOverdue =
    task.due &&
    task.status !== "done" &&
    task.due < new Date().toISOString().split("T")[0];

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50">
      <td className="px-4 py-2.5">
        <span className="font-medium text-gray-900">{task.title}</span>
        {task.project_code && (
          <span className="ml-2 text-xs text-gray-400">#{task.project_code}</span>
        )}
      </td>
      <td className={`px-4 py-2.5 text-xs ${PRIORITY_COLORS[task.priority] ?? ""}`}>
        {task.priority}
      </td>
      <td className={`px-4 py-2.5 text-xs ${isOverdue ? "font-semibold text-red-600" : "text-gray-600"}`}>
        {task.due ?? "—"}
        {isOverdue && " ⚠"}
      </td>
      <td className="px-4 py-2.5 text-xs text-gray-600">
        {task.client ?? "—"}
      </td>
      <td className="px-4 py-2.5">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[task.status] ?? ""}`}>
          {task.status}
        </span>
      </td>
      <td className="px-4 py-2.5">
        {task.status !== "done" && (
          <button
            onClick={() => onMarkDone(task.id)}
            className="text-xs text-green-600 hover:text-green-800"
            title="Mark as done"
          >
            ✓ Done
          </button>
        )}
      </td>
    </tr>
  );
}
