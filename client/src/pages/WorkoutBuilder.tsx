import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { 
  ChevronLeft,
  Plus,
  Trash2,
  GripVertical,
  Timer,
  Clock,
  Save,
  Loader2,
  Search,
  X
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const splitOptions = [
  { value: "arms", label: "Arms" },
  { value: "chest_back", label: "Chest & Back" },
  { value: "legs", label: "Legs" },
  { value: "hiit", label: "HIIT" },
];

interface WorkoutExerciseItem {
  id?: number;
  exerciseId: number;
  exerciseName: string;
  targetSets: number;
  targetReps: string;
  restSeconds: number | null;
  workoutTimerSeconds: number | null;
}

export default function WorkoutBuilder() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const isEditing = !!id && id !== "new";

  const [name, setName] = useState("");
  const [splitCategory, setSplitCategory] = useState<string>("arms");
  const [exercises, setExercises] = useState<WorkoutExerciseItem[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [editingExercise, setEditingExercise] = useState<WorkoutExerciseItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch existing workout if editing
  const { data: workoutData, isLoading: loadingWorkout } = trpc.workouts.getById.useQuery(
    { id: parseInt(id!) },
    { enabled: isEditing && isAuthenticated }
  );

  // Fetch available exercises
  const { data: availableExercises, isLoading: loadingExercises } = trpc.exercises.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Sync exercises from API
  const syncExercises = trpc.exercises.syncFromApi.useMutation({
    onSuccess: (data) => {
      toast.success(`Imported ${data.imported} exercises`);
    },
    onError: () => {
      toast.error("Failed to sync exercises");
    }
  });

  // Create workout mutation
  const createWorkout = trpc.workouts.create.useMutation();
  const updateWorkout = trpc.workouts.update.useMutation();
  const addExercise = trpc.workouts.addExercise.useMutation();
  const updateExercise = trpc.workouts.updateExercise.useMutation();
  const removeExercise = trpc.workouts.removeExercise.useMutation();

  // Load existing workout data
  useEffect(() => {
    if (workoutData) {
      setName(workoutData.workout.name);
      setSplitCategory(workoutData.workout.splitCategory);
      setExercises(workoutData.exercises.map(e => ({
        id: e.workoutExercise.id,
        exerciseId: e.exercise.id,
        exerciseName: e.exercise.name,
        targetSets: e.workoutExercise.targetSets || 3,
        targetReps: e.workoutExercise.targetReps || "10",
        restSeconds: e.workoutExercise.restSeconds,
        workoutTimerSeconds: e.workoutExercise.workoutTimerSeconds,
      })));
    }
  }, [workoutData]);

  const handleAddExercise = (exercise: { id: number; name: string }) => {
    setExercises([...exercises, {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      targetSets: 3,
      targetReps: "10",
      restSeconds: null,
      workoutTimerSeconds: null,
    }]);
    setShowExercisePicker(false);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleUpdateExercise = (index: number, updates: Partial<WorkoutExerciseItem>) => {
    setExercises(exercises.map((e, i) => i === index ? { ...e, ...updates } : e));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a workout name");
      return;
    }
    if (exercises.length === 0) {
      toast.error("Please add at least one exercise");
      return;
    }

    try {
      if (isEditing) {
        // Update existing workout
        await updateWorkout.mutateAsync({
          id: parseInt(id!),
          name,
          splitCategory: splitCategory as any,
        });

        // Update exercises - for simplicity, we'll just update the existing ones
        // In a production app, you'd want to handle adds/removes more carefully
        for (const ex of exercises) {
          if (ex.id) {
            await updateExercise.mutateAsync({
              id: ex.id,
              targetSets: ex.targetSets,
              targetReps: ex.targetReps,
              restSeconds: ex.restSeconds,
              workoutTimerSeconds: ex.workoutTimerSeconds,
            });
          } else {
            await addExercise.mutateAsync({
              workoutId: parseInt(id!),
              exerciseId: ex.exerciseId,
              targetSets: ex.targetSets,
              targetReps: ex.targetReps,
              restSeconds: ex.restSeconds,
              workoutTimerSeconds: ex.workoutTimerSeconds,
            });
          }
        }

        toast.success("Workout updated!");
      } else {
        // Create new workout
        const workout = await createWorkout.mutateAsync({
          name,
          splitCategory: splitCategory as any,
        });

        // Add exercises
        for (const ex of exercises) {
          await addExercise.mutateAsync({
            workoutId: workout.id,
            exerciseId: ex.exerciseId,
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            restSeconds: ex.restSeconds,
            workoutTimerSeconds: ex.workoutTimerSeconds,
          });
        }

        toast.success("Workout created!");
      }

      setLocation("/workouts");
    } catch (error) {
      toast.error("Failed to save workout");
    }
  };

  const filteredExercises = availableExercises?.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loadingWorkout && isEditing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="px-4 pt-4 pb-4 flex items-center gap-3 border-b border-border">
        <Link href="/workouts">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-foreground flex-1">
          {isEditing ? "Edit Workout" : "New Workout"}
        </h1>
        <Button onClick={handleSave} disabled={createWorkout.isPending || updateWorkout.isPending}>
          {(createWorkout.isPending || updateWorkout.isPending) ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </header>

      <main className="px-4 py-6 pb-24 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workout Name</Label>
            <Input
              id="name"
              placeholder="e.g., Monday Push Day"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Split Category</Label>
            <Select value={splitCategory} onValueChange={setSplitCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {splitOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Exercises */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>Exercises</Label>
            {availableExercises?.length === 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => syncExercises.mutate()}
                disabled={syncExercises.isPending}
              >
                {syncExercises.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Load Exercise Library
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {exercises.map((exercise, index) => (
              <Card key={index} className="p-4 bg-card border-border">
                <div className="flex items-start gap-3">
                  <div className="pt-1">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground truncate">
                        {exercise.exerciseName}
                      </h4>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="shrink-0 text-destructive"
                        onClick={() => handleRemoveExercise(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Sets & Reps */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Sets</Label>
                        <Input
                          type="number"
                          value={exercise.targetSets === 0 ? "" : exercise.targetSets}
                          onChange={(e) => handleUpdateExercise(index, { targetSets: e.target.value === "" ? 0 : parseInt(e.target.value) })}
                          onBlur={(e) => {
                            if (e.target.value === "") {
                              handleUpdateExercise(index, { targetSets: 0 });
                            }
                          }}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Reps (or range)</Label>
                        <Input
                          type="text"
                          placeholder="e.g., 10 or 8-12"
                          value={exercise.targetReps}
                          onChange={(e) => handleUpdateExercise(index, { targetReps: e.target.value })}
                          onBlur={(e) => {
                            if (e.target.value === "") {
                              handleUpdateExercise(index, { targetReps: "10" });
                            }
                          }}
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* Timers */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          Rest (sec)
                        </Label>
                        <Input
                          type="number"
                          placeholder="Optional"
                          value={exercise.restSeconds || ""}
                          onChange={(e) => handleUpdateExercise(index, { 
                            restSeconds: e.target.value ? parseInt(e.target.value) : null 
                          })}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Work Timer (sec)
                        </Label>
                        <Input
                          type="number"
                          placeholder="Optional"
                          value={exercise.workoutTimerSeconds || ""}
                          onChange={(e) => handleUpdateExercise(index, { 
                            workoutTimerSeconds: e.target.value ? parseInt(e.target.value) : null 
                          })}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowExercisePicker(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Exercise
            </Button>
          </div>
        </div>
      </main>

      {/* Exercise Picker Sheet */}
      <Sheet open={showExercisePicker} onOpenChange={setShowExercisePicker}>
        <SheetContent side="bottom" className="h-[80vh] bg-background">
          <SheetHeader className="pb-4">
            <SheetTitle>Add Exercise</SheetTitle>
          </SheetHeader>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {loadingExercises ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {availableExercises?.length === 0 
                  ? "No exercises loaded yet" 
                  : `No exercises found for "${searchQuery}"`}
              </p>
              <div className="flex gap-2 justify-center">
                {availableExercises?.length === 0 && (
                  <Button 
                    onClick={() => syncExercises.mutate()}
                    disabled={syncExercises.isPending}
                  >
                    {syncExercises.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Load Exercise Library
                  </Button>
                )}
                {searchQuery && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setLocation("/exercises");
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create "{searchQuery}"
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[calc(80vh-140px)]">
              {filteredExercises.map((exercise) => (
                <Card 
                  key={exercise.id}
                  className="p-3 bg-card border-border cursor-pointer card-hover"
                  onClick={() => handleAddExercise(exercise)}
                >
                  <div className="flex items-center gap-3">
                    {exercise.imageUrl ? (
                      <img 
                        src={exercise.imageUrl} 
                        alt={exercise.name}
                        className="w-12 h-12 rounded-lg object-cover bg-secondary"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                        <span className="text-lg">💪</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{exercise.name}</h4>
                      <p className="text-xs text-muted-foreground capitalize">
                        {exercise.category.replace("_", " & ")}
                      </p>
                    </div>
                    <Plus className="w-5 h-5 text-primary shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
