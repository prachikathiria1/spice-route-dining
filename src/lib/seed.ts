import type { RestaurantTable, Settings, ThemeId } from "./types";
import type { DbState, MenuItem, Order, OrderLine, Payment, QuizScore, Review, WaiterCall } from "./types";
import { uid } from "./utils";

const lassiCombo = { id: "combo-lassi-jamun", name: "Combo: Sweet Lassi + Gulab Jamun", price: 149, originalPrice: 189, isCombo: true };
const softDrink = { id: "addon-cola", name: "Add a Masala Soda", price: 59 };
const extraButter = { id: "addon-butter", name: "Extra butter", price: 30 };
const extraCheese = { id: "addon-cheese", name: "Extra cheese", price: 40 };
const raita = { id: "addon-raita", name: "Side of boondi raita", price: 69 };
const naanCombo = { id: "combo-naan", name: "Combo: 2 Butter Naan + Veg Pulao", price: 189, originalPrice: 247, isCombo: true };

let order = 0;
const m = (item: Omit<MenuItem, "sortOrder" | "available"> & { available?: boolean }): MenuItem => ({
  available: true,
  ...item,
  sortOrder: order++,
});

export const SEED_MENU: MenuItem[] = [
  // Starters
  m({ id: "paneer-tikka", name: "Paneer Tikka", description: "Cottage cheese cubes marinated in yoghurt and spices, charred in the tandoor with peppers and onion.", category: "Starters", station: "Tandoor", price: 289, sizes: [{ id: "half", label: "Half (4 pc)", price: 189 }, { id: "full", label: "Full (8 pc)", price: 289 }], addOns: [extraCheese, softDrink, lassiCombo], allergens: ["Dairy"], spiceLevel: 2, veg: true, prepMinutes: 14, popular: true }),
  m({ id: "hara-bhara-kebab", name: "Hara Bhara Kebab", description: "Spinach, peas and potato patties with a cashew centre, shallow fried.", category: "Starters", station: "Curry", price: 229, allergens: ["Nuts", "Gluten"], spiceLevel: 1, veg: true, prepMinutes: 10, addOns: [softDrink] }),
  m({ id: "punjabi-samosa", name: "Punjabi Samosa", description: "Two crisp pastries filled with spiced potato and peas, served with mint and tamarind chutneys.", category: "Starters", station: "Curry", price: 129, allergens: ["Gluten"], spiceLevel: 1, veg: true, prepMinutes: 6, addOns: [softDrink] }),

  // Mains
  m({ id: "paneer-butter-masala", name: "Paneer Butter Masala", description: "Soft paneer in a rich, mildly sweet makhani gravy with cream.", category: "Mains", station: "Curry", price: 349, sizes: [{ id: "half", label: "Half", price: 229 }, { id: "full", label: "Full", price: 349 }], addOns: [extraButter, naanCombo], allergens: ["Dairy", "Nuts"], spiceLevel: 1, veg: true, prepMinutes: 13, popular: true }),
  m({ id: "dal-makhani", name: "Dal Makhani", description: "Black lentils slow-cooked overnight with butter and cream.", category: "Mains", station: "Curry", price: 289, sizes: [{ id: "half", label: "Half", price: 189 }, { id: "full", label: "Full", price: 289 }], addOns: [naanCombo, raita], allergens: ["Dairy"], spiceLevel: 0, veg: true, prepMinutes: 8 }),
  m({ id: "chole-masala", name: "Amritsari Chole", description: "Chickpeas in a dark, tangy spice blend with ginger juliennes.", category: "Mains", station: "Curry", price: 249, addOns: [naanCombo], allergens: [], spiceLevel: 2, veg: true, prepMinutes: 8 }),

  // Breads
  m({ id: "butter-naan", name: "Butter Naan", description: "Leavened flatbread from the tandoor, brushed with butter.", category: "Breads", station: "Tandoor", price: 69, allergens: ["Gluten", "Dairy"], spiceLevel: 0, veg: true, prepMinutes: 5 }),
  m({ id: "garlic-naan", name: "Garlic Naan", description: "Naan topped with garlic and coriander.", category: "Breads", station: "Tandoor", price: 89, allergens: ["Gluten", "Dairy"], spiceLevel: 0, veg: true, prepMinutes: 5, popular: true }),
  m({ id: "tandoori-roti", name: "Tandoori Roti", description: "Whole wheat bread from the clay oven.", category: "Breads", station: "Tandoor", price: 39, allergens: ["Gluten"], spiceLevel: 0, veg: true, prepMinutes: 4 }),
  m({ id: "lachha-paratha", name: "Lachha Paratha", description: "Flaky, layered whole wheat paratha.", category: "Breads", station: "Tandoor", price: 79, allergens: ["Gluten", "Dairy"], spiceLevel: 0, veg: true, prepMinutes: 6 }),

  // Rice
  m({ id: "veg-biryani", name: "Subz Dum Biryani", description: "Basmati and seasonal vegetables slow-cooked with saffron and fried onions.", category: "Rice", station: "Curry", price: 299, addOns: [raita], allergens: ["Dairy", "Nuts"], spiceLevel: 2, veg: true, prepMinutes: 16 }),
  m({ id: "veg-pulao", name: "Vegetable Pulao", description: "Fragrant basmati with peas, carrots, spring onion and whole spices.", category: "Rice", station: "Curry", price: 179, allergens: ["Dairy"], spiceLevel: 0, veg: true, prepMinutes: 8 }),

  // Desserts
  m({ id: "gulab-jamun", name: "Gulab Jamun", description: "Two warm milk dumplings in cardamom syrup.", category: "Desserts", station: "Cold", price: 99, allergens: ["Dairy", "Gluten"], spiceLevel: 0, veg: true, prepMinutes: 3 }),
  m({ id: "rasmalai", name: "Rasmalai", description: "Chenna discs soaked in saffron milk with pistachio.", category: "Desserts", station: "Cold", price: 129, allergens: ["Dairy", "Nuts"], spiceLevel: 0, veg: true, prepMinutes: 3 }),
  m({ id: "mango-kulfi", name: "Mango Kulfi", description: "Slow-reduced milk and Alphonso mango, frozen on a stick.", category: "Desserts", station: "Cold", price: 119, allergens: ["Dairy"], spiceLevel: 0, veg: true, prepMinutes: 2 }),

  // Drinks
  m({ id: "sweet-lassi", name: "Sweet Lassi", description: "Chilled churned yoghurt, lightly sweetened.", category: "Drinks", station: "Drinks", price: 99, sizes: [{ id: "reg", label: "Regular", price: 99 }, { id: "large", label: "Large", price: 139 }], allergens: ["Dairy"], spiceLevel: 0, veg: true, prepMinutes: 3 }),
  m({ id: "mango-lassi", name: "Mango Lassi", description: "Alphonso mango blended with yoghurt.", category: "Drinks", station: "Drinks", price: 129, sizes: [{ id: "reg", label: "Regular", price: 129 }, { id: "large", label: "Large", price: 169 }], allergens: ["Dairy"], spiceLevel: 0, veg: true, prepMinutes: 3, popular: true }),
  m({ id: "masala-chai", name: "Masala Chai", description: "Assam tea brewed with ginger, cardamom and milk.", category: "Drinks", station: "Drinks", price: 59, allergens: ["Dairy"], spiceLevel: 1, veg: true, prepMinutes: 4 }),
  m({ id: "nimbu-soda", name: "Masala Nimbu Soda", description: "Fresh lime, soda and black salt. Sweet, salted or mixed.", category: "Drinks", station: "Drinks", price: 79, allergens: [], spiceLevel: 0, veg: true, prepMinutes: 2 }),
  m({ id: "watermelon-cooler", name: "Watermelon Cooler", description: "Fresh watermelon, mint and lime.", category: "Drinks", station: "Drinks", price: 109, allergens: [], spiceLevel: 0, veg: true, prepMinutes: 3 }),
];

