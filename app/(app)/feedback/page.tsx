import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isOwner, listFeedback } from "@/lib/feedback";
import { FeedbackInbox } from "@/components/feedback-inbox";

export const metadata: Metadata = { title: "Feedback" };

export default async function FeedbackPage() {
  const user = await getCurrentUser();
  if (!user || !(await isOwner(user.id))) notFound();
  return <FeedbackInbox initial={await listFeedback()} />;
}
