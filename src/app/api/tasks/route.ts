/**
 * Task CRUD API route.
 *
 * GET  /api/tasks?status=open&client=DRPA&overdue=true
 * POST /api/tasks — create new task
 * PATCH /api/tasks — update existing task
 */

import { NextRequest, NextResponse } from "next/server";
import { listTasks, createTask, updateTask, filterTasks, sortTasks } from "@/lib/obsidian/tasks";
import { parseTaskFiltersFromParams, buildCreateTaskPayload } from "@/lib/obsidian/task-filters";
import { toUserError } from "@/lib/safety/user-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tasks — List and filter tasks
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const allTasks = await listTasks();
    const filters = parseTaskFiltersFromParams(searchParams);
    const filtered = filterTasks(allTasks, filters);

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

    const payload = buildCreateTaskPayload({
      title, status, priority, due, client, project_code, source, body: taskBody,
    });
    const result = await createTask(payload);

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
