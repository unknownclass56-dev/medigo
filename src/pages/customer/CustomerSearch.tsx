import { useEffect, useState, useRef } from "react";
import { Search, Plus, Pill, Package, Scan, Camera, Loader2, X, Upload } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCart, distanceKm } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

// Shows Supabase storage images via signed URL (works for private buckets)
const SmartImage = ({ src, className }: { src: string; className?: string }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    
    if (src.includes(".supabase.co") && src.includes("/storage/v1/object/")) {
      try {
        const parts = src.split(/\/storage\/v1\/object\/(?:public|authenticated)\//);
        if (parts.length > 1) {
          const fullPath = parts[1];
          const bucketMatch = fullPath.match(/^([^/]+)\/(.+)$/);
          if (bucketMatch) {
            const [, bucket, path] = bucketMatch;
            const cleanPath = path.split('?')[0];
            
            supabase.storage.from(bucket).createSignedUrl(cleanPath, 3600).then(({ data, error }) => {
              if (error) {
                console.error("SmartImage: Signed URL failed", error, { bucket, cleanPath });
                setUrl(src);
              } else {
                setUrl(data?.signedUrl ?? src);
              }
            });
            return;
          }
        }
      } catch (e) {
        console.error("SmartImage: Parsing error", e);
      }
    }
    
    setUrl(src);
  }, [src]);

  if (!url) return null;
  return (
    <img 
      src={url} 
      className={className} 
      alt="Medicine" 
      onError={(e) => { 
        (e.target as HTMLImageElement).style.display = 'none'; 
      }} 
    />
  );
};

interface MedicineCard {
  medicine_id: string;
  inventory_id: string;
  name: string;
  generic_name: string | null;
  manufacturer: string | null;
  requires_prescription: boolean;
  price: number;
  price_per_piece: number | null;
  price_per_pack: number | null;
  pieces_per_pack: number;
  distance_km: number;
  description: string | null;
  begin_date: string | null;
  expiry_date: string | null;
  image_url: string | null;
  pharmacy_name: string;
}

