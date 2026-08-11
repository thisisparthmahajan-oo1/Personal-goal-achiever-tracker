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

export const ProfileKind = z.enum(["personal", "office"]);
export type ProfileKind = z.infer<typeof ProfileKind>;

export const ProfileSchema = z.object({
  _id: z.string(),
  slug: z.string().min(1),
  name: z.string().min(1),
  kind: ProfileKind,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const GoalSchema = z.object({
  _id: z.string(),
  profile_id: z.string(),
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
  profile_id: true,
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
  profile_id: z.string(),
  goal_id: z.string().nullable().default(null),
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
  profile_id: true,
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

export const WeightUnit = z.enum(["kg", "lb"]);
export type WeightUnit = z.infer<typeof WeightUnit>;

export const ExerciseWeightSchema = z.object({
  _id: z.string(),
  profile_id: z.string(),
  exercise_key: z.string(),
  weight: z.number().nonnegative().nullable().default(null),
  unit: WeightUnit.default("kg"),
  updated_at: z.coerce.date(),
});
export type ExerciseWeight = z.infer<typeof ExerciseWeightSchema>;

export const BookType = z.enum(["fiction", "non-fiction"]);
export type BookType = z.infer<typeof BookType>;

export const BookStatus = z.enum(["pipelined", "in-progress", "completed"]);
export type BookStatus = z.infer<typeof BookStatus>;

export const BookEntrySchema = z.object({
  _id: z.string(),
  profile_id: z.string(),
  title: z.string().min(1),
  type: BookType,
  domains: z.array(z.string()).default([]),
  status: BookStatus.default("pipelined"),
  start_date: z.coerce.date().nullable().default(null),
  end_date: z.coerce.date().nullable().default(null),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type BookEntry = z.infer<typeof BookEntrySchema>;

export const BookEntryInputSchema = BookEntrySchema.omit({
  _id: true,
  profile_id: true,
  created_at: true,
  updated_at: true,
}).extend({
  title: z.string().min(1).max(300),
});
export type BookEntryInput = z.infer<typeof BookEntryInputSchema>;

export const BookEntryPatchSchema = BookEntryInputSchema.partial();
export type BookEntryPatch = z.infer<typeof BookEntryPatchSchema>;

export const TodoSchema = z.object({
  _id: z.string(),
  profile_id: z.string(),
  title: z.string().min(1),
  notes: z.string().nullable().default(null),
  source_meeting_id: z.string().nullable().default(null),
  source_goal_id: z.string().nullable().default(null),
  sort_order: z.number().default(0),
  status: TaskStatus.default("todo"),
  completed_at: z.coerce.date().nullable().default(null),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type Todo = z.infer<typeof TodoSchema>;

export const TodoInputSchema = TodoSchema.omit({
  _id: true,
  profile_id: true,
  notes: true,
  source_meeting_id: true,
  source_goal_id: true,
  sort_order: true,
  status: true,
  completed_at: true,
  created_at: true,
  updated_at: true,
}).extend({
  title: z.string().min(1).max(300),
});
export type TodoInput = z.infer<typeof TodoInputSchema>;

export const TodoPatchSchema = TodoInputSchema.partial();
export type TodoPatch = z.infer<typeof TodoPatchSchema>;

// ---------- Trips ----------

export const TripSchema = z.object({
  _id: z.string(),
  profile_id: z.string(),
  title: z.string().min(1),
  destination: z.string().nullable().default(null),
  start_date: z.coerce.date().nullable().default(null),
  end_date: z.coerce.date().nullable().default(null),
  travelers: z.array(z.string()).default([]),
  cover_emoji: z.string().nullable().default(null),
  notes: z.string().default(""),
  currency: z.string().default("INR"),
  archived: z.boolean().default(false),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type Trip = z.infer<typeof TripSchema>;

export const TripInputSchema = z.object({
  title: z.string().min(1).max(200),
  destination: z.string().nullable().optional(),
  start_date: z.coerce.date().nullable().optional(),
  end_date: z.coerce.date().nullable().optional(),
  travelers: z.array(z.string()).optional(),
  cover_emoji: z.string().nullable().optional(),
  currency: z.string().optional(),
});
export type TripInput = z.infer<typeof TripInputSchema>;

export const TripPatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  destination: z.string().nullable().optional(),
  start_date: z.coerce.date().nullable().optional(),
  end_date: z.coerce.date().nullable().optional(),
  travelers: z.array(z.string()).optional(),
  cover_emoji: z.string().nullable().optional(),
  notes: z.string().optional(),
  currency: z.string().optional(),
  archived: z.boolean().optional(),
});
export type TripPatch = z.infer<typeof TripPatchSchema>;

// Trip — sections (2-level: top-level section, optional one level of subsections)
export const TripSectionItemStatus = z.enum([
  "yet_to_start",
  "in_review",
  "completed",
]);
export type TripSectionItemStatus = z.infer<typeof TripSectionItemStatus>;

export const TripSectionContentType = z.enum(["tasks", "spots"]);
export type TripSectionContentType = z.infer<typeof TripSectionContentType>;

export const TripSectionSchema = z.object({
  _id: z.string(),
  profile_id: z.string(),
  trip_id: z.string(),
  parent_id: z.string().nullable().default(null),
  name: z.string().min(1),
  content_type: TripSectionContentType.default("tasks"),
  sort_order: z.number().default(0),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type TripSection = z.infer<typeof TripSectionSchema>;

export const TripSectionInputSchema = z.object({
  name: z.string().min(1).max(200),
  parent_id: z.string().nullable().optional(),
  content_type: TripSectionContentType.optional(),
});
export type TripSectionInput = z.infer<typeof TripSectionInputSchema>;

export const TripSectionPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});
export type TripSectionPatch = z.infer<typeof TripSectionPatchSchema>;

export const TripSectionItemSchema = z.object({
  _id: z.string(),
  profile_id: z.string(),
  trip_id: z.string(),
  section_id: z.string(),
  name: z.string().min(1),
  status: TripSectionItemStatus.default("yet_to_start"),
  due_date: z.coerce.date().nullable().default(null),
  notes: z.string().nullable().default(null),
  sort_order: z.number().default(0),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type TripSectionItem = z.infer<typeof TripSectionItemSchema>;

export const TripSectionItemInputSchema = z.object({
  name: z.string().min(1).max(300),
});
export type TripSectionItemInput = z.infer<typeof TripSectionItemInputSchema>;

export const TripSectionItemPatchSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  status: TripSectionItemStatus.optional(),
  due_date: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type TripSectionItemPatch = z.infer<typeof TripSectionItemPatchSchema>;

// Trip — spots (the "spots" content template: food/beach-club recommendations)
export const SpotCategory = z.enum([
  "restaurant",
  "cafe",
  "beach_club",
  "bar",
  "street_food",
  "other",
]);
export type SpotCategory = z.infer<typeof SpotCategory>;

export const SpotPriority = z.enum(["must_try", "optional"]);
export type SpotPriority = z.infer<typeof SpotPriority>;

export const MealTag = z.enum(["breakfast", "lunch", "dinner"]);
export type MealTag = z.infer<typeof MealTag>;

export const TripSpotSchema = z.object({
  _id: z.string(),
  profile_id: z.string(),
  trip_id: z.string(),
  section_id: z.string(),
  name: z.string().min(1),
  category: SpotCategory.default("other"),
  priority: SpotPriority.default("optional"),
  meal_tags: z.array(MealTag).default([]),
  dishes: z.string().nullable().default(null),
  link: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  sort_order: z.number().default(0),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type TripSpot = z.infer<typeof TripSpotSchema>;

export const TripSpotInputSchema = z.object({
  name: z.string().min(1).max(200),
});
export type TripSpotInput = z.infer<typeof TripSpotInputSchema>;

export const TripSpotPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: SpotCategory.optional(),
  priority: SpotPriority.optional(),
  meal_tags: z.array(MealTag).optional(),
  dishes: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type TripSpotPatch = z.infer<typeof TripSpotPatchSchema>;

export const GoalNoteKind = z.enum(["personal", "office"]);
export type GoalNoteKind = z.infer<typeof GoalNoteKind>;

export const GoalNoteSchema = z.object({
  _id: z.string(),
  profile_id: z.string(),
  goal_id: z.string(),
  task_id: z.string().nullable().default(null),
  kind: GoalNoteKind.default("personal"),
  body: z.string().min(1),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type GoalNote = z.infer<typeof GoalNoteSchema>;

export const GoalNoteInputSchema = GoalNoteSchema.omit({
  _id: true,
  profile_id: true,
  created_at: true,
  updated_at: true,
}).extend({
  body: z.string().min(1).max(10000),
});
export type GoalNoteInput = z.infer<typeof GoalNoteInputSchema>;

export const GoalNotePatchSchema = GoalNoteInputSchema.partial();
export type GoalNotePatch = z.infer<typeof GoalNotePatchSchema>;

export const GoalResourceSchema = z.object({
  _id: z.string(),
  profile_id: z.string(),
  goal_id: z.string(),
  label: z.string().min(1),
  url: z.string().min(1),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type GoalResource = z.infer<typeof GoalResourceSchema>;

export const GoalResourceInputSchema = GoalResourceSchema.omit({
  _id: true,
  profile_id: true,
  created_at: true,
  updated_at: true,
}).extend({
  label: z.string().min(1).max(100),
  url: z.string().min(1).max(2000),
});
export type GoalResourceInput = z.infer<typeof GoalResourceInputSchema>;

export const GoalResourcePatchSchema = GoalResourceInputSchema.partial();
export type GoalResourcePatch = z.infer<typeof GoalResourcePatchSchema>;

export const StashItemSchema = z.object({
  _id: z.string(),
  profile_id: z.string(),
  label: z.string().min(1),
  url: z.string().nullable().default(null),
  note: z.string().nullable().default(null),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type StashItem = z.infer<typeof StashItemSchema>;

export const StashItemInputSchema = StashItemSchema.omit({
  _id: true,
  profile_id: true,
  created_at: true,
  updated_at: true,
}).extend({
  label: z.string().min(1).max(200),
  url: z.string().max(2000).nullable().default(null),
  note: z.string().max(5000).nullable().default(null),
});
export type StashItemInput = z.infer<typeof StashItemInputSchema>;

export const StashItemPatchSchema = StashItemInputSchema.partial();
export type StashItemPatch = z.infer<typeof StashItemPatchSchema>;

export const MeetingSeriesSchema = z.object({
  _id: z.string(),
  profile_id: z.string(),
  title: z.string().min(1),
  cadence_label: z.string().nullable().default(null),
  default_attendees: z.string().nullable().default(null),
  archived: z.boolean().default(false),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type MeetingSeries = z.infer<typeof MeetingSeriesSchema>;

export const MeetingSeriesInputSchema = MeetingSeriesSchema.omit({
  _id: true,
  profile_id: true,
  archived: true,
  created_at: true,
  updated_at: true,
}).extend({
  title: z.string().min(1).max(200),
  cadence_label: z.string().max(100).nullable().default(null),
  default_attendees: z.string().max(500).nullable().default(null),
});
export type MeetingSeriesInput = z.infer<typeof MeetingSeriesInputSchema>;

export const MeetingSeriesPatchSchema = MeetingSeriesInputSchema.partial().extend({
  archived: z.boolean().optional(),
});
export type MeetingSeriesPatch = z.infer<typeof MeetingSeriesPatchSchema>;

export const MeetingSectionSchema = z.object({
  id: z.string(),
  title: z.string().default(""),
  body: z.string().default(""),
});
export type MeetingSection = z.infer<typeof MeetingSectionSchema>;

export const MeetingSchema = z.object({
  _id: z.string(),
  profile_id: z.string(),
  series_id: z.string().nullable().default(null),
  title: z.string().min(1),
  meeting_date: z.coerce.date(),
  body: z.string().default(""),
  sections: z.array(MeetingSectionSchema).default([]),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type Meeting = z.infer<typeof MeetingSchema>;

export const MeetingInputSchema = MeetingSchema.omit({
  _id: true,
  profile_id: true,
  sections: true,
  created_at: true,
  updated_at: true,
}).extend({
  title: z.string().min(1).max(200),
  body: z.string().max(20000).default(""),
});
export type MeetingInput = z.infer<typeof MeetingInputSchema>;

export const MeetingPatchSchema = MeetingInputSchema.partial();
export type MeetingPatch = z.infer<typeof MeetingPatchSchema>;

export const TaskInstanceSchema = z.object({
  _id: z.string(),
  profile_id: z.string(),
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
