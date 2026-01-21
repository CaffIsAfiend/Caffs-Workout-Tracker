import { eq, and, desc, asc, inArray, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  exercises, InsertExercise, Exercise,
  workouts, InsertWorkout, Workout,
  workoutExercises, InsertWorkoutExercise, WorkoutExercise,
  workoutSessions, InsertWorkoutSession, WorkoutSession,
  exerciseLogs, InsertExerciseLog, ExerciseLog
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER QUERIES ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ EXERCISE QUERIES ============

export async function getExercises(userId?: number, category?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  
  // Get API exercises (userId is null) OR user's custom exercises
  if (userId) {
    conditions.push(or(isNull(exercises.userId), eq(exercises.userId, userId)));
  } else {
    conditions.push(isNull(exercises.userId));
  }
  
  if (category) {
    conditions.push(eq(exercises.category, category as any));
  }

  return db.select().from(exercises).where(and(...conditions)).orderBy(asc(exercises.name));
}

export async function getExerciseById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
  return result[0] || null;
}

export async function createExercise(exercise: InsertExercise) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(exercises).values(exercise);
  return { id: result[0].insertId, ...exercise };
}

export async function updateExercise(id: number, data: Partial<InsertExercise>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(exercises).set(data).where(eq(exercises.id, id));
}

export async function deleteExercise(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(exercises).where(eq(exercises.id, id));
}

export async function bulkInsertExercises(exerciseList: InsertExercise[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (exerciseList.length === 0) return;
  await db.insert(exercises).values(exerciseList);
}

export async function getExerciseByWgerId(wgerId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(exercises).where(eq(exercises.wgerExerciseId, wgerId)).limit(1);
  return result[0] || null;
}

// ============ WORKOUT QUERIES ============

export async function getWorkouts(userId: number, splitCategory?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(workouts.userId, userId)];
  if (splitCategory) {
    conditions.push(eq(workouts.splitCategory, splitCategory as any));
  }

  return db.select().from(workouts).where(and(...conditions)).orderBy(desc(workouts.updatedAt));
}

export async function getWorkoutById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(workouts).where(eq(workouts.id, id)).limit(1);
  return result[0] || null;
}

export async function createWorkout(workout: InsertWorkout) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(workouts).values(workout);
  return { id: result[0].insertId, ...workout };
}

export async function updateWorkout(id: number, data: Partial<InsertWorkout>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(workouts).set(data).where(eq(workouts.id, id));
}

export async function deleteWorkout(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete associated workout exercises first
  await db.delete(workoutExercises).where(eq(workoutExercises.workoutId, id));
  await db.delete(workouts).where(eq(workouts.id, id));
}

// ============ WORKOUT EXERCISE QUERIES ============

export async function getWorkoutExercises(workoutId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    workoutExercise: workoutExercises,
    exercise: exercises
  })
  .from(workoutExercises)
  .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
  .where(eq(workoutExercises.workoutId, workoutId))
  .orderBy(asc(workoutExercises.orderIndex));
}

export async function addWorkoutExercise(data: InsertWorkoutExercise) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(workoutExercises).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateWorkoutExercise(id: number, data: Partial<InsertWorkoutExercise>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(workoutExercises).set(data).where(eq(workoutExercises.id, id));
}

export async function deleteWorkoutExercise(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(workoutExercises).where(eq(workoutExercises.id, id));
}

export async function reorderWorkoutExercises(workoutId: number, exerciseIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (let i = 0; i < exerciseIds.length; i++) {
    await db.update(workoutExercises)
      .set({ orderIndex: i })
      .where(and(
        eq(workoutExercises.workoutId, workoutId),
        eq(workoutExercises.id, exerciseIds[i])
      ));
  }
}

// ============ WORKOUT SESSION QUERIES ============

export async function getWorkoutSessions(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    session: workoutSessions,
    workout: workouts
  })
  .from(workoutSessions)
  .innerJoin(workouts, eq(workoutSessions.workoutId, workouts.id))
  .where(eq(workoutSessions.userId, userId))
  .orderBy(desc(workoutSessions.startedAt))
  .limit(limit);
}

export async function getWorkoutSessionById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select({
    session: workoutSessions,
    workout: workouts
  })
  .from(workoutSessions)
  .innerJoin(workouts, eq(workoutSessions.workoutId, workouts.id))
  .where(eq(workoutSessions.id, id))
  .limit(1);
  
  return result[0] || null;
}

