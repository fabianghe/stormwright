import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDocument } from "@/lib/documents";
import { displayTitle } from "@/lib/model";
import { getActiveProject } from "@/lib/projects";
import { DocumentView } from "@/components/document-view";
import { TrashedNotice } from "@/components/trashed-notice";

type Props = { params: Promise<{ id: string }> };

async function load(params: Props["params"]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const project = await getActiveProject(user.id);
  return getDocument(user.id, project.id, id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = await load(params);
  return { title: doc ? displayTitle(doc.title, doc.kind) : "Not found" };
}

export default async function DocumentPage({ params }: Props) {
  const doc = await load(params);
  if (!doc) notFound();
  if (doc.deletedAt) return <TrashedNotice id={doc.id} title={displayTitle(doc.title, doc.kind)} />;
  return <DocumentView key={doc.id} doc={doc} />;
}
