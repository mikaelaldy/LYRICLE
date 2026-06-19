import { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AudioPlayerProps {
  src: string;
}

export default function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => { setDuration(audio.duration); setLoaded(true); };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    };
    const onEnded = () => setPlaying(false);
    const onError = () => setError(true);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setError(true));
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = pct * duration;
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const bars = Array.from({ length: 28 });

  if (error) {
    return (
      <div className="flex items-center gap-2 justify-center p-4 border border-dashed border-border rounded-lg bg-black/20 text-muted-foreground italic text-sm">
        <Volume2 className="w-4 h-4 opacity-50" />
        <span>Preview not available</span>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl bg-black/30 border border-border p-4 flex flex-col gap-3">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          disabled={!loaded}
          className="flex-shrink-0 w-11 h-11 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          aria-label={playing ? "Pause" : "Play"}
        >
          <AnimatePresence mode="wait" initial={false}>
            {playing ? (
              <motion.span
                key="pause"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Pause className="w-5 h-5 text-primary-foreground fill-primary-foreground" />
              </motion.span>
            ) : (
              <motion.span
                key="play"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Play className="w-5 h-5 text-primary-foreground fill-primary-foreground ml-0.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="flex items-end gap-[3px] h-8">
            {bars.map((_, i) => {
              const base = 0.3 + 0.7 * Math.abs(Math.sin(i * 0.8));
              return (
                <motion.div
                  key={i}
                  className="flex-1 rounded-full bg-primary/40"
                  style={{ originY: 1 }}
                  animate={
                    playing
                      ? {
                          scaleY: [base, base * 0.4 + 0.1, base, base * 1.3, base],
                          opacity: [0.4, 0.9, 0.6, 1, 0.5],
                        }
                      : { scaleY: base * 0.4 + 0.05, opacity: 0.25 }
                  }
                  transition={
                    playing
                      ? {
                          duration: 0.6 + (i % 5) * 0.12,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: (i % 7) * 0.07,
                        }
                      : { duration: 0.3 }
                  }
                />
              );
            })}
          </div>

          <div
            className="relative w-full h-1.5 rounded-full bg-white/10 cursor-pointer group"
            onClick={seek}
          >
            <div
              className="absolute top-0 left-0 h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
        </div>

        <span className="text-xs font-mono text-muted-foreground flex-shrink-0 tabular-nums">
          {fmt(currentTime)}&nbsp;/&nbsp;{loaded ? fmt(duration) : "--:--"}
        </span>
      </div>
    </div>
  );
}
