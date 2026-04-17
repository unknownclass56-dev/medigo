import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export interface CartItem {
  medicine_id: string;
  name: string;
  price: number;              // effective unit price (either piece or pack price)
  quantity: number;
  requires_prescription: boolean;
  unit_type: "piece" | "pack"; // what the customer is buying
  price_per_piece: number | null;
  price_per_pack: number | null;
  pieces_per_pack: number;    // how many pieces are in one pack
}

interface CartCtx {
  items: CartItem[];
  add: (m: Omit<CartItem, "quantity">) => void;
  remove: (id: string) => void;
  setQty: (id: string, q: number) => void;
  clear: () => void;
  subtotal: number;
  count: number;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "medigo.cart.v2";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);

  const add: CartCtx["add"] = (m) => setItems((cur) => {
    // match by medicine_id AND unit_type — so piece and pack are separate cart lines
    const key = `${m.medicine_id}__${m.unit_type}`;
    const ex = cur.find(i => `${i.medicine_id}__${i.unit_type}` === key);
    if (ex) return cur.map(i => `${i.medicine_id}__${i.unit_type}` === key ? { ...i, quantity: i.quantity + 1 } : i);
    return [...cur, { ...m, quantity: 1 }];
  });

  const remove = (id: string) => setItems(cur => cur.filter(i => i.medicine_id !== id));

  const setQty = (id: string, q: number) => setItems(cur =>
    q <= 0 ? cur.filter(i => i.medicine_id !== id) : cur.map(i => i.medicine_id === id ? { ...i, quantity: q } : i));

  const clear = () => setItems([]);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return <Ctx.Provider value={{ items, add, remove, setQty, clear, subtotal, count }}>{children}</Ctx.Provider>;
};

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
};

// Haversine distance in km
export const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

// ₹10 per km, rounded up, min ₹10
export const calcDeliveryFee = (km: number) => Math.max(10, Math.ceil(km) * 10);
