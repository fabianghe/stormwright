import type { Metadata } from "next";
import { cookies } from "next/headers";
import { TodoMap } from "@/components/todo-map";
import { MAP_HIDDEN_COOKIE, parseHiddenKinds } from "@/lib/model";

export const metadata: Metadata = { title: "Todo map" };

export default async function MapPage() {
  const hidden = parseHiddenKinds((await cookies()).get(MAP_HIDDEN_COOKIE)?.value);
  return <TodoMap initialHidden={hidden} />;
}
