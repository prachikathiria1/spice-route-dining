export type Station = "Tandoor" | "Curry" | "Cold" | "Drinks";
export const STATIONS: Station[] = ["Tandoor", "Curry", "Cold", "Drinks"];

export type Category = "Starters" | "Mains" | "Breads" | "Rice" | "Desserts" | "Drinks";
export const CATEGORIES: Category[] = ["Starters", "Mains", "Breads", "Rice", "Desserts", "Drinks"];

export const ALLERGENS = ["Dairy", "Nuts", "Gluten", "Egg", "Soy", "Sesame", "Mustard", "Shellfish"] as const;
export type Allergen = (typeof ALLERGENS)[number];

export interface SizeOption {
  id: string;
  label: string; // "Half" / "Full"
  price: number;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  /** If set, shown as a deal: "save ₹(originalPrice - price)" */
  originalPrice?: number;
  isCombo?: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: Category;
  station: Station;
  price: number; // base price (used when no sizes)
  sizes?: SizeOption[];
  addOns?: AddOn[];
  allergens: Allergen[];
  spiceLevel: 0 | 1 | 2 | 3;
  veg: boolean;
  prepMinutes: number;
  available: boolean;
  popular?: boolean;
  /** Photo URL. Seed dishes fall back to the bundled photo in /public/dishes. */
  image?: string;
  sortOrder: number;
}

export type StaffRole = "admin" | "waiter";
export type ViewRole = StaffRole | "customer";

export interface RestaurantTable {
  id: string; // "T1"
  label: string; // "Table 1"
  seats: number;
  sessionId: string | null;
  sessionStartedAt: number | null;
  billRequestedAt: number | null;
}

export type OrderStatus = "placed" | "sent" | "preparing" | "ready" | "served" | "cancelled";
export const ORDER_FLOW: OrderStatus[] = ["placed", "sent", "preparing", "ready", "served"];

export interface OrderLine {
  lineId: string;
  menuItemId: string;
  name: string;
  station: Station;
  sizeLabel?: string;
  unitPrice: number; // size price + add-ons
  qty: number;
  addOns: { id: string; name: string; price: number }[];
  notes?: string;
  done?: boolean; // ticked off at its KDS station
}

export interface Order {
  id: string;
  number: number; // short human ticket number
  tableId: string;
  sessionId: string;
  lines: OrderLine[];
  status: OrderStatus;
  estPrepMinutes: number;
  createdAt: number;
  sentAt: number | null;
  startedAt: number | null;
  readyAt: number | null;
  servedAt: number | null;
  paid: boolean;
  guestName?: string;
}

export type CallTag = "Water" | "Napkins" | "Bill" | "Cutlery" | "Other";
export const CALL_TAGS: CallTag[] = ["Water", "Napkins", "Bill", "Cutlery"];

export interface WaiterCall {
  id: string;
  tableId: string;
  tags: CallTag[];
  note?: string;
  createdAt: number;
  acknowledgedAt: number | null;
  resolvedAt: number | null;
}

export type PaymentMethod = "Cash" | "Bank transfer" | "Card" | "Apple Pay" | "Google Pay";
export const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "Bank transfer", "Card", "Apple Pay", "Google Pay"];

export interface PaymentShare {
  index: number;
  amount: number;
  method: PaymentMethod;
  paidAt: number;
  reference: string;
}

export interface Payment {
  id: string;
  receiptNo: string;
  tableId: string;
  sessionId: string;
  orderIds: string[];
  lines: { name: string; qty: number; amount: number; sizeLabel?: string }[];
  subtotal: number;
  tax: number;
  tipPercent: number;
  tip: number;
  total: number;
  splitWays: number;
  shares: PaymentShare[];
  paidAt: number;
  pointsEarned: number;
  receiptEmail?: string;
  demo: true;
}

export interface Review {
  id: string;
  paymentId: string;
  tableId: string;
  rating: number; // 1-5
  tags: string[];
  comment?: string;
  createdAt: number;
}

export interface QuizScore {
  id: string;
  tableId: string;
  sessionId: string | null;
  player: string;
  score: number;
  correct: number;
  rounds: number;
  createdAt: number;
}

export interface Settings {
  id: "main";
  restaurantName: string;
  tagline: string;
  wifiSsid: string;
  wifiPassword: string;
  taxRate: number; // e.g. 0.05 GST
  pointsPerRupees: number; // 1 point per N rupees
  nextOrderNumber: number;
}

export interface DbState {
  settings: Settings[];
  menu_items: MenuItem[];
  restaurant_tables: RestaurantTable[];
  orders: Order[];
  waiter_calls: WaiterCall[];
  payments: Payment[];
  reviews: Review[];
  quiz_scores: QuizScore[];
}

export type Collection = keyof DbState;
export const COLLECTIONS: Collection[] = [
  "settings",
  "menu_items",
  "restaurant_tables",
  "orders",
  "waiter_calls",
  "payments",
  "reviews",
  "quiz_scores",
];

export type RecordOf<C extends Collection> = DbState[C][number];

export type TableStatus = "Free" | "Ordering" | "Eating" | "Bill";
