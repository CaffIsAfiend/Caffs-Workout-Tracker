import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Dumbbell,
  Target,
  History,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useState } from "react";

const splitColors: Record<string, string> = {
  arms: "from-amber-500/20 to-orange-600/20 border-amber-500/30",
  chest_back: "from-blue-500/20 to-cyan-600/20 border-blue-500/30",
  legs: "from-pink-500/20 to-rose-600/20 border-pink-500/30",
  hiit: "from-emerald-500/20 to-teal-600/20 border-emerald-500/30",
};

const splitLabels: Record<string, string> = {
  arms: "Arms",
  chest_back: "Chest & Back",
  legs: "Legs",
  hiit: "HIIT",
};

const splitFilters = [
  { value: "", label: "All" },
  { value: "arms", label: "Arms" },
  { value: "chest_back", label: "Chest & Back" },
  { value: "legs", label: "Legs" },
  { value: "hiit", label: "HIIT" },
];

export default function Workouts() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState("");
  
  const { data: workouts, isLoading, refetch } = trpc.workouts.list.useQuery(
    filter ? { splitCategory: filter } : undefined,
    { enabled: isAuthenticated }
  );

  const deleteWorkout = trpc.workouts.delete.useMutation({
    onSuccess: () => {
      toast.success("Workout deleted");
      refetch();
    },
    onError: () => {
      toast.error("Failed to delete workout");
    }
  });

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this workout?")) {
      deleteWorkout.mutate({ id });
    }
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
        <h1 className="text-xl font-bold text-foreground flex-1">My Workouts</h1>
        <Link href="/workouts/new">
          <Button size="icon" className="shrink-0">
            <Plus className="w-5 h-5" />
          </Button>
        </Link>
      </header>

      {/* Filter Tabs */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {splitFilters.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "secondary"}
              size="sm"
              onClick={() => setFilter(f.value)}
              className="shrink-0"
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Workouts List */}
      <main className="px-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : workouts?.length === 0 ? (
          <Card className="p-8 bg-card border-border text-center">
            <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Workouts Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first workout routine to get started
            </p>
            <Link href="/workouts/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Workout
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {workouts?.map((workout) => (
              <Card 
                key={workout.id}
                className={`p-4 bg-gradient-to-r ${splitColors[workout.splitCategory]} border card-hover cursor-pointer`}
                onClick={() => setLocation(`/workout/${workout.id}/start`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{workout.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {splitLabels[workout.splitCategory]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/workouts/${workout.id}`);
                        }}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => handleDelete(workout.id, e)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2 text-primary">
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
    </div>
  );
}
