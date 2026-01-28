"use client";

import { TaskTable } from "@/components/dashboard/TaskTable";
import { useCreateTask } from "@/hooks/useTasks";
import { useState } from "react";

export default function TasksPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        >
          {showForm ? "Cancel" : "+ New Task"}
        </button>
      </div>

      {showForm && <QuickCreateForm onDone={() => setShowForm(false)} />}

      <TaskTable />
    </div>
  );
}

function QuickCreateForm({ onDone }: { onDone: () => void }) {
  const createTask = useCreateTask();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [client, setClient] = useState("");
  const [due, setDue] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        priority: priority as "critical" | "high" | "medium" | "low",
        client: client || undefined,
        due: due || undefined,
      });
      onDone();
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 bg-white p-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Client
          </label>
          <select
            value={client}
            onChange={(e) => setClient(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <option value="">None</option>
            <option value="DRPA">DRPA</option>
            <option value="VDOT">VDOT</option>
            <option value="MDTA">MDTA</option>
            <option value="DelDOT">DelDOT</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Due Date
          </label>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={!title.trim() || createTask.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
          >
            {createTask.isPending ? "Creating..." : "Create Task"}
          </button>
        </div>
      </div>
      {createTask.error && (
        <p className="mt-2 text-sm text-red-600">
          {createTask.error.message}
        </p>
      )}
    </form>
  );
}
