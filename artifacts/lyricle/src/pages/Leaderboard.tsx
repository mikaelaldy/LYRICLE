import { useState } from "react";
import {
  useGetLeaderboard,
  useGetPuzzleStats,
  useGetStreakLeaderboard,
} from "@workspace/api-client-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Trophy,
  Users,
  CheckCircle2,
  XCircle,
  Flame,
  Star,
} from "lucide-react";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";

type Tab = "streak" | "today";

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<Tab>("streak");

  const { data: leaderboard, isLoading: leaderboardLoading } =
    useGetLeaderboard();
  const { data: streakLeaderboard, isLoading: streakLoading } =
    useGetStreakLeaderboard();
  const { data: stats } = useGetPuzzleStats();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />

      <main className="container max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-serif font-black tracking-tighter uppercase italic">
              The Charts
            </h1>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mt-1">
              Top Players • Global Performance
            </p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-card border border-border p-6 rounded-xl flex flex-col items-center justify-center">
              <Users className="w-6 h-6 text-primary mb-2" />
              <div className="text-3xl font-mono font-bold">
                {stats.totalPlays}
              </div>
              <div className="text-[10px] uppercase text-muted-foreground tracking-widest">
                Plays
              </div>
            </div>
            <div className="bg-card border border-border p-6 rounded-xl flex flex-col items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-500 mb-2" />
              <div className="text-3xl font-mono font-bold">
                {Math.round(stats.winRate * 100)}%
              </div>
              <div className="text-[10px] uppercase text-muted-foreground tracking-widest">
                Win Rate
              </div>
            </div>
            <div className="bg-card border border-border p-6 rounded-xl flex flex-col items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-500 mb-2" />
              <div className="text-3xl font-mono font-bold">{stats.winCount}</div>
              <div className="text-[10px] uppercase text-muted-foreground tracking-widest">
                Victories
              </div>
            </div>
          </div>
        )}

        {stats?.clueDistribution && (
          <div className="bg-card border border-border p-6 rounded-xl mb-12">
            <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6 text-center">
              Global Guess Distribution
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.clueDistribution} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="cluesUsed"
                    type="category"
                    stroke="#a09880"
                    fontSize={12}
                    width={20}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border border-border p-2 text-xs font-mono shadow-xl">
                            {payload[0].value} players
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stats.clueDistribution.map((_entry: unknown, index: number) => (
                      <Cell key={`cell-${index}`} fill="#e8d44d" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 bg-secondary/30 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab("streak")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-mono uppercase tracking-widest transition-colors",
              activeTab === "streak"
                ? "bg-primary text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Flame className="w-3.5 h-3.5" />
            Streak Leaders
          </button>
          <button
            onClick={() => setActiveTab("today")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-mono uppercase tracking-widest transition-colors",
              activeTab === "today"
                ? "bg-primary text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Star className="w-3.5 h-3.5" />
            Today's Top
          </button>
        </div>

        {/* Streak leaderboard */}
        {activeTab === "streak" && (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border bg-secondary/30">
              <h2 className="font-serif text-xl font-bold italic">
                Streak Leaders
              </h2>
              <p className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-widest">
                Top 20 · Active this week · Ranked by current streak
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans">
                <thead>
                  <tr className="bg-black/20 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                    <th className="px-6 py-4 font-medium">Rank</th>
                    <th className="px-6 py-4 font-medium">Player</th>
                    <th className="px-6 py-4 font-medium text-center">
                      🔥 Streak
                    </th>
                    <th className="px-6 py-4 font-medium text-right">Wins</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {streakLoading ? (
                    Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td
                            colSpan={4}
                            className="px-6 py-6 bg-secondary/10"
                          />
                        </tr>
                      ))
                  ) : streakLeaderboard && streakLeaderboard.length > 0 ? (
                    streakLeaderboard.map((entry) => (
                      <tr
                        key={entry.rank}
                        className="group hover:bg-secondary/20 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono font-bold text-primary">
                          {entry.rank === 1 ? (
                            <span title="Top streak">🥇</span>
                          ) : entry.rank === 2 ? (
                            <span title="2nd place">🥈</span>
                          ) : entry.rank === 3 ? (
                            <span title="3rd place">🥉</span>
                          ) : (
                            `#${entry.rank}`
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-foreground">
                            {entry.displayName}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-mono font-bold text-primary text-lg">
                            {entry.currentStreak}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1 font-mono">
                            day{entry.currentStreak !== 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm text-muted-foreground">
                          {entry.winCount}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-muted-foreground text-sm font-mono"
                      >
                        No active streaks this week yet. Play today to get on the board!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Today's leaderboard */}
        {activeTab === "today" && (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border bg-secondary/30">
              <h2 className="font-serif text-xl font-bold italic">
                Today's Top Performers
              </h2>
              <p className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-widest">
                Ranked by fewest clues · fastest solve
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans">
                <thead>
                  <tr className="bg-black/20 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                    <th className="px-6 py-4 font-medium">Rank</th>
                    <th className="px-6 py-4 font-medium">Player</th>
                    <th className="px-6 py-4 font-medium">Effort</th>
                    <th className="px-6 py-4 font-medium text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {leaderboardLoading ? (
                    Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td
                            colSpan={4}
                            className="px-6 py-6 bg-secondary/10"
                          />
                        </tr>
                      ))
                  ) : leaderboard?.map((entry) => (
                    <tr
                      key={entry.rank}
                      className="group hover:bg-secondary/20 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-primary">
                        #{entry.rank}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {entry.displayName}
                          </span>
                          {entry.won ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500 opacity-50" />
                          ) : (
                            <XCircle className="w-3 h-3 text-destructive opacity-50" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {Array(5)
                            .fill(0)
                            .map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  i < entry.cluesUsed
                                    ? entry.won &&
                                      i === entry.cluesUsed - 1
                                      ? "bg-green-500"
                                      : "bg-primary"
                                    : "bg-border"
                                )}
                              />
                            ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-muted-foreground">
                        {entry.solveTimeMs
                          ? `${(entry.solveTimeMs / 1000).toFixed(1)}s`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
