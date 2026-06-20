import { useClerk } from "@clerk/react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Trophy, LogOut, LogIn, PlusCircle, Coins, WifiOff } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useClerkAvailability } from "@/context/ClerkAvailabilityContext";
import { useAuthUser } from "@/context/AuthContext";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) {
  return `${basePath}/api${path}`;
}

function HeaderShell({ children }: { children: React.ReactNode }) {
  return (
    <header className="border-b border-border bg-white sticky top-0 z-50">
      <div className="container max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <img src={`${basePath}/logo.svg`} alt="Lyricle Logo" className="w-8 h-8 group-hover:scale-110 transition-transform" />
          <span className="font-serif text-2xl font-black tracking-tight text-primary">LYRICLE</span>
        </Link>
        <div className="flex items-center gap-2">
          {children}
        </div>
      </div>
    </header>
  );
}

function GuestModeHeader() {
  return (
    <HeaderShell>
      <Link href="/leaderboard">
        <Button variant="ghost" size="icon" title="Leaderboard" aria-label="Leaderboard" data-testid="button-leaderboard">
          <Trophy className="w-5 h-5" />
        </Button>
      </Link>
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium"
        title="Sign-in is temporarily unavailable"
        data-testid="signin-unavailable"
      >
        <WifiOff className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Sign in unavailable</span>
      </div>
    </HeaderShell>
  );
}

function AuthAwareHeader() {
  const { user, isLoaded } = useAuthUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const [points, setPoints] = useState<number | null>(null);

  const fetchPoints = useCallback(async () => {
    if (!user) {
      setPoints(null);
      return;
    }
    try {
      const res = await fetch(apiUrl("/users/me/points"));
      if (res.ok) {
        const data = await res.json();
        setPoints(data.points ?? null);
      }
    } catch {
      // silently ignore
    }
  }, [user]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  useEffect(() => {
    const handler = () => fetchPoints();
    window.addEventListener("lyricle:points-updated", handler);
    return () => window.removeEventListener("lyricle:points-updated", handler);
  }, [fetchPoints]);

  const handleSignOut = async () => {
    await signOut();
    setPoints(null);
    setLocation("/");
  };

  return (
    <HeaderShell>
      {isLoaded && user && points !== null && (
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-b from-amber-400 to-amber-500 text-amber-950 text-sm font-bold shadow-sm shadow-amber-500/30 ring-1 ring-amber-600/30"
          title="Your points"
          data-testid="points-badge"
        >
          <Coins className="w-4 h-4" />
          <span className="font-mono tabular-nums">{points.toLocaleString()}</span>
        </div>
      )}

      <Link href="/leaderboard">
        <Button variant="ghost" size="icon" title="Leaderboard" aria-label="Leaderboard" data-testid="button-leaderboard">
          <Trophy className="w-5 h-5" />
        </Button>
      </Link>

      {isLoaded && user && (
        <Link href="/create">
          <Button variant="ghost" size="icon" title="Create Puzzle" aria-label="Create Puzzle" data-testid="button-create">
            <PlusCircle className="w-5 h-5" />
          </Button>
        </Link>
      )}

      {isLoaded && (
        <>
          {user ? (
            <div className="flex items-center gap-3 ml-2">
              <span className="hidden sm:inline text-sm font-medium text-muted-foreground">
                {user.firstName || user.emailAddresses[0].emailAddress.split("@")[0]}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                title="Sign Out"
                aria-label="Sign Out"
                data-testid="button-signout"
              >
                <LogOut className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/sign-in")}
              title="Sign In"
              aria-label="Sign In"
              data-testid="button-signin"
            >
              <LogIn className="w-5 h-5" />
            </Button>
          )}
        </>
      )}
    </HeaderShell>
  );
}

export default function Header() {
  const { clerkAvailable } = useClerkAvailability();

  if (!clerkAvailable) {
    return <GuestModeHeader />;
  }

  return <AuthAwareHeader />;
}
