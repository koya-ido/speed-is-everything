export type RankingEntry = {
  id: string;
  clearCount: number;
  remainingTime: number;
  averageTime: number;
  medianTime: number;
  rawReactions: number[];
  updatedAt: string;
  user: {
    id: string;
    name: string;
    country: string | null;
    image: string | null;
    selectedTitle?: string | null;
  };
};
