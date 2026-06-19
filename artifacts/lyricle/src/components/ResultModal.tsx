import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Trophy, BarChart2, Clock } from "lucide-react";
import { useGetPuzzleAnswer, useGetPlayerStreak } from "@workspace/api-client-react";
import { getGetPuzzleAnswerQueryKey, getGetPlayerStreakQueryKey } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { DailyState } from "@/lib/storage";

interface ResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: DailyState;
  onOpenStats: () => void;
  onOpenLeaderboard: () => void;
}

export default function ResultModal({ open, onOpenChange, state, onOpenStats, onOpenLeaderboard }: ResultModalProps) {
  const { data: answer } = useGetPuzzleAnswer({ query: { enabled: open, queryKey: getGetPuzzleAnswerQueryKey() } });
  const { data: streak } = useGetPlayerStreak(localStorage.getItem("lyricle_player") ? JSON.parse(localStorage.getItem("lyricle_player")!).playerId : "", { query: { enabled: open, queryKey: getGetPlayerStreakQueryKey(localStorage.getItem("lyricle_player") ? JSON.parse(localStorage.getItem("lyricle_player")!).playerId : "") } });

  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!open) return;

    const updateTimer = () => {
      const now = new Date();
      const next = new Date();
      next.setUTCHours(24, 0, 0, 0);
      const diff = next.getTime() - now.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const handleShare = () => {
    const squares = state.guesses.map(g => g.correct ? "🟩" : "⬛").join("");
    const skips = Array(5 - state.guesses.length).fill("🟨").join("");
    
    const text = `🎵 Lyricle #${state.puzzleNumber}\n${state.won ? "✅" : "❌"} ${state.won ? `Got it in ${state.guesses.length}/5!` : "Didn't get it"}\n${squares}${skips}\nNext puzzle in ${timeLeft}\n${window.location.origin}`;
    
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!", description: "Share your result with friends." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-3xl font-serif text-center mb-2">
            {state.won ? "Brilliant!" : "Next time..."}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {state.won ? `You guessed the song in ${state.guesses.length} attempts.` : "You've used all your guesses for today."}
          </DialogDescription>
        </DialogHeader>

        {answer && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-48 h-48 rounded-xl overflow-hidden shadow-2xl border border-border">
              <img src={answer.albumArtUrl || ""} alt={answer.title} className="w-full h-full object-cover" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-serif font-bold text-primary">{answer.title}</h3>
              <p className="text-lg text-muted-foreground">{answer.artist}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/50">
          <div className="text-center">
            <div className="text-2xl font-mono font-bold">{streak?.currentStreak || 0}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Current Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono font-bold text-primary">{timeLeft}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Next Puzzle</div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button onClick={handleShare} className="flex-1 gap-2 font-bold" data-testid="button-share">
            <Copy className="w-4 h-4" /> Share
          </Button>
          <Button variant="outline" onClick={onOpenLeaderboard} className="flex-1 gap-2" data-testid="button-results-leaderboard">
            <Trophy className="w-4 h-4" /> Leaderboard
          </Button>
          <Button variant="outline" onClick={onOpenStats} className="flex-1 gap-2" data-testid="button-results-stats">
            <BarChart2 className="w-4 h-4" /> Stats
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
