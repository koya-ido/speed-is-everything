export type TitleCategory =
  | "ranking"
  | "game_mode"
  | "battle_mode"
  | "play_count"
  | "battle_wins"
  | "special";

export type TitleId =
  | "apex_predator"
  | "synapse_overload"
  | "high_frequency"
  | "untouchable"
  | "gods_reflex"
  | "flow_state"
  | "awakened"
  | "overclocked"
  | "neural_master"
  | "contender"
  | "veteran"
  | "speed_gladiator"
  | "clutch_god"
  | "quantum_mirror"
  | "light_speed"
  | "trigger_happy";

export type TitleDefinition = {
  id: TitleId;
  name: string;
  category: TitleCategory;
  condition: string;
  description: string;
  badgeColor: {
    bg: string;
    border: string;
    text: string;
    glow: string;
  };
};

export type UserTitleInfo = TitleDefinition & {
  unlocked: boolean;
  unlockedAt?: string | null;
  progress?: {
    current: number;
    target: number;
    unit?: string;
  };
};
