import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  ChevronLeft,
  Dumbbell,
  Target,
  History as HistoryIcon,
  Loader2,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const splitLabels: Record<string, string> = {
  arms: "Arms",
  chest_back: "Chest & Back",
  legs: "Legs",
  hiit: "HIIT",
};

export default function History() {
  const { isAuthenticated } = useAuth();
  const [selectedSession, setSelectedSession] = useState<number | null>(null);

  const { data: sessions, isLoading } = trpc.sessions.list.useQuery(
    { limit: 50 },
    { enabled: isAuthenticated }
  );

  const { data: sessionDetail } = trpc.sessions.getById.useQuery(
    { id: selectedSession! },
    { enabled: !!selectedSession && isAuthenticated }
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (start: Date, end: Date | null) => {
    if (!end) return "In progress";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  // Group sessions by date
  const groupedSessions: Record<string, typeof sessions> = {};
  sessions?.forEach((session) => {
    const dateKey = new Date(session.session.startedAt).toDateString();
    if (!groupedSessions[dateKey]) {
      groupedSessions[dateKey] = [];
    }
    groupedSessions[dateKey]!.push(session);
  });

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="px-4 pt-4 pb-4 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-foreground flex-1">Workout History</h1>
      </header>

      {/* History List */}
      <main className="px-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <Card className="p-8 bg-card border-border text-center">
            <HistoryIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Workout History</h3>
            <p className="text-muted-foreground mb-6">
              Complete your first workout to see it here
            </p>
            <Link href="/workouts">
              <Button>
                <Dumbbell className="w-4 h-4 mr-2" />
                Start a Workout
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSessions).map(([dateKey, daySessions]) => (
              <div key={dateKey}>
                <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(new Date(dateKey))}
                </h2>
                <div className="space-y-2">
                  {daySessions?.map((item) => (
                    <Card 
                      key={item.session.id}
                      className="p-4 bg-card border-border cursor-pointer card-hover"
                      onClick={() => setSelectedSession(item.session.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {item.workout.name}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(item.session.startedAt)}
                            </span>
                            <span>
                              {formatDuration(item.session.startedAt, item.session.completedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.session.completedAt ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <span className="text-xs text-amber-500 font-medium">In Progress</span>
                          )}
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
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
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2 text-primary">
              <HistoryIcon className="w-5 h-5" />
              <span className="text-xs">History</span>
            </Button>
          </Link>
        </div>
      </nav>

      {/* Session Detail Sheet */}
      <Sheet open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <SheetContent side="bottom" className="h-[80vh] bg-background">
          {sessionDetail && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle>{sessionDetail.workout.name}</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-4 overflow-y-auto max-h-[calc(80vh-100px)]">
                {/* Session Info */}
                <Card className="p-4 bg-card border-border">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-foreground font-medium">
                        {formatDate(sessionDetail.session.startedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="text-foreground font-medium">
                        {formatDuration(sessionDetail.session.startedAt, sessionDetail.session.completedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Split</p>
                      <p className="text-foreground font-medium">
                        {splitLabels[sessionDetail.workout.splitCategory]}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className={`font-medium ${sessionDetail.session.completedAt ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {sessionDetail.session.completedAt ? 'Completed' : 'In Progress'}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Exercise Logs */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Exercises</h3>
                  <div className="space-y-3">
                    {/* Group logs by exercise */}
                    {(() => {
                      const exerciseGroups: Record<number, typeof sessionDetail.logs> = {};
                      sessionDetail.logs.forEach((log) => {
                        if (!exerciseGroups[log.log.exerciseId]) {
                          exerciseGroups[log.log.exerciseId] = [];
                        }
                        exerciseGroups[log.log.exerciseId]!.push(log);
                      });

                      return Object.entries(exerciseGroups).map(([exerciseId, logs]) => (
                        <Card key={exerciseId} className="p-4 bg-card border-border">
                          <h4 className="font-medium text-foreground mb-3">
                            {logs[0]?.exercise.name}
                          </h4>
                          <div className="space-y-2">
                            {logs.map((log, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Set {log.log.setNumber}</span>
                                <span className="text-foreground">
                                  {log.log.skipped ? (
                                    <span className="text-muted-foreground">Skipped</span>
                                  ) : (
                                    `${log.log.weight || "—"} lbs × ${log.log.reps || "—"}`
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </Card>
                      ));
                    })()}
                  </div>
                </div>

                {sessionDetail.session.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
                    <Card className="p-4 bg-card border-border">
                      <p className="text-foreground text-sm">{sessionDetail.session.notes}</p>
                    </Card>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
