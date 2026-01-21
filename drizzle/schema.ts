import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Exercises - both from API and custom user-created
 */
export const exercises = mysqlTable("exercises", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // null for API exercises, set for custom
  wgerExerciseId: int("wgerExerciseId"), // ID from wger API if applicable
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["arms", "chest_back", "legs", "hiit", "abs", "shoulders", "cardio", "calves"]).notNull(),
  muscleGroups: json("muscleGroups").$type<string[]>(), // primary muscles targeted
  equipment: varchar("equipment", { length: 255 }),
  imageUrl: text("imageUrl"), // URL to form image/gif
  videoUrl: text("videoUrl"), // URL to form video
  isCustom: boolean("isCustom").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = typeof exercises.$inferInsert;

/**
 * Workout templates - saved workout routines
 */
export const workouts = mysqlTable("workouts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  splitCategory: mysqlEnum("splitCategory", ["arms", "chest_back", "legs", "hiit"]).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = typeof workouts.$inferInsert;

/**
 * Workout exercises - exercises within a workout template
 */
export const workoutExercises = mysqlTable("workout_exercises", {
  id: int("id").autoincrement().primaryKey(),
  workoutId: int("workoutId").notNull(),
  exerciseId: int("exerciseId").notNull(),
  orderIndex: int("orderIndex").notNull(), // order in workout
  targetSets: int("targetSets").default(3),
  targetReps: varchar("targetReps", { length: 20 }).default("10"),
  restSeconds: int("restSeconds"), // exercise-specific rest time (null = no timer)
  workoutTimerSeconds: int("workoutTimerSeconds"), // optional endurance timer (null = not timed)
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type InsertWorkoutExercise = typeof workoutExercises.$inferInsert;

/**
 * Workout sessions - actual workout instances
 */
export const workoutSessions = mysqlTable("workout_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  workoutId: int("workoutId").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
});

export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type InsertWorkoutSession = typeof workoutSessions.$inferInsert;

/**
 * Exercise logs - individual set records during a session
 */
export const exerciseLogs = mysqlTable("exercise_logs", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  workoutExerciseId: int("workoutExerciseId").notNull(),
  exerciseId: int("exerciseId").notNull(),
  setNumber: int("setNumber").notNull(),
  weight: int("weight"), // in pounds or kg based on user preference
  reps: int("reps"),
  duration: int("duration"), // for timed exercises, in seconds
  completed: boolean("completed").default(false).notNull(),
  skipped: boolean("skipped").default(false).notNull(),
  notes: text("notes"),
  loggedAt: timestamp("loggedAt").defaultNow().notNull(),
});

export type ExerciseLog = typeof exerciseLogs.$inferSelect;
export type InsertExerciseLog = typeof exerciseLogs.$inferInsert;
