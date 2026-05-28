import { z } from "zod";

export const Status = z.enum(["active", "completed", "archived"]);
export type Status = z.infer<typeof Status>;

export const TaskStatus = z.enum(["todo", "doing", "done"]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const Priority = z.enum(["low", "med", "high"]);
export type Priority = z.infer<typeof Priority>;

export const Frequency = z.enum(["daily", "weekly", "monthly"]);
export type Frequency = z.infer<typeof Frequency>;

export const RecurrenceRuleSchema = z.object({
  freq: Frequency,
  interval: z.number().int().positive().default(1),
  weekdays: z.array(z.number().int().min(0).max(6)).nullable().default(null),
  end_date: z.coerce.date().nullable().default(null),
});
export type RecurrenceRule = z.infer<typeof RecurrenceRuleSchema>;

export const GoalSchema = z.object({
  _id: z.string(),
  title: z.string().min(1),
  description: z.string().nullable().default(null),
  target_date: z.coerce.date().nullable().default(null),
  status: Status.default("active"),
  source: z.string().nullable().default(null),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type Goal = z.infer<typeof GoalSchema>;

export const GoalInputSchema = GoalSchema.omit({
  _id: true,
  created_at: true,
  updated_at: true,
}).extend({
  title: z.string().min(1).max(200),
});
export type GoalInput = z.infer<typeof GoalInputSchema>;

export const GoalPatchSchema = GoalInputSchema.partial();
export type GoalPatch = z.infer<typeof GoalPatchSchema>;

export const TaskSchema = z.object({
  _id: z.string(),
  goal_id: z.string(),
  parent_task_id: z.string().nullable().default(null),
  title: z.string().min(1),
  description: z.string().nullable().default(null),
  weight: z.number().int().min(0).max(100).default(0),
  status: TaskStatus.default("todo"),
  priority: Priority.default("med"),
  recurrence: RecurrenceRuleSchema.nullable().default(null),
  due_date: z.coerce.date().nullable().default(null),
  completed_at: z.coerce.date().nullable().default(null),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type Task = z.infer<typeof TaskSchema>;

export const TaskInputSchema = TaskSchema.omit({
  _id: true,
  completed_at: true,
  created_at: true,
  updated_at: true,
}).extend({
  title: z.string().min(1).max(200),
});
export type TaskInput = z.infer<typeof TaskInputSchema>;

export const TaskPatchSchema = TaskInputSchema.partial().extend({
  status: TaskStatus.optional(),
});
export type TaskPatch = z.infer<typeof TaskPatchSchema>;

export const TaskInstanceSchema = z.object({
  _id: z.string(),
  task_id: z.string(),
  occurrence_date: z.coerce.date(),
  completed_at: z.coerce.date().nullable().default(null),
});
export type TaskInstance = z.infer<typeof TaskInstanceSchema>;

export type GoalSummary = Goal & {
  progress_pct: number;
  planned_pct: number;
  recent_progress: { date: Date; pct: number }[];
};