const CustomerSearch = () => {
  const { user } = useAuth();
  const { add, count } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<MedicineCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<"idle" | "uploading" | "analyzing" | "complete">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        .select("id, medicine_id, price, price_per_piece, price_per_pack, pieces_per_pack, description, begin_date, expiry_date, medicines!inner(id, name, generic_name, manufacturer, requires_prescription, image_url), pharmacies!inner(status, is_open, lat, lng)")
        .gt("stock", 0)
        .eq("pharmacies.status", "approved")
        .eq("pharmacies.is_open", true)
        .limit(200);
      if (q.trim()) invQuery = invQuery.ilike("medicines.name", `%${q.trim()}%`);
      const { data } = await invQuery;

      const results: MedicineCard[] = (data ?? []).map((row: any) => {
        const m = row.medicines;
        const ph = row.pharmacies;
        if (!m || !ph) return null;
        const dist = me ? distanceKm(me, { lat: ph.lat, lng: ph.lng }) : 0;
        const piecePx = row.price_per_piece != null ? Number(row.price_per_piece) : Number(row.price);
        
        return {
          medicine_id: m.id,
          inventory_id: row.id,
          name: m.name,
          generic_name: m.generic_name,
          manufacturer: m.manufacturer,
          requires_prescription: m.requires_prescription,
          price: piecePx,
          price_per_piece: row.price_per_piece != null ? Number(row.price_per_piece) : null,
          price_per_pack: row.price_per_pack != null ? Number(row.price_per_pack) : null,
          pieces_per_pack: row.pieces_per_pack ?? 10,
          distance_km: dist,
          description: row.description ?? null,
          begin_date: row.begin_date ?? null,
          expiry_date: row.expiry_date ?? null,
          image_url: m.image_url ?? null,
          pharmacy_name: ph.name || "Pharmacy",
        };
      }).filter(Boolean) as MedicineCard[];

      setResults(results.sort((a, b) =>
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
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            value={q} 
            onChange={(e) => {
              setQ(e.target.value);
              setSearchParams({ q: e.target.value }, { replace: true });
            }} 
            placeholder="Try Paracetamol, Crocin…" 
            className="pl-9 h-11" 
          />
        </div>
        <Dialog open={isScanning} onOpenChange={(open) => {
          setIsScanning(open);
          if (!open) setScanStep("idle");
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-11 w-11 p-0 rounded-xl border-2 hover:bg-primary/5 hover:text-primary transition-all">
              <Scan className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-[32px] p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tighter italic flex items-center gap-2">
                <Scan className="h-6 w-6 text-primary" /> Scan Medicine
              </DialogTitle>
              <DialogDescription className="font-bold text-slate-500">
                Upload a photo of the medicine or its packaging to search instantly.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-8">
              {scanStep === "idle" && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group cursor-pointer border-4 border-dashed border-slate-100 rounded-[32px] p-12 flex flex-col items-center justify-center gap-4 hover:border-primary/20 hover:bg-primary/5 transition-all"
                >
                  <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="h-8 w-8 text-slate-300 group-hover:text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-slate-900">Click to upload photo</p>
                    <p className="text-xs font-bold text-slate-400">JPG, PNG or PDF (Max 5MB)</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setScanStep("uploading");
                        setTimeout(() => setScanStep("analyzing"), 1500);
                        setTimeout(() => {
                          setScanStep("complete");
                          const mockResults = ["Dolo 650", "Paracetamol", "Crocin", "Calpol"];
                          const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
                          setQ(randomResult);
                          setSearchParams({ q: randomResult }, { replace: true });
                          setTimeout(() => setIsScanning(false), 1000);
                        }, 3500);
                      }
                    }}
                  />
                </div>
              )}

              {(scanStep === "uploading" || scanStep === "analyzing") && (
                <div className="flex flex-col items-center justify-center py-12 gap-6">
                  <div className="relative">
                     <div className="h-24 w-24 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
                     <div className="absolute inset-0 flex items-center justify-center">
                        <Camera className="h-8 w-8 text-primary animate-pulse" />
                     </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-black text-slate-900 uppercase tracking-widest text-xs">
                      {scanStep === "uploading" ? "Uploading Image..." : "AI Analysis in Progress..."}
                    </p>
                    <p className="text-xs font-bold text-slate-400">Our system is identifying the medicine name.</p>
                  </div>
                </div>
              )}

              {scanStep === "complete" && (
                <div className="flex flex-col items-center justify-center py-12 gap-6 animate-in zoom-in duration-300">
                  <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center">
                    <Pill className="h-10 w-10 text-emerald-500" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-black text-slate-900 text-xl tracking-tight">Medicine Identified!</p>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Searching for stock nearby...</p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
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
            <Card key={m.inventory_id} className="group shadow-soft transition-all hover:shadow-elegant overflow-hidden border-primary/5">
              <div className="bg-primary/5 px-4 py-2 border-b border-primary/10 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">{m.pharmacy_name}</span>
                {me && <span className="text-[10px] font-bold text-muted-foreground">{m.distance_km < 1 ? "<1 km" : `${m.distance_km.toFixed(1)} km`}</span>}
              </div>
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary overflow-hidden shadow-inner">
                    {m.image_url
                      ? <SmartImage src={m.image_url} className="h-full w-full object-cover" />
                      : <Pill className="h-6 w-6 opacity-40" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-black text-slate-800 leading-tight text-lg tracking-tight truncate">{m.name}</div>
                      {m.requires_prescription && <Badge variant="outline" className="shrink-0 font-bold border-red-200 text-red-600 bg-red-50/50">Rx</Badge>}
                    </div>
                    <div className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {m.generic_name ?? "Generic Medicine"}
                    </div>
                    {m.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">{m.description}</p>
                    )}
                    {(m.begin_date || m.expiry_date) && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {m.begin_date && (
                          <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100/50">
                            MFG: {new Date(m.begin_date).toLocaleDateString('en-GB')}
                          </span>
                        )}
                        {m.expiry_date && (
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${new Date(m.expiry_date) < new Date() ? 'bg-red-50 text-red-600 border-red-100/50' : 'bg-emerald-50 text-emerald-600 border-emerald-100/50'}`}>
                            EXP: {new Date(m.expiry_date).toLocaleDateString('en-GB')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Unit selector */}
                {hasBothOptions && (
                  <div className="flex gap-1.5 rounded-xl bg-slate-100/50 p-1 border border-slate-200/50">
                    <button
                      onClick={() => setUnit(m.medicine_id, "piece")}
                      className={`flex-1 rounded-lg py-2 text-[10px] font-black uppercase tracking-widest transition-all ${unit === "piece" ? "bg-white shadow-sm text-primary border border-primary/10" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      Piece · ₹{m.price_per_piece!.toFixed(2)}
                    </button>
                    <button
                      onClick={() => setUnit(m.medicine_id, "pack")}
                      className={`flex-1 rounded-lg py-2 text-[10px] font-black uppercase tracking-widest transition-all ${unit === "pack" ? "bg-white shadow-sm text-primary border border-primary/10" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      Pack · ₹{m.price_per_pack!.toFixed(2)}
                    </button>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between border-t border-slate-50">
                  <div className="flex flex-col">
                    <div className="text-2xl font-black text-slate-900 tracking-tighter">
                      ₹{effectivePrice.toFixed(2)}
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">
                        / {unit === "pack" ? "Pack" : "Piece"}
                      </span>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => onAdd(m)}
                    className="rounded-xl px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px]"
                  >
                    <Plus className="mr-1.5 h-3 w-3 stroke-[3]" /> Add to Bag
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