const menuById = Object.fromEntries(SEED_MENU.map((i) => [i.id, i]));

function line(menuItemId: string, qty: number, sizeId?: string, done = false): OrderLine {
  const item = menuById[menuItemId];
  const size = item.sizes?.find((s) => s.id === sizeId);
  return {
    lineId: uid(),
    menuItemId,
    name: item.name,
    station: item.station,
    sizeLabel: size?.label,
    unitPrice: size?.price ?? item.price,
    qty,
    addOns: [],
    done,
  };
}

export const DEMO_SLUG = "spice-route";

export interface NewRestaurantInput {
  slug: string;
  restaurantName: string;
  tagline?: string;
  cuisine?: string;
  theme?: ThemeId;
  tableCount: number;
  wifiSsid?: string;
  wifiPassword?: string;
  whatsappNumber?: string;
  googleReviewUrl?: string;
  taxRate?: number;
  defaultLanguage?: Settings["defaultLanguage"];
  menu?: MenuItem[];
}

export function makeTables(count: number, existing: RestaurantTable[] = []): RestaurantTable[] {
  return Array.from({ length: count }, (_, i) => existing.find((t) => t.id === `T${i + 1}`) ?? { id: `T${i + 1}`, label: `Table ${i + 1}`, seats: 4, sessionId: null, sessionStartedAt: null, billRequestedAt: null });
}

