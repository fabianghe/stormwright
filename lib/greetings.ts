export const GREETINGS = [
  "The ink's ready, {name}.",
  "The page is yours, {name}.",
  "Pull up a chair, {name}.",
  "Fancy a cup of tea, {name}?",
  "Every hero needs a reason, {name}.",
  "What does the villain want, {name}?",
  "Every map hides a door, {name}.",
  "The world is holding its breath, {name}.",
  "Thunder in the distance, {name}.",
  "Rain on the window, {name}.",
  "The lanterns are lit, {name}.",
  "Something stirs in the dark, {name}.",
  "The wind changed, {name}.",
  "Time to break a heart, {name}.",
  "The NPCs are waiting for lines, {name}.",
  "Plot twist incoming, {name}.",
  "Your NPCs have opinions, {name}.",
  "The chicken knows something, {name}.",
  "Achievement unlocked: showing up, {name}.",
];

export function randomGreeting(name?: string) {
  const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  return name ? greeting.replace("{name}", name) : greeting.replace(/,? \{name\}/, "");
}
