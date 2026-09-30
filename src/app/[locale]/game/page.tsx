import { GameCanvas } from "@/features/game";

const GamePage = (_props?: { params?: Promise<{ locale?: string }> }) => {
  return <GameCanvas />;
};

export default GamePage;

