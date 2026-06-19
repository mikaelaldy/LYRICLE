import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Music2, Headphones, Trophy, Zap, Calendar, Globe } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

function FloatingNote({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute pointer-events-none select-none text-primary opacity-20 font-serif font-black ${className}`}
      animate={{ y: [0, -18, 0], rotate: [0, 6, 0], opacity: [0.15, 0.28, 0.15] }}
      transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    >
      ♪
    </motion.div>
  );
}

function LyricFragment({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <motion.span
      className={`absolute pointer-events-none select-none font-mono text-xs text-primary/30 whitespace-nowrap ${className}`}
      animate={{ opacity: [0.2, 0.5, 0.2], y: [0, -8, 0] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {text}
    </motion.span>
  );
}

function WaveBar({ delay = 0, height = 24 }: { delay?: number; height?: number }) {
  return (
    <motion.div
      className="w-1 rounded-full bg-primary"
      animate={{ scaleY: [0.3, 1, 0.3] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay }}
      style={{ height: `${height}px`, transformOrigin: "bottom" }}
    />
  );
}

export default function Landing() {
  const [, setLocation] = useLocation();

  const goToGame = () => setLocation("/game");

  return (
    <div className="bg-background text-foreground overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        {/* Decorative background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(232,212,77,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(232,212,77,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

        {/* Floating decorative elements */}
        <FloatingNote className="text-7xl top-[12%] left-[8%]" delay={0} />
        <FloatingNote className="text-5xl top-[20%] right-[10%]" delay={1.5} />
        <FloatingNote className="text-9xl bottom-[18%] left-[5%]" delay={0.8} />
        <FloatingNote className="text-4xl bottom-[25%] right-[8%]" delay={2.2} />
        <LyricFragment text="I will always love you…" className="top-[30%] left-[3%] -rotate-12" delay={0} />
        <LyricFragment text="…in the midnight hour…" className="bottom-[35%] right-[3%] rotate-6" delay={1.5} />
        <LyricFragment text="Hit me baby one more time…" className="top-[65%] left-[5%] -rotate-3" delay={0.7} />

        {/* Waveform */}
        <div className="flex items-end gap-1 mb-10">
          {[0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95, 1.1, 0.8, 0.65, 0.5, 0.35, 0.2, 0.1, 0].map((d, i) => (
            <WaveBar key={i} delay={d} height={16 + Math.sin(i * 0.8) * 14} />
          ))}
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="max-w-3xl mx-auto"
        >
          <motion.p
            variants={fadeUp}
            className="font-mono text-primary text-xs tracking-[0.3em] uppercase mb-6"
          >
            The Daily Music Challenge
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="font-serif italic font-black text-5xl sm:text-7xl lg:text-8xl leading-[1.05] tracking-tight text-foreground mb-6"
          >
            Name the song.
            <br />
            <span className="text-primary">Prove your ears.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="font-sans text-muted-foreground text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Five escalating clues. One chance per day. Can you identify the track before the final lyric drops?
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground font-sans font-semibold text-base px-8 py-6 rounded-none hover:bg-primary/90 transition-colors"
              onClick={goToGame}
            >
              Play Today's Puzzle
            </Button>
            <a
              href="#how-it-works"
              className="font-mono text-sm text-muted-foreground hover:text-primary transition-colors tracking-widest uppercase"
            >
              How It Works ↓
            </a>
          </motion.div>
        </motion.div>

        {/* Bottom border accent */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-28 px-6 bg-card/30">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="max-w-4xl mx-auto"
        >
          <motion.div variants={fadeUp} className="text-center mb-16">
            <p className="font-mono text-primary text-xs tracking-[0.3em] uppercase mb-4">The Rules</p>
            <h2 className="font-serif italic text-4xl sm:text-5xl font-bold text-foreground">How It Works</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: <Music2 className="w-6 h-6 text-primary" />,
                title: "Read a clue",
                body: "Start with a vague thematic hint — the mood, the era, the context. Mystery is part of the game.",
              },
              {
                step: "02",
                icon: <Headphones className="w-6 h-6 text-primary" />,
                title: "Guess the song",
                body: "Type your best guess. Each wrong answer unlocks a sharper clue — translated lyrics, instrumentation, then the hook.",
              },
              {
                step: "03",
                icon: <Trophy className="w-6 h-6 text-primary" />,
                title: "Climb the leaderboard",
                body: "Fewer clues means a higher score. Nail it on the first hint and you're in elite company.",
              },
            ].map(({ step, icon, title, body }) => (
              <motion.div
                key={step}
                variants={fadeUp}
                className="relative flex flex-col gap-5 p-7 border border-border bg-card/50 backdrop-blur-sm"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-primary text-sm font-medium tracking-widest">{step}</span>
                  <div className="h-px flex-1 bg-border" />
                  {icon}
                </div>
                <h3 className="font-serif text-2xl font-bold text-foreground">{title}</h3>
                <p className="font-sans text-muted-foreground text-sm leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── WHY IT'S DIFFERENT ── */}
      <section className="py-28 px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="max-w-4xl mx-auto"
        >
          <motion.div variants={fadeUp} className="text-center mb-16">
            <p className="font-mono text-primary text-xs tracking-[0.3em] uppercase mb-4">Why Lyricle</p>
            <h2 className="font-serif italic text-4xl sm:text-5xl font-bold text-foreground">Not just another quiz</h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: <Calendar className="w-5 h-5 text-primary" />,
                headline: "One puzzle a day",
                body: "A single handpicked puzzle at midnight. No infinite scroll, no grind. Just one moment to prove what you know.",
              },
              {
                icon: <Zap className="w-5 h-5 text-primary" />,
                headline: "Five escalating clues",
                body: "Each stage reveals more — but uses more of your guesses. The fewer clues you need, the sharper you are.",
              },
              {
                icon: <Globe className="w-5 h-5 text-primary" />,
                headline: "Compete globally",
                body: "Every player around the world gets the same puzzle. Compare scores, track streaks, and rise through the ranks.",
              },
            ].map(({ icon, headline, body }) => (
              <motion.div
                key={headline}
                variants={fadeUp}
                className="relative pl-6 py-8 pr-7 border border-border/60 bg-card/40 backdrop-blur-sm"
                style={{ borderLeft: "3px solid hsl(52 76% 60%)" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  {icon}
                  <h3 className="font-serif font-bold text-xl text-foreground">{headline}</h3>
                </div>
                <p className="font-sans text-muted-foreground text-sm leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="py-16 px-6 border-y border-border bg-card/60 backdrop-blur-sm">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="max-w-4xl mx-auto"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:divide-x divide-border">
            {[
              { value: "24,800+", label: "Puzzles Solved", sub: "and counting" },
              { value: "3,200", label: "Players Today", sub: "across 80+ countries" },
              { value: "412", label: "Streak Leaders", sub: "on the all-time board" },
            ].map(({ value, label, sub }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                className="flex flex-col items-center text-center sm:px-8 gap-1"
              >
                <span className="font-serif italic font-black text-4xl sm:text-5xl text-primary">{value}</span>
                <span className="font-sans font-semibold text-foreground text-sm tracking-wide uppercase">{label}</span>
                <span className="font-mono text-muted-foreground text-xs">{sub}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="relative py-32 px-6 text-center overflow-hidden bg-card/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,212,77,0.06)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="max-w-2xl mx-auto"
        >
          <motion.div variants={fadeUp} className="flex justify-center mb-10">
            <div className="flex items-end gap-1">
              {[0.4, 0.2, 0.6, 0.1, 0.8, 0.3, 0.9, 0.5, 0.7, 0.2].map((d, i) => (
                <WaveBar key={i} delay={d} height={12 + i * 3} />
              ))}
            </div>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="font-serif italic font-black text-4xl sm:text-6xl lg:text-7xl leading-tight text-foreground mb-6"
          >
            Your ears.
            <br />
            <span className="text-primary">Your moment.</span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="font-sans text-muted-foreground text-base sm:text-lg mb-10"
          >
            A new puzzle drops every day at midnight. Today's is waiting.
          </motion.p>

          <motion.div variants={fadeUp}>
            <Button
              size="lg"
              className="bg-primary text-primary-foreground font-sans font-semibold text-base px-10 py-6 rounded-none hover:bg-primary/90 transition-colors"
              onClick={goToGame}
            >
              Start Playing
            </Button>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="font-mono text-xs text-muted-foreground/60 mt-8 tracking-widest uppercase"
          >
            Free · Daily · No account required to play
          </motion.p>
        </motion.div>

        {/* Logo footer */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-20 flex flex-col items-center gap-3 opacity-40"
        >
          <img src={`${basePath}/logo.svg`} alt="Lyricle" className="w-8 h-8" />
          <span className="font-serif text-xl font-black tracking-tight text-primary">LYRICLE</span>
          <span className="font-mono text-xs text-muted-foreground">© 2026</span>
        </motion.div>
      </section>
    </div>
  );
}
