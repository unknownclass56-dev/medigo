import { useEffect, useState } from "react";
import { Search, Plus, Pill, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCart, distanceKm } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

interface MedicineCard {
  medicine_id: string;
  name: string;
  generic_name: string | null;
  manufacturer: string | null;
  requires_prescription: boolean;
  price: number;
  price_per_piece: number | null;
  price_per_pack: number | null;
  pieces_per_pack: number;
  distance_km: number;
}

const CustomerSearch = () => {
  const { user } = useAuth();
  const { add, count } = useCart();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MedicineCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  // Track selected unit for each medicine card
  const [unitSelections, setUnitSelections] = useState<Record<string, "piece" | "pack">>({});

  useEffect(() => {
    if (!user) return;
    supabase.from("addresses").select("lat,lng").eq("user_id", user.id).eq("is_default", true).maybeSingle()
      .then(({ data }) => { if (data) setMe({ lat: data.lat, lng: data.lng }); });
  }, [user]);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      let invQuery = supabase
        .from("pharmacy_inventory")
        .select("medicine_id, price, price_per_piece, price_per_pack, pieces_per_pack, medicines!inner(id, name, generic_name, manufacturer, requires_prescription), pharmacies!inner(status, is_open, lat, lng)")
        .gt("stock", 0)
        .eq("pharmacies.status", "approved")
        .eq("pharmacies.is_open", true)
        .limit(200);
      if (q.trim()) invQuery = invQuery.ilike("medicines.name", `%${q.trim()}%`);
      const { data } = await invQuery;

      const map = new Map<string, MedicineCard>();
      (data ?? []).forEach((row: any) => {
        const m = row.medicines;
        const ph = row.pharmacies;
        if (!m || !ph) return;
        const dist = me ? distanceKm(me, { lat: ph.lat, lng: ph.lng }) : 0;
        const piecePx = row.price_per_piece != null ? Number(row.price_per_piece) : Number(row.price);
        const cur = map.get(m.id);
        if (!cur || piecePx < cur.price) {
          map.set(m.id, {
            medicine_id: m.id,
            name: m.name,
            generic_name: m.generic_name,
            manufacturer: m.manufacturer,
            requires_prescription: m.requires_prescription,
            price: piecePx,
            price_per_piece: row.price_per_piece != null ? Number(row.price_per_piece) : null,
            price_per_pack: row.price_per_pack != null ? Number(row.price_per_pack) : null,
            pieces_per_pack: row.pieces_per_pack ?? 10,
            distance_km: dist,
          });
        }
      });
      setResults(Array.from(map.values()).sort((a, b) =>
        me ? a.distance_km - b.distance_km : a.name.localeCompare(b.name),
      ));
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, me]);

  const getUnit = (id: string, m: MedicineCard): "piece" | "pack" => {
    if (unitSelections[id]) return unitSelections[id];
    // default: piece if available, else pack
    return m.price_per_piece != null ? "piece" : "pack";
  };

  const setUnit = (id: string, unit: "piece" | "pack") =>
    setUnitSelections(prev => ({ ...prev, [id]: unit }));

  const onAdd = (m: MedicineCard) => {
    const unit = getUnit(m.medicine_id, m);
    const effectivePrice = unit === "pack" && m.price_per_pack != null
      ? m.price_per_pack
      : m.price_per_piece ?? m.price;

    add({
      medicine_id: m.medicine_id,
      name: m.name,
      price: effectivePrice,
      requires_prescription: m.requires_prescription,
      unit_type: unit,
      price_per_piece: m.price_per_piece,
      price_per_pack: m.price_per_pack,
      pieces_per_pack: m.pieces_per_pack,
    });
    toast({
      title: "Added to cart",
      description: `${m.name} (1 ${unit}) · ₹${effectivePrice.toFixed(2)}`,
    });
  };

  return (
    <div className="container max-w-3xl space-y-4 py-6 pb-28">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Search medicines</h1>
        {count > 0 && (
          <Button asChild size="sm" variant="secondary">
            <a href="/app/cart">Cart · {count}</a>
          </Button>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try Paracetamol, Crocin…" className="pl-9 h-11" />
      </div>

      {loading && <div className="text-sm text-muted-foreground">Searching…</div>}
      {!loading && results.length === 0 && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No medicines available right now.</CardContent></Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {results.map((m) => {
          const unit = getUnit(m.medicine_id, m);
          const effectivePrice = unit === "pack" && m.price_per_pack != null
            ? m.price_per_pack
            : m.price_per_piece ?? m.price;
          const hasBothOptions = m.price_per_piece != null && m.price_per_pack != null;

          return (
            <Card key={m.medicine_id} className="shadow-soft transition hover:shadow-elegant">
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Pill className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold leading-tight">{m.name}</div>
                      {m.requires_prescription && <Badge variant="outline" className="shrink-0">Rx</Badge>}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {m.generic_name ?? "—"}{m.manufacturer ? ` · ${m.manufacturer}` : ""}
                    </div>
                  </div>
                </div>

                {/* Unit selector — only show if medicine has both options */}
                {hasBothOptions && (
                  <div className="flex gap-1.5 rounded-lg bg-muted/50 p-1">
                    <button
                      onClick={() => setUnit(m.medicine_id, "piece")}
                      className={`flex-1 rounded-md py-1 text-xs font-semibold transition ${unit === "piece" ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      1 Piece · ₹{m.price_per_piece!.toFixed(2)}
                    </button>
                    <button
                      onClick={() => setUnit(m.medicine_id, "pack")}
                      className={`flex-1 rounded-md py-1 text-xs font-semibold transition ${unit === "pack" ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Package className="inline h-3 w-3 mr-0.5" />
                      1 Pack ({m.pieces_per_pack} pcs) · ₹{m.price_per_pack!.toFixed(2)}
                    </button>
                  </div>
                )}

                <div className="mt-auto flex items-end justify-between">
                  <div>
                    <div className="text-lg font-bold">₹{effectivePrice.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      {hasBothOptions
                        ? (unit === "pack" ? `per pack of ${m.pieces_per_pack}` : "per piece")
                        : m.price_per_pack != null ? `per pack of ${m.pieces_per_pack}` : "per piece"
                      }
                      {me && ` · ${m.distance_km < 1 ? "<1 km" : `${m.distance_km.toFixed(1)} km`} away`}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => onAdd(m)}>
                    <Plus className="mr-1 h-4 w-4" />Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CustomerSearch;
