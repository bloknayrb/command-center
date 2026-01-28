/**
 * Task CRUD API route.
 *
 * GET  /api/tasks?status=open&client=DRPA&overdue=true
 * POST /api/tasks — create new task
 * PATCH /api/tasks — update existing task
 */

import { NextRequest, NextResponse } from "next/server";
import { listTasks, createTask, updateTask, filterTasks, sortTasks } from "@/lib/obsidian/tasks";
import { toUserError } from "@/lib/safety/user-errors";
import type { TaskStatus, TaskPriority } from "@/types/task";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tasks — List and filter tasks
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const allTasks = await listTasks();

    // Apply filters from query params
    const statusParam = searchParams.get("status");
    const priorityParam = searchParams.get("priority");
    const client = searchParams.get("client");
    const overdue = searchParams.get("overdue") === "true";

    const filtered = filterTasks(allTasks, {
      status: statusParam
        ? (statusParam.split(",") as TaskStatus[])
        : undefined,
      priority: priorityParam
        ? (priorityParam.split(",") as TaskPriority[])
        : undefined,
      client: client ?? undefined,
      overdue: overdue || undefined,
    });

    const sorted = sortTasks(filtered);

    return NextResponse.json({
      tasks: sorted,
      total: sorted.length,
      scanned: allTasks.length,
    });
  } catch (err) {
    const userErr = toUserError(err);
    return NextResponse.json(
      { error: userErr.message, recovery: userErr.recovery },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks — Create a new task
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, status, priority, due, client, project_code, source, body: taskBody } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    const result = await createTask({
      title,
      status: status ?? "open",
      priority: priority ?? "medium",
      due,
      client,
      project_code,
      source,
      created: new Date().toISOString().split("T")[0],
      body: taskBody ?? "",
      tags: [],
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, taskId: result.taskId },
      { status: 201 }
    );
  } catch (err) {
    const userErr = toUserError(err);
    return NextResponse.json(
      { error: userErr.message, recovery: userErr.recovery },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks — Update an existing task
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, ...updates } = body;

    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      );
    }

    const result = await updateTask(taskId, updates);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const userErr = toUserError(err);
    return NextResponse.json(
      { error: userErr.message, recovery: userErr.recovery },
      { status: 500 }
    );
  }
}
