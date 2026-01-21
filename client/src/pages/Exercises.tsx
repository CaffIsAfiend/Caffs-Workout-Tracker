import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { 
  ChevronLeft,
  Plus,
  Search,
  X,
  Loader2,
  Dumbbell,
  Target,
  History,
  Filter,
  Upload,
  Trash2,
  Pencil
} from "lucide-react";
import { Link } from "wouter";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "arms", label: "Arms" },
  { value: "chest_back", label: "Chest & Back" },
  { value: "legs", label: "Legs" },
  { value: "hiit", label: "HIIT" },
  { value: "abs", label: "Abs" },
  { value: "shoulders", label: "Shoulders" },
  { value: "cardio", label: "Cardio" },
  { value: "calves", label: "Calves" },
];

export default function Exercises() {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [quickCreateName, setQuickCreateName] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showExerciseDetail, setShowExerciseDetail] = useState<number | null>(null);

  // Form state for new exercise
  const [newExercise, setNewExercise] = useState({
    name: "",
    description: "",
    category: "arms" as string,
    imageUrl: "",
    videoUrl: "",
  });
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Handle quick create from search
  useEffect(() => {
    if (quickCreateName && showCreateDialog) {
      setNewExercise(prev => ({ ...prev, name: quickCreateName }));
      setQuickCreateName("");
    }
  }, [quickCreateName, showCreateDialog]);

  const { data: exercises, isLoading, refetch } = trpc.exercises.list.useQuery(
    categoryFilter && categoryFilter !== "all" ? { category: categoryFilter } : undefined,
    { enabled: isAuthenticated }
  );

  const syncExercises = trpc.exercises.syncFromApi.useMutation({
    onSuccess: (data) => {
      toast.success(`Imported ${data.imported} exercises from library`);
      refetch();
    },
    onError: () => {
      toast.error("Failed to sync exercises");
    }
  });

  const uploadMedia = trpc.exercises.uploadMedia.useMutation();

  const createExercise = trpc.exercises.create.useMutation({
    onSuccess: () => {
      toast.success("Exercise created!");
      setShowCreateDialog(false);
      setNewExercise({
        name: "",
        description: "",
        category: "arms",
        imageUrl: "",
        videoUrl: "",
      });
      refetch();
    },
    onError: () => {
      toast.error("Failed to create exercise");
    }
  });

  const deleteExercise = trpc.exercises.delete.useMutation({
    onSuccess: () => {
      toast.success("Exercise deleted");
      refetch();
    },
    onError: () => {
      toast.error("Failed to delete exercise");
    }
  });

  const filteredExercises = exercises?.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const selectedExercise = exercises?.find(e => e.id === showExerciseDetail);

  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    setUploadingMedia(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(',')[1];
        
        const result = await uploadMedia.mutateAsync({
          fileName: file.name,
          fileData: base64Data,
          contentType: file.type,
        });

        if (type === 'image') {
          setNewExercise({ ...newExercise, imageUrl: result.url });
        } else {
          setNewExercise({ ...newExercise, videoUrl: result.url });
        }
        toast.success(`${type === 'image' ? 'Image' : 'Video'} uploaded!`);
        setUploadingMedia(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to upload file");
      setUploadingMedia(false);
    }
  };

  const handleCreateExercise = () => {
    if (!newExercise.name.trim()) {
      toast.error("Please enter an exercise name");
      return;
    }
    createExercise.mutate({
      name: newExercise.name,
      description: newExercise.description || undefined,
      category: newExercise.category as any,
      imageUrl: newExercise.imageUrl || undefined,
      videoUrl: newExercise.videoUrl || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="px-4 pt-4 pb-4 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-foreground flex-1">Exercise Library</h1>
        <Button size="icon" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-5 h-5" />
        </Button>
      </header>

      {/* Search & Filter */}
      <div className="px-4 pb-4 space-y-3">
        <div className="relative">
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

        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="flex-1">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline"
            onClick={() => syncExercises.mutate()}
            disabled={syncExercises.isPending}
          >
            {syncExercises.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Sync Library"
            )}
          </Button>
        </div>
      </div>

      {/* Exercise List */}
      <main className="px-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredExercises.length === 0 ? (
          <Card className="p-8 bg-card border-border text-center">
            <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Exercises Found</h3>
            <p className="text-muted-foreground mb-6">
              {exercises?.length === 0 
                ? "Load the exercise library or create your own exercises"
                : "Try adjusting your search or filters"}
            </p>
            {exercises?.length === 0 && (
              <div className="flex gap-3 justify-center">
                <Button 
                  variant="outline"
                  onClick={() => syncExercises.mutate()}
                  disabled={syncExercises.isPending}
                >
                  {syncExercises.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Load Library
                </Button>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Custom
                </Button>
              </div>
            )}
            {searchQuery && exercises && exercises.length > 0 && (
              <Button 
                onClick={() => {
                  setQuickCreateName(searchQuery);
                  setShowCreateDialog(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create "{searchQuery}"
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredExercises.map((exercise) => (
              <Card 
                key={exercise.id}
                className="p-3 bg-card border-border cursor-pointer card-hover"
                onClick={() => setShowExerciseDetail(exercise.id)}
              >
                <div className="flex items-center gap-3">
                  {exercise.imageUrl ? (
                    <img 
                      src={exercise.imageUrl}
                      alt={exercise.name}
                      className="w-14 h-14 rounded-lg object-cover bg-secondary"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center">
                      <span className="text-2xl">💪</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{exercise.name}</h4>
                    <p className="text-xs text-muted-foreground capitalize">
                      {exercise.category.replace("_", " & ")}
                      {exercise.isCustom && " • Custom"}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around py-2 max-w-md mx-auto">
          <Link href="/">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2 text-muted-foreground">
              <Dumbbell className="w-5 h-5" />
              <span className="text-xs">Home</span>
            </Button>
          </Link>
          <Link href="/workouts">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2 text-muted-foreground">
              <Target className="w-5 h-5" />
              <span className="text-xs">Workouts</span>
            </Button>
          </Link>
          <Link href="/history">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2 text-muted-foreground">
              <History className="w-5 h-5" />
              <span className="text-xs">History</span>
            </Button>
          </Link>
        </div>
      </nav>

      {/* Create Exercise Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-card border-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Create Custom Exercise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Exercise Name</Label>
              <Input
                placeholder="e.g., Bulgarian Split Squat"
                value={newExercise.name}
                onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={newExercise.category} 
                onValueChange={(v) => setNewExercise({ ...newExercise, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="How to perform this exercise..."
                value={newExercise.description}
                onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Image/GIF (optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'image');
                  }}
                  disabled={uploadingMedia}
                  className="flex-1"
                />
                {newExercise.imageUrl && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setNewExercise({ ...newExercise, imageUrl: "" })}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {newExercise.imageUrl && (
                <img src={newExercise.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
              )}
              <Input
                placeholder="Or paste URL: https://..."
                value={newExercise.imageUrl}
                onChange={(e) => setNewExercise({ ...newExercise, imageUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Video (optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'video');
                  }}
                  disabled={uploadingMedia}
                  className="flex-1"
                />
                {newExercise.videoUrl && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setNewExercise({ ...newExercise, videoUrl: "" })}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <Input
                placeholder="Or paste URL: https://..."
                value={newExercise.videoUrl}
                onChange={(e) => setNewExercise({ ...newExercise, videoUrl: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateExercise} disabled={createExercise.isPending}>
              {createExercise.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exercise Detail Sheet */}
      <Sheet open={!!showExerciseDetail} onOpenChange={() => setShowExerciseDetail(null)}>
        <SheetContent side="bottom" className="h-[70vh] bg-background">
          {selectedExercise && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle>{selectedExercise.name}</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-4 overflow-y-auto max-h-[calc(70vh-100px)]">
                {selectedExercise.imageUrl && (
                  <img 
                    src={selectedExercise.imageUrl}
                    alt={selectedExercise.name}
                    className="w-full h-48 rounded-xl object-cover bg-secondary"
                  />
                )}

                {selectedExercise.videoUrl && (
                  <div className="aspect-video rounded-xl overflow-hidden bg-secondary">
                    <video 
                      src={selectedExercise.videoUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="text-foreground capitalize">
                    {selectedExercise.category.replace("_", " & ")}
                  </p>
                </div>

                {selectedExercise.muscleGroups && selectedExercise.muscleGroups.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Muscles</Label>
                    <p className="text-foreground">
                      {(selectedExercise.muscleGroups as string[]).join(", ")}
                    </p>
                  </div>
                )}

                {selectedExercise.equipment && (
                  <div>
                    <Label className="text-muted-foreground">Equipment</Label>
                    <p className="text-foreground">{selectedExercise.equipment}</p>
                  </div>
                )}

                {selectedExercise.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-foreground text-sm">{selectedExercise.description}</p>
                  </div>
                )}

                {selectedExercise.isCustom && (
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => {
                      if (confirm("Delete this exercise?")) {
                        deleteExercise.mutate({ id: selectedExercise.id });
                        setShowExerciseDetail(null);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Exercise
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
