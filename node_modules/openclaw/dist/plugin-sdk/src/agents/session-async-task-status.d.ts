import type { TaskRecord, TaskRuntime, TaskStatus } from "../tasks/task-registry.types.js";
export declare function findActiveSessionTask(params: {
    sessionKey?: string;
    runtime?: TaskRuntime;
    taskKind?: string;
    statuses?: ReadonlySet<TaskStatus>;
    sourceIdPrefix?: string;
}): TaskRecord | null;
export declare function buildSessionAsyncTaskStatusDetails(task: TaskRecord): Record<string, unknown>;
