import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Package, Trash2, Pencil, Check } from "lucide-react";

const EMPTY = { medicineId: "", pricePerPiece: "", pricePerPack: "", piecesPerPack: "10", stock: "" };

const PharmacyInventory = () => {
  const { user } = useAuth();
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState("");

  const setF = (k: keyof typeof EMPTY, v: string) => setForm(p => ({ ...p, [k]: v }));

  const load = async (pid: string) => {
    const { data } = await supabase
      .from("pharmacy_inventory")
      .select("*, medicines(name, generic_name)")
      .eq("pharmacy_id", pid);
    setItems(data ?? []);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: ph }, { data: meds }] = await Promise.all([
        supabase.from("pharmacies").select("id").eq("owner_id", user.id).maybeSingle(),
        supabase.from("medicines").select("id, name").order("name").limit(200),
      ]);
      setMedicines(meds ?? []);
      if (ph) { setPharmacyId(ph.id); await load(ph.id); }
      setLoading(false);
    })();
  }, [user]);

  const add = async () => {
    if (!pharmacyId || !form.medicineId || (!form.pricePerPiece && !form.pricePerPack)) {
      return toast({ title: "Please select a medicine and enter at least one price", variant: "destructive" });
    }
    setSaving(true);

    const piecePrice = form.pricePerPiece ? Number(form.pricePerPiece) : null;
    const packPrice  = form.pricePerPack  ? Number(form.pricePerPack)  : null;
    const basePrice  = piecePrice ?? packPrice ?? 0;

    // Try inserting with the new columns first; fall back to legacy schema if migration not yet run
    const fullPayload: any = {
      pharmacy_id: pharmacyId,
      medicine_id: form.medicineId,
      stock: Number(form.stock || 0),
      price: basePrice,
      pieces_per_pack: Number(form.piecesPerPack || 10),
    };
    if (piecePrice != null) fullPayload.price_per_piece = piecePrice;
    if (packPrice  != null) fullPayload.price_per_pack  = packPrice;

    let { error } = await supabase.from("pharmacy_inventory").insert(fullPayload);

    if (error?.message?.includes("schema cache") || error?.message?.includes("column")) {
      // Migration not run yet — fall back to legacy insert (price only)
      const legacy = { pharmacy_id: pharmacyId, medicine_id: form.medicineId, price: basePrice, stock: Number(form.stock || 0) };
      const res = await supabase.from("pharmacy_inventory").insert(legacy);
      error = res.error ?? null;
      if (!res.error) {
        toast({
          title: "Added (limited mode)",
          description: "Run the SQL migration in Supabase to enable piece/pack pricing.",
          variant: "destructive",
        });
      }
    }

    setSaving(false);
    if (error) return toast({ title: error.message, variant: "destructive" });
    setForm(EMPTY);
    load(pharmacyId);
    if (!error) toast({ title: "Medicine added to inventory ✅" });
  };

  const remove = async (id: string) => {
    if (!pharmacyId) return;
    await supabase.from("pharmacy_inventory").delete().eq("id", id);
    load(pharmacyId);
  };

  const saveStock = async (id: string) => {
    await supabase.from("pharmacy_inventory").update({ stock: Number(editStock) }).eq("id", id);
    setEditId(null);
    load(pharmacyId!);
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!pharmacyId) return <div className="container max-w-3xl py-6"><Card><CardContent className="p-6 text-sm text-muted-foreground">Register your pharmacy first from the Overview tab.</CardContent></Card></div>;

  return (
    <div className="container max-w-3xl space-y-5 py-6">
      <h1 className="text-2xl font-bold">Inventory</h1>

      {/* ── Add form ── */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" />Add Medicine</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Medicine select */}
          <div className="grid gap-1">
            <Label>Medicine</Label>
            <select value={form.medicineId} onChange={e => setF("medicineId", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select a medicine…</option>
              {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Row 2: Pricing grid */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="grid gap-1">
              <Label>Price per 1 Piece (₹)</Label>
              <Input type="number" placeholder="e.g. 5" value={form.pricePerPiece} onChange={e => setF("pricePerPiece", e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Price per 1 Pack (₹)</Label>
              <Input type="number" placeholder="e.g. 45" value={form.pricePerPack} onChange={e => setF("pricePerPack", e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Pieces in 1 Pack</Label>
              <Input type="number" placeholder="e.g. 10" value={form.piecesPerPack} onChange={e => setF("piecesPerPack", e.target.value)} />
            </div>
          </div>

          {/* Row 3: Stock */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Stock (total pieces)</Label>
              <Input type="number" placeholder="e.g. 100" value={form.stock} onChange={e => setF("stock", e.target.value)} />
            </div>
          </div>

          {form.pricePerPiece && form.pricePerPack && form.piecesPerPack && (
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">
              💡 Per-piece if bought by pack: <strong>₹{(Number(form.pricePerPack) / Number(form.piecesPerPack)).toFixed(2)}</strong> vs single piece: <strong>₹{Number(form.pricePerPiece).toFixed(2)}</strong>
            </div>
          )}

          <Button onClick={add} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add to Inventory
          </Button>
        </CardContent>
      </Card>

      {/* ── Inventory list ── */}
      {items.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-2 p-10 text-center">
          <Package className="h-8 w-8 text-muted-foreground" />
          <div className="font-semibold">No inventory yet</div>
          <div className="text-sm text-muted-foreground">Add medicines so customers can order from you.</div>
        </CardContent></Card>
      ) : (
        items.map(it => (
          <Card key={it.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{it.medicines?.name}</div>
                  {it.medicines?.generic_name && <div className="text-xs text-muted-foreground">{it.medicines.generic_name}</div>}

                  {/* Pricing badges */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {it.price_per_piece != null && (
                      <Badge variant="secondary" className="text-xs">
                        1 Piece = ₹{Number(it.price_per_piece).toFixed(2)}
                      </Badge>
                    )}
                    {it.price_per_pack != null && (
                      <Badge variant="outline" className="text-xs">
                        1 Pack ({it.pieces_per_pack ?? "?"} pcs) = ₹{Number(it.price_per_pack).toFixed(2)}
                      </Badge>
                    )}
                    {!it.price_per_piece && !it.price_per_pack && (
                      <Badge variant="secondary">₹{Number(it.price).toFixed(2)}</Badge>
                    )}
                  </div>
                </div>

                {/* Stock edit */}
                <div className="flex items-center gap-2 shrink-0">
                  {editId === it.id ? (
                    <>
                      <Input className="h-8 w-20 text-xs" type="number" value={editStock} onChange={e => setEditStock(e.target.value)} />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveStock(it.id)}><Check className="h-4 w-4 text-green-600" /></Button>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-muted-foreground">Stock: <strong>{it.stock}</strong></div>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditId(it.id); setEditStock(String(it.stock)); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default PharmacyInventory;
