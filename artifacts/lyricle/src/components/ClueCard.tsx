import { PuzzleClue } from "@workspace/api-client-react";
import { RichsyncWord } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Music, Languages, FileText, Type, Volume2 } from "lucide-react";

interface ClueCardProps {
  clue: PuzzleClue;
  index: number;
  revealed: boolean;
}

export default function ClueCard({ clue, index, revealed }: ClueCardProps) {
  const getIcon = (stage: number) => {
    switch (stage) {
      case 0: return <Music className="w-4 h-4" />;
      case 1: return <Languages className="w-4 h-4" />;
      case 2: return <FileText className="w-4 h-4" />;
      case 3: return <Type className="w-4 h-4" />;
      case 4: return <Volume2 className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full mb-6"
    >
      <div className="flex items-center gap-2 mb-3 text-primary/70 font-mono text-xs uppercase tracking-widest">
        {getIcon(index)}
        <span>Stage {index}: {clue.stageLabel}</span>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
        
        <AnimatePresence mode="wait">
          {revealed ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="relative z-10"
            >
              {index === 0 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {clue.themes?.map((theme: string) => (
                      <Badge key={theme} variant="secondary" className="bg-secondary/50 text-foreground border-border px-3 py-1 text-sm font-medium">
                        #{theme}
                      </Badge>
                    ))}
                  </div>
                  {clue.mood && (
                    <div className="text-xl font-serif italic text-muted-foreground">
                      “Feeling {clue.mood.toLowerCase()}...”
                    </div>
                  )}
                </div>
              )}

              {index === 1 && (
                <div className="space-y-2">
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">In {clue.translationLanguage}:</span>
                  <blockquote className="text-2xl font-serif leading-relaxed italic border-l-2 border-primary/30 pl-4 py-1">
                    {clue.translatedLine}
                  </blockquote>
                </div>
              )}

              {index === 2 && (
                <div className="relative">
                  <div className="absolute -left-6 top-0 h-full w-[2px] bg-gradient-to-b from-primary/50 via-transparent to-primary/50 opacity-30" />
                  <blockquote className="text-2xl font-serif leading-relaxed font-bold text-foreground py-2">
                    {clue.snippet}
                  </blockquote>
                </div>
              )}

              {index === 3 && (
                <div className="flex flex-wrap gap-x-2 gap-y-3">
                  {clue.richsyncWords?.map((wordObj: RichsyncWord, i: number) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.3 }}
                      className="text-2xl font-serif font-black tracking-tight"
                    >
                      {wordObj.word}
                    </motion.span>
                  ))}
                </div>
              )}

              {index === 4 && (
                <div className="flex flex-col gap-4">
                  {clue.albumArtUrl && (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-border mx-auto shadow-2xl">
                      <img src={clue.albumArtUrl} alt="Album Art" className="w-full h-full object-cover blur-sm opacity-50" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Music className="w-8 h-8 text-primary animate-pulse" />
                      </div>
                    </div>
                  )}
                  {clue.spotifyTrackId ? (
                    <iframe
                      src={`https://open.spotify.com/embed/track/${clue.spotifyTrackId}`}
                      width="100%"
                      height="80"
                      frameBorder="0"
                      allowTransparency={true}
                      allow="encrypted-media"
                      className="rounded-lg shadow-lg"
                    />
                  ) : clue.previewUrl ? (
                    <audio controls className="w-full h-10 mt-2 opacity-80 contrast-125">
                      <source src={clue.previewUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  ) : (
                    <div className="text-center p-4 border border-dashed border-border rounded-lg bg-black/20 text-muted-foreground italic">
                      🎵 Audio unlocked! Use your ears.
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="h-24 flex items-center justify-center border-2 border-dashed border-muted rounded-lg opacity-20">
              <span className="font-mono text-sm tracking-widest uppercase">Locked</span>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
