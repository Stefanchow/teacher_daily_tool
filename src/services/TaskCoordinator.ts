export type TaskStatus = "pending" | "running" | "completed" | "cancelled" | "failed";

export interface TaskResult<T = any> {
  id: string;
  status: TaskStatus;
  result?: T;
  error?: unknown;
}

type TaskFn<T> = (signal: AbortSignal) => Promise<T>;

interface TaskRecord<T> {
  id: string;
  fn: TaskFn<T>;
  controller: AbortController;
  status: TaskStatus;
  result?: T;
  error?: unknown;
}

export class TaskCoordinator<T = any> {
  private tasks: TaskRecord<T>[] = [];
  private concurrency: number;

  constructor(concurrency: number = 3) {
    this.concurrency = Math.max(1, concurrency);
  }

  add(fn: TaskFn<T>): string {
    const id = Math.random().toString(36).slice(2);
    this.tasks.push({ id, fn, controller: new AbortController(), status: "pending" });
    return id;
  }

  async start(): Promise<void> {
    let index = 0;
    const workers = Array.from({ length: this.concurrency }, async () => {
      while (index < this.tasks.length) {
        const current = this.tasks[index++];
        if (!current || current.status !== "pending") continue;
        current.status = "running";
        try {
          const res = await current.fn(current.controller.signal);
          current.result = res;
          current.status = "completed";
        } catch (e) {
          current.error = e;
          current.status = "failed";
        }
      }
    });
    await Promise.all(workers);
  }

  abort(id: string): void {
    const t = this.tasks.find(x => x.id === id);
    if (!t) return;
    if (t.status === "running" || t.status === "pending") {
      t.controller.abort();
      t.status = "cancelled";
    }
  }

  abortAll(): void {
    for (const t of this.tasks) {
      if (t.status === "running" || t.status === "pending") {
        t.controller.abort();
        t.status = "cancelled";
      }
    }
  }

  getResults(): TaskResult<T>[] {
    return this.tasks.map(t => ({ id: t.id, status: t.status, result: t.result, error: t.error }));
  }

  getStatus(id: string): TaskStatus | undefined {
    const t = this.tasks.find(x => x.id === id);
    return t?.status;
  }
}
