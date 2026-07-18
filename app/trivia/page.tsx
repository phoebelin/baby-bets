"use client";

import {
  Baby,
  Check,
  Coins,
  GraduationCap,
  Hourglass,
  TrendingUp,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NotConfigured } from "@/components/not-configured";
import { TopBar } from "@/components/top-bar";
import { Card, Pill, PillLink } from "@/components/ui";
import { usePlayer } from "@/lib/player-context";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { Player, TriviaQuestion } from "@/lib/types";

interface AnswerState {
  answer_index: number;
  is_correct: boolean;
  /** Only known for answers submitted this session (RPC returns it). */
  correct_index?: number;
}

export default function TriviaPage() {
  const { ready, player, gameState, applyPlayer } = usePlayer();
  const [questions, setQuestions] = useState<TriviaQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [idx, setIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coinToast, setCoinToast] = useState(0);

  useEffect(() => {
    if (!supabaseConfigured || !player?.id) return;
    let cancelled = false;
    (async () => {
      const [{ data: qs }, { data: ans }] = await Promise.all([
        supabase.from("trivia_public").select("*").order("sort"),
        supabase
          .from("trivia_answers")
          .select("*")
          .eq("player_id", player.id),
      ]);
      if (cancelled || !qs) return;
      const questionList = (qs as TriviaQuestion[]).map((q) => ({
        ...q,
        options: q.options as unknown as string[],
      }));
      const answered: Record<number, AnswerState> = {};
      for (const a of ans ?? []) {
        answered[a.question_id] = {
          answer_index: a.answer_index,
          is_correct: a.is_correct,
        };
      }
      setQuestions(questionList);
      setAnswers(answered);
      const firstUnanswered = questionList.findIndex((q) => !answered[q.id]);
      setIdx(firstUnanswered === -1 ? questionList.length : firstUnanswered);
    })();
    return () => {
      cancelled = true;
    };
  }, [player?.id]);

  const correctCount = useMemo(
    () => Object.values(answers).filter((a) => a.is_correct).length,
    [answers]
  );

  if (!supabaseConfigured) {
    return (
      <main className="relative z-10">
        <TopBar title="Baby Trivia" />
        <NotConfigured />
      </main>
    );
  }

  const triviaOpen = Boolean(gameState?.trivia_open);

  const submit = async (q: TriviaQuestion, answerIndex: number) => {
    if (!player || busy || answers[q.id]) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("submit_answer", {
        p_player_id: player.id,
        p_question_id: q.id,
        p_answer_index: answerIndex,
      });
      if (rpcError) throw new Error(rpcError.message);
      const result = data as { is_correct: boolean; correct_index: number };
      setAnswers((prev) => ({
        ...prev,
        [q.id]: {
          answer_index: answerIndex,
          is_correct: result.is_correct,
          correct_index: result.correct_index,
        },
      }));
      if (result.is_correct) {
        setCoinToast((n) => n + 1);
        // Realtime also delivers this, but refetching keeps the coin badge
        // honest even if the realtime socket is flaky on party Wi-Fi.
        const { data: fresh } = await supabase
          .from("players")
          .select("*")
          .eq("id", player.id)
          .single();
        if (fresh) applyPlayer(fresh as Player);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit answer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative z-10 flex flex-col gap-4">
      <TopBar title="Baby Trivia" />

      {ready && !player ? (
        <Card className="text-center">
          <p className="font-display font-semibold">Join first to play!</p>
          <PillLink
            href="/"
            className="mt-3 bg-ink px-6 py-3 text-cream shadow-lift"
          >
            Join the game
          </PillLink>
        </Card>
      ) : !triviaOpen && idx !== null && questions && idx < questions.length ? (
        <Card className="text-center">
          <Hourglass
            className="mx-auto h-8 w-8 text-ink-soft"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="mt-2 font-display font-semibold">
            Trivia isn&apos;t open right now
          </p>
          <p className="mt-1 flex flex-wrap items-center justify-center gap-1 text-center text-sm text-ink-soft">
            The host opens it during the party. Every correct answer earns
            1 <Coins className="h-3.5 w-3.5" aria-hidden /> to bet with —
            check back soon!
          </p>
        </Card>
      ) : questions === null || idx === null ? (
        <Baby
          className="mx-auto mt-10 h-9 w-9 text-ink-soft soft-pulse"
          strokeWidth={1.5}
          aria-hidden
        />
      ) : idx >= questions.length ? (
        <Card className="text-center pop-in">
          <GraduationCap
            className="mx-auto h-10 w-10 text-ink-soft"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="mt-2 font-display text-xl font-semibold">
            All done!
          </p>
          <p className="mt-1 flex flex-wrap items-center justify-center gap-1 text-center text-sm text-ink-soft">
            You got{" "}
            <span className="font-bold text-ink">
              {correctCount} of {questions.length}
            </span>{" "}
            right and earned {correctCount}{" "}
            <Coins className="h-3.5 w-3.5" aria-hidden />.
          </p>
          <PillLink
            href="/market"
            className="mt-4 bg-ink px-6 py-3 text-cream shadow-lift"
          >
            Go bet your winnings <TrendingUp className="h-4 w-4" aria-hidden />
          </PillLink>
        </Card>
      ) : (
        <QuestionCard
          key={questions[idx].id}
          question={questions[idx]}
          number={idx + 1}
          total={questions.length}
          answer={answers[questions[idx].id]}
          busy={busy}
          error={error}
          coinToast={coinToast}
          onAnswer={(i) => submit(questions[idx], i)}
          onNext={() => setIdx((v) => (v === null ? v : v + 1))}
        />
      )}

      {questions && idx !== null && idx < questions.length && (
        <div className="flex justify-center gap-1.5">
          {questions.map((q, i) => {
            const a = answers[q.id];
            return (
              <span
                key={q.id}
                className={`h-2 w-2 rounded-full ${
                  a
                    ? a.is_correct
                      ? "bg-leaf"
                      : "bg-oops"
                    : i === idx
                      ? "bg-ink"
                      : "bg-line"
                }`}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}

function QuestionCard({
  question,
  number,
  total,
  answer,
  busy,
  error,
  coinToast,
  onAnswer,
  onNext,
}: {
  question: TriviaQuestion;
  number: number;
  total: number;
  answer?: AnswerState;
  busy: boolean;
  error: string | null;
  coinToast: number;
  onAnswer: (index: number) => void;
  onNext: () => void;
}) {
  return (
    <Card className="relative">
      {answer?.is_correct && (
        <span
          key={coinToast}
          className="coin-float absolute right-5 top-3 flex items-center gap-1 text-lg font-bold text-gold"
        >
          +1 <Coins className="h-4 w-4" aria-hidden />
        </span>
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Question {number} of {total}
      </p>
      <h2 className="mt-1 font-display text-xl font-semibold">
        {question.question}
      </h2>
      <div className="mt-4 flex flex-col gap-2.5">
        {question.options.map((opt, i) => {
          const isPicked = answer?.answer_index === i;
          const isRight = answer?.correct_index === i;
          let style = "border-line bg-cream";
          if (answer) {
            if (isRight) style = "border-leaf bg-leaf/15";
            else if (isPicked && !answer.is_correct)
              style = "border-oops bg-oops-soft";
            else style = "border-line bg-cream opacity-60";
          }
          return (
            <button
              key={i}
              onClick={() => onAnswer(i)}
              disabled={Boolean(answer) || busy}
              className={`flex items-center justify-between gap-2 rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-medium transition-transform active:scale-[0.98] ${style}`}
            >
              {opt}
              {answer && isRight && (
                <Check className="h-4 w-4 shrink-0 text-leaf" aria-hidden />
              )}
              {answer && isPicked && !answer.is_correct && (
                <X className="h-4 w-4 shrink-0 text-oops" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-center text-sm text-oops">{error}</p>}

      {answer && (
        <div className="mt-4 pop-in">
          <p className="text-center text-sm font-semibold">
            {answer.is_correct
              ? "Nailed it! +1 coin"
              : answer.correct_index === undefined
                ? "You missed this one."
                : "Good grief — not quite."}
          </p>
          <Pill
            onClick={onNext}
            className="mt-3 w-full bg-ink py-3 text-cream shadow-lift"
          >
            {number === total ? "Finish" : "Next question →"}
          </Pill>
        </div>
      )}
    </Card>
  );
}
