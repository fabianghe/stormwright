import { Bug, Lightbulb, MessageCircle, type LucideIcon } from "lucide-react";
import type { FeedbackKind } from "@/lib/model";

export const FEEDBACK_ICONS: Record<FeedbackKind, LucideIcon> = {
  idea: Lightbulb,
  problem: Bug,
  other: MessageCircle,
};
