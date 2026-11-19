import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const MIN_PASSWORD_LENGTH = 10;

export default function Login() {
  const { signIn, setup, needsSetup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // A setup link carries the one-time code as ?setup=...
  const [code, setCode] = useState(() => new URLSearchParams(window.location.search).get("setup") ?? "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (needsSetup && !code)) {
      toast.error(needsSetup ? "Enter the setup code, an email and a password" : "Please enter email and password");
      return;
    }
    if (needsSetup && password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    setIsLoading(true);
    try {
      if (needsSetup) {
        await setup(code.trim(), email, password);
        window.history.replaceState(null, "", "/");
        toast.success("Account created");
      } else {
        await signIn(email, password);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">GetShitDone</h1>
          <p className="text-sm text-muted-foreground">
            {needsSetup ? "Create the owner account for this board" : "Sign in to your account"}
          </p>
        </div>

        <div className="space-y-4">
          {needsSetup && (
            <div className="space-y-2">
              <Label htmlFor="setup-code">Setup code</Label>
              <Input
                id="setup-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                placeholder="One-time code"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={needsSetup ? "new-password" : "current-password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {needsSetup && (
              <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD_LENGTH} characters.</p>
            )}
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "..." : needsSetup ? "Create account" : "Sign In"}
          </Button>
        </div>
      </form>
    </div>
  );
}
