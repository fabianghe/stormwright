"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { nextInspiration } from "@/lib/greetings";
import { playReturn } from "@/lib/typewriter-sound";
import { usePreferences } from "@/components/preferences";

export function useInspiration(initial: string) {
  const { sounds } = usePreferences();
  const [greeting, setGreeting] = useState(initial);
  const [rolls, setRolls] = useState(0);

  const inspire = () => {
    if (sounds) playReturn();
    setGreeting(nextInspiration());
    setRolls(rolls + 1);
  };

  return { greeting, rolls, inspire };
}

export function InspireButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="sw-btn sw-btn-ghost shrink-0 border border-line">
      <Sparkles size={15} />
      Inspire me
    </button>
  );
}
