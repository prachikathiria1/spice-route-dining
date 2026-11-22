"use client";

import { Check, Crown, Flame, Play, Plus, Trophy, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Segmented } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useNow } from "@/hooks/useNow";
import { useStore } from "@/lib/data/store";
import { pickQuestions, pointsFor, QUESTION_SECONDS, type QuizQuestion } from "@/lib/quiz";
import type { RestaurantTable } from "@/lib/types";
import { cn, isToday } from "@/lib/utils";

const ROUNDS = 5;

type Phase =
  | { kind: "setup" }
  | { kind: "turn"; round: number; player: number; startedAt: number }
  | { kind: "reveal"; round: number; player: number; picked: number | null; gained: number }
  | { kind: "done" };

export function SpiceQuiz({ table }: { table: RestaurantTable }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const [mode, setMode] = useState<"solo" | "pass">("solo");
  const [players, setPlayers] = useState<string[]>(() => {
    try {
      return [localStorage.getItem("spice-route:guest-name") || "Guest"];
    } catch {
      return ["Guest"];
    }
  });
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [scores, setScores] = useState<{ score: number; correct: number }[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const now = useNow(250);

  const activePlayers = mode === "solo" ? players.slice(0, 1) : players;

  function start() {
    const names = activePlayers.map((p, i) => p.trim() || `Player ${i + 1}`);
    setPlayers(mode === "solo" ? [names[0], ...players.slice(1)] : names);
    // Pass & play: everyone gets their own question each round.
    setQuestions(pickQuestions(ROUNDS * names.length));
    setScores(names.map(() => ({ score: 0, correct: 0 })));
    setPhase({ kind: "turn", round: 0, player: 0, startedAt: Date.now() });
  }

  const qIndex = phase.kind === "turn" || phase.kind === "reveal" ? phase.round * activePlayers.length + phase.player : 0;
  const question = questions[qIndex];
  const secondsLeft = phase.kind === "turn" ? Math.max(0, QUESTION_SECONDS - (now - phase.startedAt) / 1000) : 0;

  function answer(picked: number | null) {
    if (phase.kind !== "turn") return;
    const left = Math.max(0, QUESTION_SECONDS - (Date.now() - phase.startedAt) / 1000);
    const correct = picked === question.answer;
    const gained = pointsFor(correct, left);
    setScores((s) => s.map((x, i) => (i === phase.player ? { score: x.score + gained, correct: x.correct + (correct ? 1 : 0) } : x)));
    setPhase({ kind: "reveal", round: phase.round, player: phase.player, picked, gained });
  }

  // Time's up
  useEffect(() => {
    if (phase.kind === "turn" && secondsLeft <= 0) answer(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase.kind]);

  function next() {
    if (phase.kind !== "reveal") return;
    let { round, player } = phase;
    player += 1;
    if (player >= activePlayers.length) {
      player = 0;
      round += 1;
    }
    if (round >= ROUNDS) {
      activePlayers.forEach((p, i) =>
        actions.addQuizScore({ tableId: table.id, sessionId: table.sessionId, player: p, score: scores[i].score, correct: scores[i].correct, rounds: ROUNDS }),
      );
      toast(`Scores posted to the ${table.label} leaderboard`);
      setPhase({ kind: "done" });
      return;
    }
    setPhase({ kind: "turn", round, player, startedAt: Date.now() });
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 bg-gradient-to-r from-red-600 to-brand-500 px-4 py-3 text-white">
          <Flame className="size-6" />
          <div>
            <div className="font-black">Spice Quiz</div>
            <div className="text-xs text-white/85">{ROUNDS} rounds · {QUESTION_SECONDS}s each · faster answers score more</div>
          </div>
        </div>

        {phase.kind === "setup" && (
          <div className="space-y-4 p-4">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "solo", label: "Solo" },
                { value: "pass", label: (<span className="inline-flex items-center gap-1"><Users className="size-4" /> Tablemates (pass &amp; play)</span>) },
              ]}
            />
            <div className="space-y-2">
              {activePlayers.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={p}
                    onChange={(e) => setPlayers((ps) => ps.map((x, j) => (j === i ? e.target.value : x)))}
                    maxLength={16}
                    placeholder={`Player ${i + 1}`}
                    aria-label={`Player ${i + 1} name`}
                    className="h-11 flex-1 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-brand-500"
                  />
                  {mode === "pass" && players.length > 1 && (
                    <button onClick={() => setPlayers((ps) => ps.filter((_, j) => j !== i))} className="rounded-xl px-3 text-slate-500 hover:bg-slate-100" aria-label="Remove player">
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              {mode === "pass" && players.length < 6 && (
                <Button variant="secondary" size="sm" onClick={() => setPlayers((ps) => [...ps, ""])}>
                  <Plus className="size-4" /> Add player
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-500">Everyone at {table.label} sees the same live leaderboard. Tablemates can also play on their own phones.</p>
            <Button size="lg" className="w-full" onClick={start}>
              <Play className="size-5" /> Start quiz
            </Button>
          </div>
        )}

        {(phase.kind === "turn" || phase.kind === "reveal") && question && (
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-600">
                Round {phase.round + 1}/{ROUNDS}
                {activePlayers.length > 1 && <> · <span className="text-brand-700">{activePlayers[phase.player]}’s turn</span></>}
              </span>
              <span className="font-bold tabular">{scores[phase.player]?.score ?? 0} pts</span>
            </div>
            {phase.kind === "turn" && (
              <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${Math.ceil(secondsLeft)} seconds left`}>
                <div className={cn("h-full rounded-full transition-[width] duration-200", secondsLeft < 5 ? "bg-red-500" : "bg-brand-500")} style={{ width: `${(secondsLeft / QUESTION_SECONDS) * 100}%` }} />
              </div>
            )}
            <h3 className="text-lg font-bold leading-snug">{question.q}</h3>
            <div className="grid gap-2">
              {question.options.map((opt, i) => {
                const reveal = phase.kind === "reveal";
                const isAnswer = i === question.answer;
                const isPicked = reveal && phase.picked === i;
                return (
                  <button
                    key={opt}
                    disabled={reveal}
                    onClick={() => answer(i)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left font-semibold transition",
                      !reveal && "border-slate-200 hover:border-brand-400 active:scale-[0.99]",
                      reveal && isAnswer && "border-emerald-600 bg-emerald-50 text-emerald-900",
                      reveal && isPicked && !isAnswer && "border-red-500 bg-red-50 text-red-900",
                      reveal && !isAnswer && !isPicked && "border-slate-200 text-slate-400",
                    )}
                  >
                    {opt}
                    {reveal && isAnswer && <Check className="size-5" />}
                    {reveal && isPicked && !isAnswer && <X className="size-5" />}
                  </button>
                );
              })}
            </div>
            {phase.kind === "reveal" && (
              <div className="space-y-3">
                <div className={cn("rounded-xl px-4 py-3 text-sm", phase.gained ? "bg-emerald-50 text-emerald-900" : "bg-slate-100 text-slate-700")}>
                  <div className="font-bold">{phase.gained ? `+${phase.gained} points!` : phase.picked === null ? "Time's up!" : "Not quite."}</div>
                  <div className="mt-0.5">{question.fact}</div>
                </div>
                <Button size="lg" className="w-full" onClick={next}>
                  {phase.round === ROUNDS - 1 && phase.player === activePlayers.length - 1 ? "See results" : activePlayers.length > 1 ? `Next: ${activePlayers[(phase.player + 1) % activePlayers.length]}` : "Next question"}
                </Button>
              </div>
            )}
          </div>
        )}

        {phase.kind === "done" && (
          <div className="space-y-3 p-4">
            <div className="text-center text-lg font-black">Final scores</div>
            {activePlayers
              .map((p, i) => ({ p, ...scores[i] }))
              .sort((a, b) => b.score - a.score)
              .map((r, i) => (
                <div key={r.p + i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                  <span className="flex items-center gap-2 font-semibold">
                    {i === 0 && <Crown className="size-4 text-amber-500" />} {r.p}
                  </span>
                  <span className="text-sm text-slate-600">
                    {r.correct}/{ROUNDS} correct · <b className="text-slate-900">{r.score} pts</b>
                  </span>
                </div>
              ))}
            <p className="text-center text-xs text-slate-500">You earned +{scores.reduce((a, s) => a + s.correct, 0) * 5} reward points for correct answers.</p>
            <Button size="lg" className="w-full" onClick={() => setPhase({ kind: "setup" })}>
              Play again
            </Button>
          </div>
        )}
      </Card>

      {state && <Leaderboard tableId={table.id} sessionId={table.sessionId} />}
    </div>
  );
}

function Leaderboard({ tableId, sessionId }: { tableId: string; sessionId: string | null }) {
  const { state } = useStore();
  const [scope, setScope] = useState<"table" | "room">("table");
  const today = useMemo(() => (state?.quiz_scores ?? []).filter((s) => isToday(s.createdAt)), [state]);

  const tableRows = today.filter((s) => s.tableId === tableId && (!sessionId || s.sessionId === sessionId)).sort((a, b) => b.score - a.score).slice(0, 8);
  const roomRows = useMemo(() => {
    const byTable = new Map<string, { tableId: string; total: number; best: number; plays: number }>();
    for (const s of today) {
      const r = byTable.get(s.tableId) ?? { tableId: s.tableId, total: 0, best: 0, plays: 0 };
      r.total += s.score;
      r.best = Math.max(r.best, s.score);
      r.plays += 1;
      byTable.set(s.tableId, r);
    }
    return Array.from(byTable.values()).sort((a, b) => b.total - a.total);
  }, [today]);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-black">
          <Trophy className="size-5 text-amber-500" /> Leaderboard
        </h3>
        <Segmented value={scope} onChange={setScope} options={[{ value: "table", label: "Our table" }, { value: "room", label: "All tables" }]} />
      </div>
      {scope === "table" ? (
        tableRows.length ? (
          <ol className="space-y-1.5">
            {tableRows.map((s, i) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">
                  <span className="mr-2 inline-block w-5 text-slate-400">{i + 1}</span>
                  {s.player}
                </span>
                <span className="font-bold tabular">{s.score}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-500">No scores yet. Be the first!</p>
        )
      ) : (
        <ol className="space-y-1.5">
          {roomRows.map((r, i) => (
            <li key={r.tableId} className={cn("flex items-center justify-between rounded-lg px-3 py-2 text-sm", r.tableId === tableId ? "bg-brand-50 ring-1 ring-brand-200" : "bg-slate-50")}>
              <span className="font-semibold">
                <span className="mr-2 inline-block w-5 text-slate-400">{i + 1}</span>
                Table {r.tableId.slice(1)} {r.tableId === tableId && <span className="text-brand-700">(you)</span>}
              </span>
              <span className="text-slate-600">
                {r.plays} plays · <b className="text-slate-900 tabular">{r.total}</b>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
