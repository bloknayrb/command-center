/**
 * Project types — used for project views and dashboards.
 */

export interface Project {
  /** Project code (e.g., "DRPA", "VDOT") */
  code: string;
  /** Display name */
  name: string;
  /** Client name */
  client: string;
  /** Project status */
  status: "active" | "on-hold" | "completed";
  /** Number of open tasks */
  openTasks: number;
  /** Number of completed tasks */
  completedTasks: number;
}
