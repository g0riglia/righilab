import { notFound } from "next/navigation";
import GamePageClient from "./GamePageClient";
import { getGameBySlug } from "@/utils/games";

export default async function GamePage({ params }) {
  const { game: slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) {
    notFound();
  }
  return <GamePageClient game={game} />;
}
