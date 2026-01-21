import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  getExercises: vi.fn().mockResolvedValue([
    { id: 1, name: "Bench Press", category: "chest_back", isCustom: false },
    { id: 2, name: "Bicep Curl", category: "arms", isCustom: false },
  ]),
  getExerciseById: vi.fn().mockResolvedValue({
    id: 1, name: "Bench Press", category: "chest_back", isCustom: false
  }),
  createExercise: vi.fn().mockResolvedValue({ id: 3, name: "Custom Exercise" }),
  getWorkouts: vi.fn().mockResolvedValue([
    { id: 1, name: "Push Day", splitCategory: "chest_back", userId: 1 },
  ]),
  getWorkoutById: vi.fn().mockResolvedValue({
    id: 1, name: "Push Day", splitCategory: "chest_back", userId: 1
  }),
  createWorkout: vi.fn().mockResolvedValue({ id: 2, name: "New Workout" }),
  getWorkoutExercises: vi.fn().mockResolvedValue([]),
  addWorkoutExercise: vi.fn().mockResolvedValue({ id: 1 }),
  getWorkoutSessions: vi.fn().mockResolvedValue([]),
  createWorkoutSession: vi.fn().mockResolvedValue({ id: 1 }),
  createExerciseLog: vi.fn().mockResolvedValue({ id: 1 }),
  getLastWorkoutLogs: vi.fn().mockResolvedValue([]),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("exercises router", () => {
  it("lists exercises for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.exercises.list();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a custom exercise", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.exercises.create({
      name: "Custom Push-up",
      category: "chest_back",
      description: "Modified push-up variation",
    });

    expect(result).toBeDefined();
    expect(result.name).toBe("Custom Exercise");
  });
});

describe("workouts router", () => {
  it("lists workouts for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.workouts.list();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a new workout", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.workouts.create({
      name: "Leg Day",
      splitCategory: "legs",
    });

    expect(result).toBeDefined();
    expect(result.name).toBe("New Workout");
  });

  it("adds exercise to workout", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.workouts.addExercise({
      workoutId: 1,
      exerciseId: 1,
      targetSets: 4,
      targetReps: 12,
      restSeconds: 90,
    });

    expect(result).toBeDefined();
  });
});

describe("sessions router", () => {
  it("starts a workout session", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sessions.start({
      workoutId: 1,
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
  });

  it("logs a set during workout", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sessions.logSet({
      sessionId: 1,
      workoutExerciseId: 1,
      exerciseId: 1,
      setNumber: 1,
      weight: 135,
      reps: 10,
      completed: true,
    });

    expect(result).toBeDefined();
  });

  it("retrieves previous workout logs for comparison", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sessions.getPreviousLogs({
      exerciseId: 1,
    });

    expect(Array.isArray(result)).toBe(true);
  });
});
