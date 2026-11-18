import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Login from "./pages/Login";
import { useAuth } from "./hooks/useAuth";

// Pages load on demand so the sign-in screen stays light.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function FullScreenMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenMessage>Loading...</FullScreenMessage>;
  if (!user) return <Login />;
  return <>{children}</>;
}

/** /login for signed-out visitors; signed-in ones go straight to the board. */
function LoginRoute() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenMessage>Loading...</FullScreenMessage>;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<FullScreenMessage>Loading...</FullScreenMessage>}>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/" element={<AuthGate><Dashboard /></AuthGate>} />
              <Route path="/projects" element={<AuthGate><Projects /></AuthGate>} />
              <Route path="/projects/:projectId" element={<AuthGate><ProjectDetail /></AuthGate>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
