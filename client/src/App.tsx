import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Workouts from "./pages/Workouts";
import WorkoutBuilder from "./pages/WorkoutBuilder";
import ActiveWorkout from "./pages/ActiveWorkout";
import Exercises from "./pages/Exercises";
import History from "./pages/History";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/workouts" component={Workouts} />
      <Route path="/workouts/new" component={WorkoutBuilder} />
      <Route path="/workouts/:id" component={WorkoutBuilder} />
      <Route path="/workout/:id/start" component={ActiveWorkout} />
      <Route path="/exercises" component={Exercises} />
      <Route path="/history" component={History} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster 
            position="top-center" 
            toastOptions={{
              style: {
                background: 'oklch(0.16 0.015 270)',
                border: '1px solid oklch(0.26 0.015 270)',
                color: 'oklch(0.95 0.01 270)',
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
