export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number; // index into options
  fact: string;
}

export const QUIZ_POOL: QuizQuestion[] = [
  { q: "Which spice gives biryani its golden colour and floral aroma?", options: ["Turmeric", "Saffron", "Paprika", "Annatto"], answer: 1, fact: "It takes roughly 150 crocus flowers to make one gram of saffron." },
  { q: "Kasuri methi, used in paneer makhani, is the dried leaf of which plant?", options: ["Fenugreek", "Curry leaf", "Mint", "Coriander"], answer: 0, fact: "Kasuri methi is named after Kasur, a town in Punjab." },
  { q: "What does 'tandoor' refer to?", options: ["A spice blend", "A clay oven", "A cooking pot", "A bread style"], answer: 1, fact: "Tandoors can reach around 480°C, which is why naan blisters in about a minute." },
  { q: "Which chilli is famous for colour more than heat?", options: ["Bhut Jolokia", "Kashmiri chilli", "Guntur chilli", "Bird's eye"], answer: 1, fact: "Kashmiri chilli is what gives many North Indian gravies their deep red colour." },
  { q: "Garam masala literally means…", options: ["Green spice", "Hot spice mix", "Sweet blend", "Royal powder"], answer: 1, fact: "'Garam' refers to warming the body, not chilli heat." },
  { q: "Bhut Jolokia, once the world's hottest chilli, comes from which region?", options: ["Kerala", "Rajasthan", "Northeast India", "Punjab"], answer: 2, fact: "It measures over 1,000,000 Scoville heat units." },
  { q: "What is 'tadka'?", options: ["A dessert", "Tempering spices in hot oil or ghee", "A type of lentil", "A rice dish"], answer: 1, fact: "Tadka is poured over dal at the end to bloom spices like cumin and mustard seeds." },
  { q: "Which seed is the star of jeera rice?", options: ["Fennel", "Cumin", "Mustard", "Nigella"], answer: 1, fact: "'Jeera' is the Hindi word for cumin." },
  { q: "Paneer is made by curdling milk with…", options: ["Yeast", "An acid like lemon juice", "Salt", "Sugar"], answer: 1, fact: "Unlike most cheeses, paneer is not aged and doesn't melt." },
  { q: "Which spice is the most expensive by weight after saffron?", options: ["Vanilla", "Cardamom", "Clove", "Pepper"], answer: 0, fact: "Vanilla orchids are mostly hand-pollinated, which keeps the price high. Green cardamom comes third." },
  { q: "Black pepper is native to which Indian state's coast?", options: ["Goa", "Kerala", "Gujarat", "Odisha"], answer: 1, fact: "The Malabar coast pepper trade drew traders from Rome to Portugal." },
  { q: "Ajwain is commonly added to fried batters because it…", options: ["Adds colour", "Aids digestion", "Makes it sweeter", "Thickens it"], answer: 1, fact: "Ajwain tastes like thyme because both contain thymol." },
  { q: "Which of these is NOT typically in a classic lassi?", options: ["Yoghurt", "Water", "Soy sauce", "Sugar or salt"], answer: 2, fact: "Punjabi lassi is often topped with a layer of malai (clotted cream)." },
  { q: "Hing (asafoetida) is used in tiny amounts because it is…", options: ["Very sweet", "Extremely pungent", "Toxic", "Very sour"], answer: 1, fact: "Hing is a dried resin and adds an onion-garlic depth to dals." },
  { q: "Dal makhani traditionally uses which lentil?", options: ["Red lentil", "Whole black urad", "Moong", "Chana"], answer: 1, fact: "It's often simmered overnight on the dying embers of the tandoor." },
];

export function pickQuestions(n: number, seed = Math.random()): QuizQuestion[] {
  const arr = [...QUIZ_POOL];
  let s = Math.floor(seed * 2 ** 31) || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 48271) % 2147483647;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

export const QUESTION_SECONDS = 15;
export const pointsFor = (correct: boolean, secondsLeft: number) => (correct ? 50 + Math.round(secondsLeft * 4) : 0);
