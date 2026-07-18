export type Side = "boy" | "girl";

export interface Player {
  id: string;
  name: string;
  name_key: string;
  coins: number;
  reveal_winnings: number;
  created_at: string;
}

export interface Bet {
  id: number;
  player_id: string;
  side: Side;
  amount: number;
  created_at: string;
  players?: { name: string } | null;
}

export interface GameState {
  id: number;
  betting_open: boolean;
  trivia_open: boolean;
  revealed: boolean;
  actual_gender: Side | null;
  payouts_settled: boolean;
}

export interface TriviaQuestion {
  id: number;
  sort: number;
  question: string;
  options: string[];
}

export interface TriviaAnswer {
  id: number;
  player_id: string;
  question_id: number;
  answer_index: number;
  is_correct: boolean;
}

export const SIDE_META: Record<
  Side,
  { label: string; emoji: string; noun: string }
> = {
  boy: { label: "Boy", emoji: "💙", noun: "a boy" },
  girl: { label: "Girl", emoji: "🩷", noun: "a girl" },
};
