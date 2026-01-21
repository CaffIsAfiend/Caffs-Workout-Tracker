import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import axios from "axios";
import { storagePut } from "./storage";

// Category mapping from wger API to our categories
const wgerCategoryMap: Record<number, string> = {
  8: "arms",      // Arms
  10: "abs",      // Abs  
  11: "chest_back", // Chest
  12: "chest_back", // Back
  13: "shoulders",  // Shoulders
  9: "legs",      // Legs
  14: "calves",   // Calves
  15: "cardio",   // Cardio -> hiit
};

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ EXERCISES ============
  exercises: router({
    list: protectedProcedure
      .input(z.object({ 
        category: z.string().optional(),
        search: z.string().optional()
      }).optional())
      .query(async ({ ctx, input }) => {
        return db.getExercises(ctx.user.id, input?.category);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getExerciseById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.enum(["arms", "chest_back", "legs", "hiit", "abs", "shoulders", "cardio", "calves"]),
        muscleGroups: z.array(z.string()).optional(),
        equipment: z.string().optional(),
        imageUrl: z.string().optional(),
        videoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createExercise({
          ...input,
          userId: ctx.user.id,
          isCustom: true,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.enum(["arms", "chest_back", "legs", "hiit", "abs", "shoulders", "cardio", "calves"]).optional(),
        muscleGroups: z.array(z.string()).optional(),
        equipment: z.string().optional(),
        imageUrl: z.string().optional(),
        videoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        // Verify ownership
        const exercise = await db.getExerciseById(id);
        if (!exercise || exercise.userId !== ctx.user.id) {
          throw new Error("Exercise not found or not owned by user");
        }
        await db.updateExercise(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const exercise = await db.getExerciseById(input.id);
        if (!exercise || exercise.userId !== ctx.user.id) {
          throw new Error("Exercise not found or not owned by user");
        }
        await db.deleteExercise(input.id);
        return { success: true };
      }),

    // Fetch exercises from wger API and cache them
    syncFromApi: protectedProcedure
      .input(z.object({ category: z.number().optional() }).optional())
      .mutation(async () => {
        try {
          const response = await axios.get(
            "https://wger.de/api/v2/exerciseinfo/",
            { 
              params: { 
                language: 2, // English
                limit: 200 
              },
              timeout: 30000
            }
          );

          const apiExercises = response.data.results;
          const exercisesToInsert = [];

          for (const ex of apiExercises) {
            // Check if already exists
            const existing = await db.getExerciseByWgerId(ex.id);
            if (existing) continue;

            // Get English translation
            const englishTranslation = ex.translations?.find((t: any) => t.language === 2);
            if (!englishTranslation) continue;

            // Map category
            const category = wgerCategoryMap[ex.category?.id] || "arms";

            // Get primary image
            const mainImage = ex.images?.find((img: any) => img.is_main)?.image || ex.images?.[0]?.image;

            // Get muscles
            const muscles = ex.muscles?.map((m: any) => m.name_en || m.name).filter(Boolean) || [];

            exercisesToInsert.push({
              wgerExerciseId: ex.id,
              name: englishTranslation.name,
              description: englishTranslation.description?.replace(/<[^>]*>/g, '') || null,
              category: category as any,
              muscleGroups: muscles,
              equipment: ex.equipment?.[0]?.name || null,
              imageUrl: mainImage || null,
              videoUrl: null,
              isCustom: false,
              userId: null,
            });
          }

          if (exercisesToInsert.length > 0) {
            await db.bulkInsertExercises(exercisesToInsert);
          }

          return { 
            success: true, 
            imported: exercisesToInsert.length,
            total: apiExercises.length
          };
        } catch (error) {
          console.error("Failed to sync exercises:", error);
          throw new Error("Failed to sync exercises from API");
        }
      }),

    getHistory: protectedProcedure
      .input(z.object({ exerciseId: z.number(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return db.getExerciseHistory(ctx.user.id, input.exerciseId, input.limit);
      }),

    uploadMedia: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileData: z.string(), // base64 encoded
        contentType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const buffer = Buffer.from(input.fileData, 'base64');
          const key = `exercises/${ctx.user.id}/${Date.now()}-${input.fileName}`;
          const result = await storagePut(key, buffer, input.contentType);
          return { url: result.url };
        } catch (error) {
          console.error("Failed to upload media:", error);
          throw new Error("Failed to upload media");
        }
      }),

    getPersonalRecord: protectedProcedure
      .input(z.object({ exerciseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getPersonalRecord(ctx.user.id, input.exerciseId);
      }),
  }),

  // ============ WORKOUTS ============
  workouts: router({
    list: protectedProcedure
      .input(z.object({ splitCategory: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getWorkouts(ctx.user.id, input?.splitCategory);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const workout = await db.getWorkoutById(input.id);
        if (!workout || workout.userId !== ctx.user.id) {
          throw new Error("Workout not found");
        }
        const exercises = await db.getWorkoutExercises(input.id);
        return { workout, exercises };
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        splitCategory: z.enum(["arms", "chest_back", "legs", "hiit"]),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createWorkout({
          ...input,
          userId: ctx.user.id,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        splitCategory: z.enum(["arms", "chest_back", "legs", "hiit"]).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const workout = await db.getWorkoutById(id);
        if (!workout || workout.userId !== ctx.user.id) {
          throw new Error("Workout not found");
        }
        await db.updateWorkout(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const workout = await db.getWorkoutById(input.id);
        if (!workout || workout.userId !== ctx.user.id) {
          throw new Error("Workout not found");
        }
        await db.deleteWorkout(input.id);
        return { success: true };
      }),

    // Add exercise to workout
    addExercise: protectedProcedure
      .input(z.object({
        workoutId: z.number(),
        exerciseId: z.number(),
        targetSets: z.number().default(3),
        targetReps: z.number().default(10),
        restSeconds: z.number().nullable().optional(),
        workoutTimerSeconds: z.number().nullable().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const workout = await db.getWorkoutById(input.workoutId);
        if (!workout || workout.userId !== ctx.user.id) {
          throw new Error("Workout not found");
        }
        
        // Get current max order
        const exercises = await db.getWorkoutExercises(input.workoutId);
        const maxOrder = exercises.length > 0 
          ? Math.max(...exercises.map(e => e.workoutExercise.orderIndex))
          : -1;

        return db.addWorkoutExercise({
          ...input,
          orderIndex: maxOrder + 1,
        });
      }),

    updateExercise: protectedProcedure
      .input(z.object({
        id: z.number(),
        targetSets: z.number().optional(),
        targetReps: z.number().optional(),
        restSeconds: z.number().nullable().optional(),
        workoutTimerSeconds: z.number().nullable().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateWorkoutExercise(id, data);
        return { success: true };
      }),

    removeExercise: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteWorkoutExercise(input.id);
        return { success: true };
      }),

    reorderExercises: protectedProcedure
      .input(z.object({
        workoutId: z.number(),
        exerciseIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        const workout = await db.getWorkoutById(input.workoutId);
        if (!workout || workout.userId !== ctx.user.id) {
          throw new Error("Workout not found");
        }
        await db.reorderWorkoutExercises(input.workoutId, input.exerciseIds);
        return { success: true };
      }),
  }),

  // ============ SESSIONS ============
  sessions: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getWorkoutSessions(ctx.user.id, input?.limit);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await db.getWorkoutSessionById(input.id);
        if (!session || session.session.userId !== ctx.user.id) {
          throw new Error("Session not found");
        }
        const logs = await db.getExerciseLogs(input.id);
        return { ...session, logs };
      }),

    start: protectedProcedure
      .input(z.object({ workoutId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const workout = await db.getWorkoutById(input.workoutId);
        if (!workout || workout.userId !== ctx.user.id) {
          throw new Error("Workout not found");
        }
        return db.createWorkoutSession({
          userId: ctx.user.id,
          workoutId: input.workoutId,
        });
      }),

    complete: protectedProcedure
      .input(z.object({ 
        id: z.number(),
        notes: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const session = await db.getWorkoutSessionById(input.id);
        if (!session || session.session.userId !== ctx.user.id) {
          throw new Error("Session not found");
        }
        await db.completeWorkoutSession(input.id, input.notes);
        return { success: true };
      }),

    // Log a set during workout
    logSet: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        workoutExerciseId: z.number(),
        exerciseId: z.number(),
        setNumber: z.number(),
        weight: z.number().nullable().optional(),
        reps: z.number().nullable().optional(),
        duration: z.number().nullable().optional(),
        completed: z.boolean().default(true),
        skipped: z.boolean().default(false),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createExerciseLog(input);
      }),

    updateLog: protectedProcedure
      .input(z.object({
        id: z.number(),
        weight: z.number().nullable().optional(),
        reps: z.number().nullable().optional(),
        duration: z.number().nullable().optional(),
        completed: z.boolean().optional(),
        skipped: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateExerciseLog(id, data);
        return { success: true };
      }),

    // Get previous workout data for comparison
    getPreviousLogs: protectedProcedure
      .input(z.object({ exerciseId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getLastWorkoutLogs(ctx.user.id, input.exerciseId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
