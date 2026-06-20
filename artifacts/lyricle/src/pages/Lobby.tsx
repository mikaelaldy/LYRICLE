import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Trophy, Calendar, Coins, Play, Plus, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Quest {
  id: number;
  questId: string;
  label: string;
  targetValue: number;
  currentValue: number;
  completed: boolean;
  claimed: boolean;
  pointsReward: number;
}

interface Duel {
  id: string;
  creatorName: string;
  wager: number;
  puzzleType: string;
}

export default function Lobby() {
  const { user, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const [points, setPoints] = useState(0);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(true);

  const getMilestoneInfo = (pts: number) => {
    if (pts < 1000) return { title: "Street Busker", icon: "🎤", next: 1000 };
    if (pts < 5000) return { title: "Club Opening Act", icon: "🎸", next: 5000 };
    if (pts < 10000) return { title: "Theater Headliner", icon: "🎟️", next: 10000 };
    if (pts < 25000) return { title: "Stadium Tour Headliner", icon: "🏟️", next: 25000 };
    return { title: "World Arena Legend", icon: "🌟", next: 999999 };
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setLocation("/sign-in");
      return;
    }

    const loadLobbyData = async () => {
      try {
        setLoading(true);
        const [ptsRes, qRes, dRes] = await Promise.all([
          fetch("/api/users/me/points").then((r) => r.json()),
          fetch("/api/quests/daily").then((r) => r.json()),
          fetch("/api/duels/public").then((r) => r.json()),
        ]);

        setPoints(ptsRes.points ?? 0);
        setQuests(qRes.quests ?? []);
        setDuels(dRes.duels ?? []);
      } catch {
        toast({ title: "Failed to load lobby", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadLobbyData();
  }, [user, isLoaded]);

  const claimQuest = async (id: number) => {
    try {
      const res = await fetch(`/api/quests/${id}/claim`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPoints((prev) => prev + data.claimedReward);
        setQuests((prev) =>
          prev.map((q) => (q.id === id ? { ...q, claimed: true, completed: true } : q))
        );
        toast({ title: "Points claimed!", description: `+${data.claimedReward} points added.` });
      } else {
        toast({ title: data.error || "Claim failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Server error", variant: "destructive" });
    }
  };

  const playDuel = async (id: string) => {
    setLocation(`/duel/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const milestone = getMilestoneInfo(points);
  const progressPercent = Math.min(100, Math.round((points / milestone.next) * 100));

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        
        {/* Milestone Profile Board */}
        <section className="bg-card border border-border rounded-3xl p-6 shadow-xl mb-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-4xl shadow-inner border border-border">
              {milestone.icon}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <span className="text-xs font-bold text-primary uppercase tracking-widest font-mono">Current Career Stage</span>
              <h2 className="text-3xl font-serif font-black tracking-tight text-balance mt-0.5">{milestone.title}</h2>
              <div className="mt-3 flex items-center justify-center sm:justify-start gap-4">
                <div className="flex items-center gap-1">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="font-mono font-black tabular-nums">{points.toLocaleString()} pts</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Next stage at <span className="font-mono font-bold tabular-nums">{milestone.next.toLocaleString()}</span> pts
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-4 w-full bg-secondary/80 rounded-full h-2 overflow-hidden border border-border">
                <motion.div
                  className="bg-primary h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Quests Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold tracking-tight text-balance">Daily Gig Board</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quests.map((q) => {
              const isDone = q.completed || q.currentValue >= q.targetValue;
              return (
                <div key={q.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between shadow-md">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase text-primary tracking-wider">Daily Quest</span>
                      <span className="text-xs font-mono font-bold text-amber-500 flex items-center gap-0.5">
                        +{q.pointsReward} pts
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-snug mb-3">
                      {q.label}
                    </p>
                  </div>
                  <div className="mt-4">
                    {q.claimed ? (
                      <span className="text-xs text-green-600 font-bold block text-center py-2 bg-green-500/10 rounded-full border border-green-500/20">
                        Claimed
                      </span>
                    ) : isDone ? (
                      <Button
                        onClick={() => claimQuest(q.id)}
                        className="w-full font-bold uppercase text-xs tracking-wider rounded-full h-9"
                      >
                        Claim Reward
                      </Button>
                    ) : (
                      <span className="text-xs font-mono text-muted-foreground block text-center py-2 bg-secondary rounded-full">
                        Progress: <span className="tabular-nums font-bold">{q.currentValue}/{q.targetValue}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Duels Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-bold tracking-tight text-balance">Live PvP Wagers</h3>
            </div>
          </div>
          {duels.length === 0 ? (
            <div className="border border-dashed border-border rounded-3xl p-8 text-center bg-card">
              <p className="text-muted-foreground text-sm">No public duels currently listed.</p>
              <Button onClick={() => setLocation("/game")} className="mt-4 rounded-full font-bold uppercase text-xs tracking-widest gap-2">
                <Plus className="w-4 h-4" /> Challenge a Friend
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {duels.map((d) => (
                <div key={d.id} className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between shadow-md">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase text-primary tracking-wider">Active Duel</span>
                    <h4 className="font-serif font-black text-lg truncate mt-0.5">{d.creatorName}’s Challenge</h4>
                    <p className="text-xs text-muted-foreground">Wager: <span className="font-mono font-bold text-amber-500 tabular-nums">{d.wager} pts</span></p>
                  </div>
                  <Button onClick={() => playDuel(d.id)} className="rounded-full h-10 gap-1.5 font-bold uppercase text-xs tracking-wider px-5">
                    <Play className="w-3.5 h-3.5 fill-current" /> Accept
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
