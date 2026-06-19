import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGetMyStats, useGetPlayerStreak } from "@workspace/api-client-react";
import { getGetMyStatsQueryKey, getGetPlayerStreakQueryKey } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { useLocation } from "wouter";

interface StatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StatsModal({ open, onOpenChange }: StatsModalProps) {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const playerId = localStorage.getItem("lyricle_player") ? JSON.parse(localStorage.getItem("lyricle_player")!).playerId : "";

  const { data: clerkStats } = useGetMyStats({ query: { enabled: !!user && open, queryKey: getGetMyStatsQueryKey() } });
  const { data: anonStats } = useGetPlayerStreak(playerId, { query: { enabled: !user && open, queryKey: getGetPlayerStreakQueryKey(playerId) } });

  const stats = user ? clerkStats : anonStats;

  // Mock distribution if not available in anonStats
  const distribution = user ? clerkStats?.clueDistribution : [
    { cluesUsed: 1, count: 0 },
    { cluesUsed: 2, count: 0 },
    { cluesUsed: 3, count: 0 },
    { cluesUsed: 4, count: 0 },
    { cluesUsed: 5, count: 0 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-center uppercase tracking-tighter">Statistics</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2 py-6">
          <StatBox value={stats?.totalPlays || 0} label="Played" />
          <StatBox value={Math.round((stats?.winCount || 0) / (stats?.totalPlays || 1) * 100)} label="Win %" />
          <StatBox value={stats?.currentStreak || 0} label="Current Streak" />
          <StatBox value={stats?.maxStreak || 0} label="Max Streak" />
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground text-center">Guess Distribution</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="cluesUsed" type="category" stroke="#a09880" fontSize={12} width={20} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border p-2 text-xs font-mono">
                          {payload[0].value} games
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {distribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.count > 0 ? "#e8d44d" : "#2a2820"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {!user && (
          <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20 text-center space-y-3">
            <p className="text-sm text-primary-foreground/80">Sign in to sync your stats across all devices!</p>
            <Button size="sm" className="w-full font-bold" onClick={() => setLocation("/sign-in")} data-testid="button-stats-signin">
              Sign In
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ value, label }: { value: number | string, label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-3xl font-mono font-bold">{value}</div>
      <div className="text-[10px] uppercase text-center leading-tight text-muted-foreground tracking-tighter">{label}</div>
    </div>
  );
}
