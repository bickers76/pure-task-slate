import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useAppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ApiKey, NewApiKey, keysRepo } from "@/lib/repositories/keysRepo";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const BOT_ENDPOINT = `${window.location.origin}/api/bot`;

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Couldn't copy. Select the text and copy it manually.");
  }
}

function ApiKeysSection() {
  const queryClient = useQueryClient();
  const { data: keys = [], isLoading } = useQuery({ queryKey: ["keys"], queryFn: keysRepo.list });
  const [name, setName] = useState("");
  const [created, setCreated] = useState<NewApiKey | null>(null);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["keys"] });
  const createKey = useMutation({
    mutationFn: (keyName: string) => keysRepo.create(keyName),
    onSuccess: (key) => {
      setCreated(key);
      setName("");
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });
  const revokeKey = useMutation({
    mutationFn: (id: string) => keysRepo.revoke(id),
    onSuccess: () => {
      toast.success("Key revoked");
      refresh();
    },
    onError: () => toast.error("Failed to revoke key"),
  });

  return (
    <Card className="space-y-4 p-5">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound className="h-4 w-4" />
          Bot API keys
        </h2>
        <p className="text-sm text-muted-foreground">
          Your agent uses a key to read and update the board. Each key is shown once, when you create it.
        </p>
      </div>

      <div className="space-y-1">
        <Label>Endpoint</Label>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-sm">POST {BOT_ENDPOINT}</code>
          <Button variant="outline" size="icon" onClick={() => copy(BOT_ENDPOINT, "Endpoint")} title="Copy endpoint">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {created && (
        <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-sm font-medium">Copy “{created.name}” now. It won't be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-md bg-background px-3 py-2 text-sm">{created.key}</code>
            <Button variant="outline" size="icon" onClick={() => copy(created.key, "Key")} title="Copy key">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCreated(null)}>
            I've saved it
          </Button>
        </div>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) createKey.mutate(name.trim());
        }}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="key-name">New key</Label>
          <Input
            id="key-name"
            placeholder="Name, e.g. Mervbot"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={!name.trim() || createKey.isPending}>
          {createKey.isPending ? "Creating..." : "Create key"}
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading keys...</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">No keys yet. The bot API is closed until you create one.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {keys.map((key) => (
            <li key={key.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{key.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  <code>{key.key_hint}</code>
                  {" · "}
                  {key.last_used_at
                    ? `last used ${formatDistanceToNow(parseISO(key.last_used_at), { addSuffix: true })}`
                    : "never used"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => setRevoking(key)}
                title="Revoke key"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!revoking} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke “{revoking?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Anything using this key stops working immediately. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (revoking) revokeKey.mutate(revoking.id);
                setRevoking(null);
              }}
            >
              Revoke key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function PasswordSection() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const change = useMutation({
    mutationFn: () => api("/auth/password", { method: "POST", body: { current, next } }),
    onSuccess: () => {
      toast.success("Password changed. Other devices have been signed out.");
      setCurrent("");
      setNext("");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Card className="space-y-4 p-5">
      <div className="space-y-1">
        <h2 className="font-semibold">Account</h2>
        <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          change.mutate();
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">At least 10 characters.</p>
        </div>
        <Button type="submit" variant="outline" disabled={!current || next.length < 10 || change.isPending}>
          {change.isPending ? "Saving..." : "Change password"}
        </Button>
      </form>
    </Card>
  );
}

function SettingsContent() {
  const { openMobileMenu } = useAppShell();
  return (
    <>
      <TopBar title="Settings" onMenuClick={openMobileMenu} />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl space-y-4 p-4 md:p-6">
          <ApiKeysSection />
          <PasswordSection />
        </div>
      </div>
    </>
  );
}

export default function Settings() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  );
}
