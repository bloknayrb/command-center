"use client";

import { useTasks } from "@/hooks/useTasks";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { isTaskOverdue } from "@/lib/utils/tasks";

/**
 * Jeremy Priorities panel — shows auto-detected and manually tagged
 * urgent items that need immediate attention.
 */
export function JeremyPriorities() {
  const { data: priorityData, isLoading: l1, error: e1 } = useTasks({
    status: ["open", "in-progress"],
    priority: ["critical", "high"],
  });
  const { data: overdueData, isLoading: l2, error: e2 } = useTasks({ overdue: true });
  const isLoading = l1 || l2;
  const error = e1 || e2;

  const priorityTasks = priorityData?.tasks ?? [];
  const overdueTasks = overdueData?.tasks ?? [];

  // Deduplicate (overdue tasks may already be in priority list)
  const seen = new Set<string>();
  const allPriority = [
    ...priorityTasks,
    ...overdueTasks,
  ].filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  if (error) {
    return <ErrorBanner message={`Failed to load priorities: ${error.message}`} />;
  }

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
            const overdue = isTaskOverdue(task);

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
                      <span className={overdue ? "font-semibold text-red-600" : ""}>
                        Due: {task.due}
                        {overdue && " (overdue)"}
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
