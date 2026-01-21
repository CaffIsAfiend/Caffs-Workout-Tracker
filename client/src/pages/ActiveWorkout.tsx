import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { 
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  Timer,
  Clock,
  Loader2,

  SkipForward,
  SkipBack,
  History
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface SetLog {
  setNumber: number;
  weight: number | null;
  reps: number | null;
  duration: number | null;
  completed: boolean;
  skipped: boolean;
}

export default function ActiveWorkout() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  // Session state
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [setLogs, setSetLogs] = useState<Record<number, SetLog[]>>({});

  // Timer state
  const [restTimeRemaining, setRestTimeRemaining] = useState<number | null>(null);
  const [workoutTimeRemaining, setWorkoutTimeRemaining] = useState<number | null>(null);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [isWorkoutTimerActive, setIsWorkoutTimerActive] = useState(false);
  const [isDoubleRest, setIsDoubleRest] = useState(false);

  // Input state
  const [weightInput, setWeightInput] = useState("");
  const [repsInput, setRepsInput] = useState("");

  // Audio ref for timer sounds
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch workout data
  const { data: workoutData, isLoading } = trpc.workouts.getById.useQuery(
    { id: parseInt(id!) },
    { enabled: isAuthenticated && !!id }
  );

  // Start session mutation
  const startSession = trpc.sessions.start.useMutation();
  const completeSession = trpc.sessions.complete.useMutation();
  const logSet = trpc.sessions.logSet.useMutation();

  // Get previous logs for current exercise
  const currentExercise = workoutData?.exercises[currentExerciseIndex];
  const { data: previousLogs } = trpc.sessions.getPreviousLogs.useQuery(
    { exerciseId: currentExercise?.exercise.id! },
    { enabled: !!currentExercise?.exercise.id && isAuthenticated }
  );

  // Initialize session
  useEffect(() => {
    if (workoutData && !sessionId) {
      startSession.mutate(
        { workoutId: parseInt(id!) },
        {
          onSuccess: (data) => {
            setSessionId(data.id);
          },
          onError: () => {
            toast.error("Failed to start workout session");
          }
        }
      );
    }
  }, [workoutData, sessionId, id]);

  // Rest timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRestTimerActive && restTimeRemaining !== null && restTimeRemaining > 0) {
      interval = setInterval(() => {
        setRestTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            setIsRestTimerActive(false);
            setIsDoubleRest(false);
            // Play sound
            try {
              const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQwAHIjeli0A");
              audio.play().catch(() => {});
            } catch {}
            toast.success("Rest complete! Time for next set");
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRestTimerActive, restTimeRemaining]);

  // Workout timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWorkoutTimerActive && workoutTimeRemaining !== null && workoutTimeRemaining > 0) {
      interval = setInterval(() => {
        setWorkoutTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            setIsWorkoutTimerActive(false);
            try {
              const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQwAHIjeli0A");
              audio.play().catch(() => {});
            } catch {}
            toast.success("Time's up!");
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutTimerActive, workoutTimeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLogSet = async (completed: boolean, skipped: boolean = false) => {
    if (!sessionId || !currentExercise) return;

    const weight = weightInput ? parseFloat(weightInput) : null;
    const reps = repsInput ? parseInt(repsInput) : null;

    // Save to local state
    const exerciseId = currentExercise.exercise.id;
    const newLog: SetLog = {
      setNumber: currentSet,
      weight,
      reps,
      duration: null,
      completed,
      skipped,
    };

    setSetLogs((prev) => ({
      ...prev,
      [exerciseId]: [...(prev[exerciseId] || []), newLog],
    }));

    // Save to database
    try {
      await logSet.mutateAsync({
        sessionId,
        workoutExerciseId: currentExercise.workoutExercise.id,
        exerciseId: currentExercise.exercise.id,
        setNumber: currentSet,
        weight,
        reps,
        completed,
        skipped,
      });
    } catch {
      toast.error("Failed to log set");
    }

    // Move to next set or exercise
    const targetSets = currentExercise.workoutExercise.targetSets || 3;
    if (currentSet >= targetSets) {
      // Move to next exercise
      if (currentExerciseIndex < (workoutData?.exercises.length || 0) - 1) {
        setCurrentExerciseIndex((prev) => prev + 1);
        setCurrentSet(1);
        setWeightInput("");
        setRepsInput("");
      } else {
        // Workout complete
        handleCompleteWorkout();
      }
    } else {
      // Start rest timer if configured
      const restSeconds = currentExercise.workoutExercise.restSeconds;
      if (restSeconds && completed) {
        setRestTimeRemaining(restSeconds);
        setIsRestTimerActive(true);
      }
      setCurrentSet((prev) => prev + 1);
    }
  };

  const handleSkipSet = () => {
    handleLogSet(false, true);
  };

  const handleDoubleRest = () => {
    if (restTimeRemaining !== null && !isDoubleRest) {
      setRestTimeRemaining((prev) => (prev || 0) * 2);
      setIsDoubleRest(true);
      toast.info("Rest time doubled!");
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex((prev) => prev - 1);
      setCurrentSet(1);
      setWeightInput("");
      setRepsInput("");
      setRestTimeRemaining(null);
      setIsRestTimerActive(false);
    }
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < (workoutData?.exercises.length || 0) - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setCurrentSet(1);
      setWeightInput("");
      setRepsInput("");
      setRestTimeRemaining(null);
      setIsRestTimerActive(false);
    }
  };

  const handleStartWorkoutTimer = () => {
    if (currentExercise?.workoutExercise.workoutTimerSeconds) {
      setWorkoutTimeRemaining(currentExercise.workoutExercise.workoutTimerSeconds);
      setIsWorkoutTimerActive(true);
    }
  };

  const handleCompleteWorkout = async () => {
    if (sessionId) {
      try {
        await completeSession.mutateAsync({ id: sessionId });
        toast.success("Workout complete! Great job! 💪");
        setLocation("/history");
      } catch {
        toast.error("Failed to complete workout");
      }
    }
  };

  if (isLoading || !workoutData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const exercises = workoutData.exercises;
  const exercise = exercises[currentExerciseIndex];
  const targetSets = exercise?.workoutExercise.targetSets || 3;
  const targetReps = exercise?.workoutExercise.targetReps || 10;
  const progress = ((currentExerciseIndex * targetSets + currentSet - 1) / (exercises.length * targetSets)) * 100;

  // Get previous data for this exercise
  const prevSetData = previousLogs?.find((log) => log.setNumber === currentSet);

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom flex flex-col">
      {/* Header */}
      <header className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <Link href="/workouts">
            <Button variant="ghost" size="icon">
              <X className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-foreground">{workoutData.workout.name}</h1>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleCompleteWorkout}
            className="text-primary"
          >
            Finish
          </Button>
        </div>
        <Progress value={progress} className="h-1" />
        <p className="text-xs text-muted-foreground text-center mt-1">
          Exercise {currentExerciseIndex + 1} of {exercises.length}
        </p>
      </header>

      {/* Rest Timer Overlay */}
      {isRestTimerActive && restTimeRemaining !== null && (
        <div className="fixed inset-0 bg-background/95 z-50 flex flex-col items-center justify-center safe-area-top safe-area-bottom">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">Rest Time</p>
            <div className={`text-7xl font-bold text-primary timer-display mb-6 ${restTimeRemaining <= 5 ? 'countdown-pulse' : ''}`}>
              {formatTime(restTimeRemaining)}
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => {
                  setIsRestTimerActive(false);
                  setRestTimeRemaining(null);
                }}
              >
                Skip Rest
              </Button>
              <Button 
                size="lg"
                onClick={handleDoubleRest}
                disabled={isDoubleRest}
                className={isDoubleRest ? "opacity-50" : ""}
              >
                {isDoubleRest ? "Extended" : "Double Rest"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 px-4 py-4 overflow-y-auto">
        {exercise && (
          <>
            {/* Exercise Info */}
            <Card className="p-4 bg-card border-border mb-4">
              <div className="flex items-start gap-4">
                {exercise.exercise.imageUrl ? (
                  <img 
                    src={exercise.exercise.imageUrl}
                    alt={exercise.exercise.name}
                    className="w-20 h-20 rounded-xl object-cover bg-secondary"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center">
                    <span className="text-3xl">💪</span>
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {exercise.exercise.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Set {currentSet} of {targetSets} • {targetReps} reps
                  </p>
                  {exercise.workoutExercise.workoutTimerSeconds && (
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {formatTime(exercise.workoutExercise.workoutTimerSeconds)} work timer
                      </span>
                      {!isWorkoutTimerActive && (
                        <Button size="sm" variant="outline" onClick={handleStartWorkoutTimer}>
                          <Play className="w-3 h-3 mr-1" />
                          Start
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Workout Timer Display */}
              {isWorkoutTimerActive && workoutTimeRemaining !== null && (
                <div className="mt-4 p-4 bg-primary/10 rounded-xl text-center">
                  <p className="text-sm text-muted-foreground mb-1">Work Timer</p>
                  <div className="text-4xl font-bold text-primary timer-display">
                    {formatTime(workoutTimeRemaining)}
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="mt-2"
                    onClick={() => {
                      setIsWorkoutTimerActive(false);
                      setWorkoutTimeRemaining(null);
                    }}
                  >
                    Stop
                  </Button>
                </div>
              )}
            </Card>

            {/* Previous Performance */}
            {prevSetData && (
              <Card className="p-3 bg-secondary/50 border-border mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Last time:</span>
                  <span className="text-foreground font-medium">
                    {prevSetData.weight ? `${prevSetData.weight} lbs` : "—"} × {prevSetData.reps || "—"} reps
                  </span>
                </div>
              </Card>
            )}

            {/* Input Section */}
            <Card className="p-4 bg-card border-border mb-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Weight (lbs)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className="text-2xl font-bold h-14 text-center"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Reps</label>
                  <Input
                    type="number"
                    placeholder={targetReps.toString()}
                    value={repsInput}
                    onChange={(e) => setRepsInput(e.target.value)}
                    className="text-2xl font-bold h-14 text-center"
                  />
                </div>
              </div>

              <Button 
                className="w-full h-14 text-lg font-semibold"
                onClick={() => handleLogSet(true)}
              >
                <Check className="w-5 h-5 mr-2" />
                Complete Set
              </Button>
            </Card>

            {/* Current Exercise Sets */}
            {setLogs[exercise.exercise.id]?.length > 0 && (
              <Card className="p-4 bg-card border-border mb-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Completed Sets</h3>
                <div className="space-y-2">
                  {setLogs[exercise.exercise.id].map((log, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Set {log.setNumber}</span>
                      <span className="text-foreground">
                        {log.skipped ? (
                          <span className="text-muted-foreground">Skipped</span>
                        ) : (
                          `${log.weight || "—"} lbs × ${log.reps || "—"}`
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <div className="px-4 pb-4 safe-area-bottom">
        <div className="flex items-center justify-between gap-3">
          <Button 
            variant="outline" 
            size="lg"
            onClick={handlePreviousExercise}
            disabled={currentExerciseIndex === 0}
            className="flex-1"
          >
            <SkipBack className="w-5 h-5 mr-2" />
            Previous
          </Button>
          <Button 
            variant="outline"
            size="lg"
            onClick={handleSkipSet}
            className="px-4"
          >
            Skip
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={handleNextExercise}
            disabled={currentExerciseIndex >= exercises.length - 1}
            className="flex-1"
          >
            Next
            <SkipForward className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
