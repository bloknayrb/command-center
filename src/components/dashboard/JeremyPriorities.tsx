"use client";

import { useTasks } from "@/hooks/useTasks";
import { Card } from "@/components/ui/Card";

/**
 * Jeremy Priorities panel — shows auto-detected and manually tagged
 * urgent items that need immediate attention.
 */
export function JeremyPriorities() {
  const { data: criticalData, isLoading: l1 } = useTasks({
    status: ["open", "in-progress"],
    priority: ["critical"],
  });
  const { data: highData, isLoading: l2 } = useTasks({
    status: ["open", "in-progress"],
    priority: ["high"],
  });
  const { data: overdueData, isLoading: l3 } = useTasks({ overdue: true });
  const isLoading = l1 || l2 || l3;

  const criticalTasks = criticalData?.tasks ?? [];
  const highTasks = highData?.tasks ?? [];
  const overdueTasks = overdueData?.tasks ?? [];

  // Deduplicate (some tasks appear in multiple queries)
  const seen = new Set<string>();
  const allPriority = [
    ...criticalTasks,
    ...overdueTasks,
    ...highTasks,
  ].filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  return (
    <Card
      title="Priorities"
      meta={`${allPriority.length} items`}
      loading={isLoading && allPriority.length === 0}
    >
      {allPriority.length === 0 && !isLoading ? (
        <p className="text-center text-sm text-gray-400 py-4">
          No urgent items right now
        </p>
      ) : (
        <ul className="space-y-2">
          {allPriority.slice(0, 10).map((task) => {
            const isOverdue =
              task.due &&
              task.status !== "done" &&
              task.due < new Date().toISOString().split("T")[0];

            return (
              <li
                key={task.id}
                className="flex items-start gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
              >
                <PriorityDot priority={task.priority} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900">
                    {task.title}
                  </div>
                  <div className="flex gap-2 text-xs text-gray-500">
                    {task.client && <span>{task.client}</span>}
                    {task.due && (
                      <span className={isOverdue ? "font-semibold text-red-600" : ""}>
                        Due: {task.due}
                        {isOverdue && " (overdue)"}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-gray-300",
  };

  return (
    <span
      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${colors[priority] ?? "bg-gray-300"}`}
    />
  );
}
