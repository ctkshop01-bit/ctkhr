import type { TaskReviewLogItem } from "@/types/domain";

export function buildLatestReviewByTaskId(logs: TaskReviewLogItem[]) {
  return logs
    .filter(log => log.action === "confirm" || log.action === "return")
    .reduce((map, log) => {
      const current = map.get(log.taskId);
      if (!current || current.createdAtISO < log.createdAtISO) {
        map.set(log.taskId, log);
      }
      return map;
    }, new Map<string, TaskReviewLogItem>());
}
