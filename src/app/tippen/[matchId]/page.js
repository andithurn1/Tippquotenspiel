"use client";

import { useParams } from "next/navigation";
import Tippabgabe from "@/components/Tippabgabe";

export default function TippenMatchPage() {
  const { matchId } = useParams();
  return <Tippabgabe matchId={matchId} />;
}
