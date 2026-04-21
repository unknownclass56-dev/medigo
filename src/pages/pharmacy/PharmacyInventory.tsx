import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Package, Trash2, Pencil, Check, Search, Upload, ImageIcon, CalendarIcon, AlignLeft } from "lucide-react";

const EMPTY = { medicineName: "", medicineId: "", pricePerPiece: "", pricePerPack: "", piecesPerPack: "10", stock: "", description: "", beginDate: "", expiryDate: "" };

const PharmacyInventory = () => {
  const { user } = useAuth();
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [filteredMeds, setFilteredMeds] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const setF = (k: keyof typeof EMPTY, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    if (k === "medicineName") {
      const filtered = medicines.filter(m => m.name.toLowerCase().includes(v.toLowerCase()));
      setFilteredMeds(v ? filtered.slice(0, 5) : []);
      setShowSuggestions(true);
      if (form.medicineId && v !== form.medicineName) setForm(p => ({ ...p, medicineId: "" }));
    }
  };

  const load = async (pid: string) => {
    const { data } = await supabase
      .from("pharmacy_inventory")
      .select("*, medicines(name, generic_name, image_url)")
      .eq("pharmacy_id", pid);
    setItems(data ?? []);
  };

  const fetchMeds = async () => {
    const { data } = await supabase.from("medicines").select("id, name, image_url").order("name");
    setMedicines(data ?? []);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ph } = await supabase.from("pharmacies").select("id").eq("owner_id", user.id).maybeSingle();
      await fetchMeds();
      if (ph) { setPharmacyId(ph.id); await load(ph.id); }
      setLoading(false);
    })();
  }, [user]);

  const selectMed = (med: any) => {
    setForm(p => ({ ...p, medicineName: med.name, medicineId: med.id }));
    setShowSuggestions(false);
  };

  const add = async () => {
    if (!pharmacyId || !form.medicineName || (!form.pricePerPiece && !form.pricePerPack)) {
      return toast({ title: "Please enter medicine name and at least one price", variant: "destructive" });
    }
    setSaving(true);

    let finalMedId = form.medicineId;
    let uploadedImageUrl = medicines.find(m => m.id === finalMedId)?.image_url || null;

    if (imageFile) {
      const fileName = `${Date.now()}-${imageFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("kyc-docs").upload(`medicines/${fileName}`, imageFile);
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage.from("kyc-docs").getPublicUrl(`medicines/${fileName}`);
        uploadedImageUrl = publicUrl;
      }
    }

    if (!finalMedId) {
      const existing = medicines.find(m => m.name.toLowerCase() === form.medicineName.toLowerCase());
      if (existing) {
        finalMedId = existing.id;
        if (uploadedImageUrl) await supabase.from("medicines").update({ image_url: uploadedImageUrl }).eq("id", finalMedId);
      } else {
        const { data: newMed, error: medErr } = await supabase.from("medicines").insert({ name: form.medicineName, image_url: uploadedImageUrl }).select("id").single();
        if (medErr) { setSaving(false); return toast({ title: "Catalog error", description: medErr.message, variant: "destructive" }); }
        finalMedId = newMed.id;
        await fetchMeds();
      }
    } else if (uploadedImageUrl) {
      await supabase.from("medicines").update({ image_url: uploadedImageUrl }).eq("id", finalMedId);
    }

    const piecePrice = form.pricePerPiece ? Number(form.pricePerPiece) : null;
    const packPrice  = form.pricePerPack  ? Number(form.pricePerPack)  : null;
    const basePrice  = piecePrice ?? packPrice ?? 0;

    const { error } = await supabase.from("pharmacy_inventory").insert({
      pharmacy_id: pharmacyId,
      medicine_id: finalMedId,
      stock: Number(form.stock || 0),
      price: basePrice,
      pieces_per_pack: Number(form.piecesPerPack || 10),
      price_per_piece: piecePrice,
      price_per_pack: packPrice,
      description: form.description || null,
      begin_date: form.beginDate || null,
      expiry_date: form.expiryDate || null,
    });

    if (error?.code === '23505') { setSaving(false); return toast({ title: "Already in inventory", variant: "destructive" }); }
    setSaving(false);
    if (error) return toast({ title: error.message, variant: "destructive" });
    setForm(EMPTY);
    setImageFile(null);
    load(pharmacyId);
    toast({ title: "Success ✅", description: "Medicine added to inventory." });
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

  return (
    <div className="container max-w-3xl space-y-5 py-6 font-sans">
      <h1 className="text-2xl font-black text-gray-800 tracking-tight">Inventory Manager</h1>

      <Card className="shadow-elegant border-primary/5">
        <CardHeader className="bg-[#10847E]/5 border-b border-[#10847E]/10 rounded-t-2xl">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-[#10847E] flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Product to Shelf
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">

          {/* Name + Image */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-2 relative">
              <Label className="text-xs font-black uppercase tracking-wider text-gray-500">Product Name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 h-11 rounded-xl" placeholder="e.g. Paracetamol" value={form.medicineName} onChange={e => setF("medicineName", e.target.value)} onFocus={() => setShowSuggestions(true)} />
              </div>
              {showSuggestions && filteredMeds.length > 0 && (
                <div className="absolute z-50 w-full top-[100%] mt-1 bg-white border rounded-xl shadow-2xl overflow-hidden">
                  {filteredMeds.map(m => (
                    <button key={m.id} className="w-full text-left px-4 py-3 text-sm hover:bg-teal-50 flex justify-between items-center border-b last:border-0" onClick={() => selectMed(m)}>
                      <span className="font-bold">{m.name}</span>
                      <Badge variant="secondary" className="text-[9px] font-black uppercase">Existing</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-black uppercase tracking-wider text-gray-500">Product Image</Label>
              <div className="flex items-center gap-3">
                <Input type="file" accept="image/*" className="hidden" id="med-img" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                <Label htmlFor="med-img" className="flex-1 h-11 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
                  {imageFile ? <span className="text-xs font-bold text-teal-600 truncate px-2">{imageFile.name}</span> : <><Upload className="h-4 w-4 text-gray-400" /><span className="text-xs font-bold text-gray-400">Upload Photo</span></>}
                </Label>
                {imageFile && <button onClick={() => setImageFile(null)} className="text-red-500"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1"><AlignLeft className="h-3 w-3" /> Medicine Description</Label>
            <Textarea className="rounded-xl resize-none" rows={2} placeholder="e.g. Used for fever and pain relief. Contains Paracetamol 500mg." value={form.description} onChange={e => setF("description", e.target.value)} />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">₹ Per Piece</Label>
              <Input type="number" value={form.pricePerPiece} onChange={e => setF("pricePerPiece", e.target.value)} className="h-10 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">₹ Per Pack</Label>
              <Input type="number" value={form.pricePerPack} onChange={e => setF("pricePerPack", e.target.value)} className="h-10 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Pcs / Pack</Label>
              <Input type="number" value={form.piecesPerPack} onChange={e => setF("piecesPerPack", e.target.value)} className="h-10 rounded-lg" />
            </div>
          </div>

          {/* Stock + Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Initial Stock (Pcs)</Label>
              <Input type="number" value={form.stock} onChange={e => setF("stock", e.target.value)} className="h-10 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400 tracking-tighter flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> Begin Date</Label>
              <Input type="date" value={form.beginDate} onChange={e => setF("beginDate", e.target.value)} className="h-10 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400 tracking-tighter flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> Expiry Date</Label>
              <Input type="date" value={form.expiryDate} onChange={e => setF("expiryDate", e.target.value)} className="h-10 rounded-lg" />
            </div>
          </div>

          <Button onClick={add} disabled={saving} className="w-full h-12 rounded-xl bg-[#10847E] font-black text-lg shadow-lg shadow-[#10847E]/20">
            {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
            Add to My Shelf
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4 pt-10">
        <h2 className="text-xl font-black text-gray-800 tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6 text-[#10847E]" /> Your Current Shelf
        </h2>
        <div className="grid gap-4">
          {items.map(it => (
            <Card key={it.id} className="hover:shadow-lg transition-all border-none shadow-soft group overflow-hidden bg-white">
              <CardContent className="p-0 flex items-stretch">
                <div className="w-24 bg-gray-50 flex items-center justify-center border-r">
                  {it.medicines?.image_url ? <img src={it.medicines.image_url} className="h-16 w-16 object-contain" /> : <ImageIcon className="h-8 w-8 text-gray-200" />}
                </div>
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <h4 className="font-black text-lg text-gray-800 tracking-tight">{it.medicines?.name}</h4>
                      {it.description && <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{it.description}</p>}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {it.price_per_piece && <Badge variant="outline" className="text-[10px] font-black">₹{it.price_per_piece}/pc</Badge>}
                        {it.price_per_pack && <Badge variant="outline" className="text-[10px] font-black">₹{it.price_per_pack}/pk</Badge>}
                        {it.begin_date && <Badge variant="secondary" className="text-[10px] font-black">From: {new Date(it.begin_date).toLocaleDateString('en-IN')}</Badge>}
                        {it.expiry_date && (
                          <Badge className={`text-[10px] font-black border ${new Date(it.expiry_date) < new Date() ? 'bg-red-100 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            Exp: {new Date(it.expiry_date).toLocaleDateString('en-IN')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right">
                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">STOCK</div>
                        {editId === it.id ? (
                          <div className="flex items-center gap-1">
                            <Input type="number" value={editStock} onChange={e => setEditStock(e.target.value)} className="w-20 h-8 text-center text-sm font-black" />
                            <Button size="icon" className="h-8 w-8" onClick={() => saveStock(it.id)}><Check className="h-3 w-3" /></Button>
                          </div>
                        ) : (
                          <div className="text-2xl font-black text-[#10847E]">{it.stock} <span className="text-[10px] text-gray-400">pcs</span></div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-primary" onClick={() => { setEditId(it.id); setEditStock(String(it.stock)); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PharmacyInventory;
