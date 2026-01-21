import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Dumbbell, 
  History, 
  Plus, 
  ChevronRight,
  Flame,
  Target,
  Loader2
} from "lucide-react";
import { Link } from "wouter";

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

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: workouts, isLoading: workoutsLoading } = trpc.workouts.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: sessions } = trpc.sessions.list.useQuery(
    { limit: 5 },
    { enabled: isAuthenticated }
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background safe-area-top safe-area-bottom">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
            <Dumbbell className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Workout Tracker
          </h1>
          <p className="text-muted-foreground mb-8 max-w-xs">
            Build custom workouts, track your progress, and crush your fitness goals.
          </p>
          <Button 
            size="lg" 
            className="w-full max-w-xs touch-target text-base font-semibold"
            onClick={() => window.location.href = getLoginUrl()}
          >
            Get Started
          </Button>
        </div>
      </div>
    );
  }

  const recentWorkouts = workouts?.slice(0, 3) || [];
  const totalWorkouts = sessions?.length || 0;

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="text-2xl font-bold text-foreground">
              {user?.name?.split(' ')[0] || 'Athlete'}
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-semibold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Flame className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalWorkouts}</p>
                <p className="text-xs text-muted-foreground">Workouts</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{workouts?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Routines</p>
              </div>
            </div>
          </Card>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-24">
        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3">Quick Start</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/workouts/new">
              <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 card-hover cursor-pointer">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-3">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">New Workout</span>
                </div>
              </Card>
            </Link>
            <Link href="/exercises">
              <Card className="p-4 bg-card border-border card-hover cursor-pointer">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
                    <Dumbbell className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Exercises</span>
                </div>
              </Card>
            </Link>
          </div>
        </section>

        {/* My Workouts */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">My Workouts</h2>
            <Link href="/workouts">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {workoutsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentWorkouts.length === 0 ? (
            <Card className="p-6 bg-card border-border text-center">
              <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No workouts yet</p>
              <Link href="/workouts/new">
                <Button size="sm">Create Your First Workout</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentWorkouts.map((workout) => (
                <Link key={workout.id} href={`/workout/${workout.id}/start`}>
                  <Card 
                    className={`p-4 bg-gradient-to-r ${splitColors[workout.splitCategory]} border card-hover cursor-pointer`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{workout.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {splitLabels[workout.splitCategory]}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Activity */}
        {sessions && sessions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
              <Link href="/history">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {sessions.slice(0, 3).map((item) => (
                <Card key={item.session.id} className="p-3 bg-card border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <History className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {item.workout.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.session.startedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {item.session.completedAt && (
                      <span className="text-xs text-emerald-500 font-medium">Completed</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around py-2 max-w-md mx-auto">
          <Link href="/">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2 text-primary">
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
    </div>
  );
}
