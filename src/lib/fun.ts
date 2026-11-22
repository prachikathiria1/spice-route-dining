/** Light, cuisine-agnostic food facts for the welcome screen. */
export const FOOD_FACTS = [
  "A tandoor can reach about 480°C. That's why naan puffs up in about a minute.",
  "It takes roughly 150 crocus flowers to make one gram of saffron.",
  "Black pepper was once so valuable it was traded like money.",
  "Chai means “tea”, so “chai tea” really means “tea tea”.",
  "Eating spicy food releases endorphins, your body's own feel-good chemicals.",
  "India grows more varieties of mango than any other country: over a thousand!",
  "Cumin has been used in cooking for more than 4,000 years.",
  "Ice cream was once a luxury only kings could afford.",
  "The world's hottest chillies are measured in Scoville heat units.",
  "Smelling your food makes up most of what you think of as taste.",
];

export function greeting(now = new Date()): { hello: string; line: string } {
  const h = now.getHours();
  if (h < 5) return { hello: "Hello, night owl", line: "Midnight cravings? We've got you." };
  if (h < 12) return { hello: "Good morning", line: "Let's start the day deliciously." };
  if (h < 16) return { hello: "Good afternoon", line: "Lunch o'clock. What are you craving?" };
  if (h < 19) return { hello: "Good evening", line: "Snacks, chai, or a full feast?" };
  return { hello: "Good evening", line: "Dinner's on. Pick a table and dig in." };
}