/** An empty restaurant: settings, tables and (optionally) an imported menu. */
export function buildRestaurant(input: NewRestaurantInput, now = Date.now()): DbState {
  return {
    settings: [
      {
        id: "main",
        slug: input.slug,
        restaurantName: input.restaurantName,
        tagline: input.tagline ?? "",
        cuisine: input.cuisine,
        theme: input.theme ?? "saffron",
        wifiSsid: input.wifiSsid ?? "",
        wifiPassword: input.wifiPassword ?? "",
        whatsappNumber: input.whatsappNumber,
        googleReviewUrl: input.googleReviewUrl,
        taxRate: input.taxRate ?? 0.05,
        pointsPerRupees: 10,
        nextOrderNumber: 101,
        defaultLanguage: input.defaultLanguage ?? "en",
        active: true,
        createdAt: now,
      },
    ],
    menu_items: input.menu ?? [],
    restaurant_tables: makeTables(Math.max(1, Math.min(100, input.tableCount))),
    orders: [],
    waiter_calls: [],
    payments: [],
    reviews: [],
    quiz_scores: [],
  };
}

/** Builds a fresh, time-relative demo dataset. */
export function buildSeed(now = Date.now()): DbState {
  const min = 60_000;
  const s2 = uid(), s3 = uid(), s4 = uid(), s6 = uid();

  const orders: Order[] = [
    // T2: eating (served)
    { id: uid(), number: 101, tableId: "T2", sessionId: s2, lines: [line("paneer-butter-masala", 1, "full", true), line("garlic-naan", 3, undefined, true), line("mango-lassi", 2, "reg", true)], status: "served", estPrepMinutes: 15, createdAt: now - 42 * min, sentAt: now - 41 * min, startedAt: now - 40 * min, readyAt: now - 26 * min, servedAt: now - 24 * min, paid: false },
    // T3: in the kitchen, preparing
    { id: uid(), number: 102, tableId: "T3", sessionId: s3, lines: [line("paneer-tikka", 1, "full"), line("dal-makhani", 1, "full"), line("butter-naan", 2), line("masala-chai", 2, undefined, true)], status: "preparing", estPrepMinutes: 14, createdAt: now - 9 * min, sentAt: now - 8 * min, startedAt: now - 6 * min, readyAt: null, servedAt: null, paid: false },
    // T4: just placed, waiting for staff to send to kitchen
    { id: uid(), number: 103, tableId: "T4", sessionId: s4, lines: [line("veg-biryani", 2), line("hara-bhara-kebab", 1), line("nimbu-soda", 2)], status: "placed", estPrepMinutes: 18, createdAt: now - 2 * min, sentAt: null, startedAt: null, readyAt: null, servedAt: null, paid: false },
    // T6: sent, not started; plus served earlier
    { id: uid(), number: 104, tableId: "T6", sessionId: s6, lines: [line("punjabi-samosa", 2, undefined, true), line("sweet-lassi", 2, "reg", true)], status: "served", estPrepMinutes: 6, createdAt: now - 30 * min, sentAt: now - 29 * min, startedAt: now - 28 * min, readyAt: now - 23 * min, servedAt: now - 21 * min, paid: false },
    { id: uid(), number: 105, tableId: "T6", sessionId: s6, lines: [line("chole-masala", 1), line("lachha-paratha", 2), line("veg-pulao", 1)], status: "sent", estPrepMinutes: 18, createdAt: now - 4 * min, sentAt: now - 3 * min, startedAt: null, readyAt: null, servedAt: null, paid: false },
  ];

  const calls: WaiterCall[] = [
    { id: uid(), tableId: "T6", tags: ["Water", "Napkins"], createdAt: now - 95 * 1000, acknowledgedAt: null, resolvedAt: null },
  ];

  // Earlier paid tables today → live sales metrics
  const pastSales: [number, string, number, Payment["shares"][number]["method"], number][] = [
    // [minutesAgo, table, subtotal, method, splitWays]
    [340, "T1", 1146, "Card", 1],
    [300, "T5", 1874, "Google Pay", 2],
    [255, "T2", 698, "Cash", 1],
    [210, "T3", 2410, "Card", 3],
    [170, "T4", 932, "Apple Pay", 1],
    [130, "T1", 1528, "Google Pay", 2],
    [95, "T5", 587, "Bank transfer", 1],
    [60, "T3", 1312, "Card", 1],
  ];
  const sampleLines: Payment["lines"][] = [
    [{ name: "Paneer Butter Masala", qty: 1, amount: 349, sizeLabel: "Full" }, { name: "Garlic Naan", qty: 4, amount: 356 }, { name: "Mango Lassi", qty: 3, amount: 387 }],
    [{ name: "Subz Dum Biryani", qty: 2, amount: 598 }, { name: "Paneer Tikka", qty: 2, amount: 578, sizeLabel: "Full (8 pc)" }, { name: "Masala Chai", qty: 4, amount: 236 }],
    [{ name: "Dal Makhani", qty: 1, amount: 289, sizeLabel: "Full" }, { name: "Paneer Butter Masala", qty: 1, amount: 349, sizeLabel: "Full" }, { name: "Butter Naan", qty: 3, amount: 207 }],
  ];
  const payments: Payment[] = pastSales.map(([ago, tableId, subtotal, method, ways], i) => {
    const tax = Math.round(subtotal * 0.05);
    const tipPercent = [5, 10, 0, 10, 15, 5, 0, 10][i];
    const tip = Math.round((subtotal * tipPercent) / 100);
    const total = subtotal + tax + tip;
    const paidAt = now - ago * min;
    const base = Math.floor(total / ways);
    return {
      id: uid(),
      receiptNo: `SR-${String(9000 + i)}`,
      tableId,
      sessionId: uid(),
      orderIds: [],
      lines: sampleLines[i % sampleLines.length],
      subtotal,
      tax,
      tipPercent,
      tip,
      total,
      splitWays: ways,
      shares: Array.from({ length: ways }, (_, k) => ({ index: k, amount: k === ways - 1 ? total - base * (ways - 1) : base, method, paidAt, reference: `DEMO-${i}${k}` })),
      paidAt,
      pointsEarned: Math.floor(subtotal / 10),
      demo: true,
    };
  });

  const reviews: Review[] = payments.slice(0, 6).map((p, i) => ({
    id: uid(),
    paymentId: p.id,
    tableId: p.tableId,
    rating: [5, 4, 5, 5, 3, 4][i],
    tags: [["Great food"], ["Fast service"], ["Great food", "Friendly staff"], ["Ambience"], ["Slow service"], ["Great food"]][i],
    createdAt: p.paidAt + 2 * min,
  }));

  const quiz: QuizScore[] = [
    { id: uid(), tableId: "T2", sessionId: s2, player: "Aarav", score: 340, correct: 4, rounds: 5, createdAt: now - 20 * min },
    { id: uid(), tableId: "T2", sessionId: s2, player: "Meera", score: 410, correct: 5, rounds: 5, createdAt: now - 18 * min },
    { id: uid(), tableId: "T3", sessionId: s3, player: "Kabir", score: 260, correct: 3, rounds: 5, createdAt: now - 5 * min },
    { id: uid(), tableId: "T6", sessionId: s6, player: "Zoya", score: 380, correct: 4, rounds: 5, createdAt: now - 12 * min },
  ];

  return {
    settings: [
      {
        id: "main",
        slug: DEMO_SLUG,
        restaurantName: "Spice Route",
        cuisine: "North Indian",
        theme: "saffron",
        defaultLanguage: "en",
        active: true,
        createdAt: now,
        tagline: "Pure veg North Indian kitchen",
        wifiSsid: "SpiceRoute_Guest",
        wifiPassword: "naan-stop-2026",
        taxRate: 0.05,
        pointsPerRupees: 10,
        nextOrderNumber: 106,
      },
    ],
    menu_items: SEED_MENU,
    restaurant_tables: [
      { id: "T1", label: "Table 1", seats: 2, sessionId: null, sessionStartedAt: null, billRequestedAt: null },
      { id: "T2", label: "Table 2", seats: 4, sessionId: s2, sessionStartedAt: now - 48 * min, billRequestedAt: now - 3 * min },
      { id: "T3", label: "Table 3", seats: 4, sessionId: s3, sessionStartedAt: now - 15 * min, billRequestedAt: null },
      { id: "T4", label: "Table 4", seats: 6, sessionId: s4, sessionStartedAt: now - 8 * min, billRequestedAt: null },
      { id: "T5", label: "Table 5", seats: 2, sessionId: null, sessionStartedAt: null, billRequestedAt: null },
      { id: "T6", label: "Table 6", seats: 8, sessionId: s6, sessionStartedAt: now - 35 * min, billRequestedAt: null },
    ],
    orders,
    waiter_calls: calls,
    payments,
    reviews,
    quiz_scores: quiz,
  };
}