export async function createWorkoutSession(session: InsertWorkoutSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(workoutSessions).values(session);
  return { id: result[0].insertId, ...session };
}

export async function completeWorkoutSession(id: number, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(workoutSessions).set({ 
    completedAt: new Date(),
    notes 
  }).where(eq(workoutSessions.id, id));
}

// ============ EXERCISE LOG QUERIES ============

export async function getExerciseLogs(sessionId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    log: exerciseLogs,
    exercise: exercises
  })
  .from(exerciseLogs)
  .innerJoin(exercises, eq(exerciseLogs.exerciseId, exercises.id))
  .where(eq(exerciseLogs.sessionId, sessionId))
  .orderBy(asc(exerciseLogs.loggedAt));
}

export async function createExerciseLog(log: InsertExerciseLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(exerciseLogs).values(log);
  return { id: result[0].insertId, ...log };
}

export async function updateExerciseLog(id: number, data: Partial<InsertExerciseLog>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(exerciseLogs).set(data).where(eq(exerciseLogs.id, id));
}

export async function getLastWorkoutLogs(userId: number, exerciseId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get the most recent session that included this exercise
  const lastSession = await db.select({
    sessionId: exerciseLogs.sessionId,
    startedAt: workoutSessions.startedAt
  })
  .from(exerciseLogs)
  .innerJoin(workoutSessions, eq(exerciseLogs.sessionId, workoutSessions.id))
  .where(and(
    eq(workoutSessions.userId, userId),
    eq(exerciseLogs.exerciseId, exerciseId)
  ))
  .orderBy(desc(workoutSessions.startedAt))
  .limit(1);

  if (lastSession.length === 0) return [];

  // Get all logs from that session for this exercise
  return db.select()
    .from(exerciseLogs)
    .where(and(
      eq(exerciseLogs.sessionId, lastSession[0].sessionId),
      eq(exerciseLogs.exerciseId, exerciseId)
    ))
    .orderBy(asc(exerciseLogs.setNumber));
}

export async function getExerciseHistory(userId: number, exerciseId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    log: exerciseLogs,
    session: workoutSessions
  })
  .from(exerciseLogs)
  .innerJoin(workoutSessions, eq(exerciseLogs.sessionId, workoutSessions.id))
  .where(and(
    eq(workoutSessions.userId, userId),
    eq(exerciseLogs.exerciseId, exerciseId)
  ))
  .orderBy(desc(workoutSessions.startedAt))
  .limit(limit);
}

export async function getPersonalRecord(userId: number, exerciseId: number) {
  const db = await getDb();
  if (!db) return null;

  // Get all completed logs for this exercise
  const logs = await db.select({
    weight: exerciseLogs.weight,
    reps: exerciseLogs.reps,
  })
  .from(exerciseLogs)
  .innerJoin(workoutSessions, eq(exerciseLogs.sessionId, workoutSessions.id))
  .where(and(
    eq(workoutSessions.userId, userId),
    eq(exerciseLogs.exerciseId, exerciseId),
    eq(exerciseLogs.completed, true)
  ));

  if (logs.length === 0) return null;

  // Calculate outlier threshold using IQR method
  const weights = logs.map(l => l.weight || 0).filter(w => w > 0).sort((a, b) => a - b);
  if (weights.length === 0) return null;

  // Calculate Q1, Q3, and IQR
  const q1Index = Math.floor(weights.length * 0.25);
  const q3Index = Math.floor(weights.length * 0.75);
  const q1 = weights[q1Index];
  const q3 = weights[q3Index];
  const iqr = q3 - q1;
  const upperBound = q3 + (1.5 * iqr);

  // Filter out outliers and find max
  const validWeights = logs.filter(l => {
    const w = l.weight || 0;
    return w > 0 && w <= upperBound;
  });

  if (validWeights.length === 0) return null;

  // Find the record with highest weight
  const pr = validWeights.reduce((max, current) => {
    const currentWeight = current.weight || 0;
    const maxWeight = max.weight || 0;
    if (currentWeight > maxWeight) return current;
    if (currentWeight === maxWeight && (current.reps || 0) > (max.reps || 0)) return current;
    return max;
  });

  return pr;
}
