import type { Metadata } from "next";
import { QuestMap } from "@/components/quest-map";

export const metadata: Metadata = { title: "Quest map" };

export default function MapPage() {
  return <QuestMap />;
}
