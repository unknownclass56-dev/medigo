import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter 
} from "@/components/ui/sheet";
import { 
  Pill, Search, ShoppingCart, User, MapPin, 
  ChevronRight, Star, Clock, ShieldCheck, 
  Package, LayoutDashboard, Truck, X, Minus, Plus, ShoppingBag, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, primaryRoleRoute } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { toast } from "@/hooks/use-toast";

const Landing = () => {
  const { user, roles } = useAuth();
  const { items, add, remove, setQty, subtotal, count } = useCart();
  const navigate = useNavigate();
  
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState<string>("Detecting...");
  const [banner, setBanner] = useState({
    title: "Get your medicines Delivered in 30 Mins.",
    subtitle: "Verified Pharmacies. Trusted Logistics. Best Prices.",
    badge: "FLAT 25% OFF"
  });

  // Auto-detect location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
            const data = await res.json();
            setLocation(data.address.city || data.address.town || data.address.village || "Location Detected");
          } catch {
            setLocation("Location Detected");
          }
        },
        () => setLocation("Select Location")
      );
    } else {
      setLocation("Location Unsupported");
    }
  }, []);

  // Fetch medicines and banner config
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Fetch inventory joined with medicines and pharmacies
        // We fetch ALL pharmacy inventory that is approved and has stock
        const { data: inv, error: invErr } = await supabase
          .from("pharmacy_inventory")
          .select(`
            id, price, price_per_piece, price_per_pack, pieces_per_pack, stock,
            medicines!inner ( id, name, generic_name, image_url, requires_prescription, category ),
            pharmacies!inner ( id, name, city, status )
          `)
          .eq("pharmacies.status", "approved")
          .gt("stock", 0)
          .limit(20);
        
        if (invErr) console.error("Inventory Fetch Error:", invErr);
        if (inv) setMedicines(inv);

        const { data: config } = await supabase.from("platform_config").select("*").eq("id", 1).maybeSingle();
        if (config) {
          setBanner({
            title: config.banner_title || banner.title,
            subtitle: config.banner_subtitle || banner.subtitle,
            badge: config.banner_badge || banner.badge
          });
        }
      } catch (err) {
        console.error("Initialization Error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const filteredMedicines = useMemo(() => {
    if (!searchQuery) return medicines;
    return medicines.filter(m => 
      m.medicines?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.medicines?.generic_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, medicines]);

  const handleAddToCart = (item: any) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please sign in to add items to your cart." });
      navigate("/auth");
      return;
    }
    
    if (!roles || !roles.includes("customer")) {
      toast({ title: "Access Denied", description: "Only customers can buy medicines.", variant: "destructive" });
      return;
    }

    add({
      medicine_id: item.medicines?.id,
      name: item.medicines?.name || "Medicine",
      price: item.price_per_piece || item.price,
      unit_type: item.price_per_piece ? "piece" : "pack",
      pieces_per_pack: item.pieces_per_pack || 10,
      requires_prescription: item.medicines?.requires_prescription || false,
      price_per_piece: item.price_per_piece,
      price_per_pack: item.price_per_pack,
    });
    toast({ title: "Added!", description: `${item.medicines?.name} added to cart.` });
  };

  return (
    <div className="min-h-screen bg-[#F5F7F7] font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10847E] text-white shadow-lg">
              <Pill className="h-6 w-6" />
            </div>
            <span className="text-2xl font-black text-[#10847E] tracking-tighter">MediGo</span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground border-r pr-2">
              <MapPin className="h-4 w-4 text-[#10847E]" />
              <span className="text-[10px] font-black uppercase tracking-tight">{location}</span>
            </div>
            <Input 
              placeholder="Search for medicines, health products..." 
              className="pl-32 pr-12 h-12 rounded-full border-2 border-gray-100 focus:border-[#10847E] transition-all bg-gray-50/50 font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button className="absolute right-1 top-1 h-10 w-10 rounded-full bg-[#10847E] hover:bg-[#0d6b66] p-0">
              <Search className="h-5 w-5 text-white" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild variant="ghost" className="hidden sm:flex gap-2 font-black text-gray-600 uppercase text-[10px] tracking-widest">
                <Link to={primaryRoleRoute(roles)}>
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            ) : (
              <Button asChild variant="ghost" className="hidden sm:flex gap-2 font-black text-gray-600 uppercase text-[10px] tracking-widest">
                <Link to="/auth">
                  <User className="h-4 w-4" />
                  Sign In
                </Link>
              </Button>
            )}

            {/* Side Cart Drawer */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative h-11 px-5 rounded-xl border-2 border-gray-100 hover:border-[#10847E] hover:bg-teal-50 group transition-all">
                  <ShoppingCart className="h-5 w-5 mr-2 text-[#10847E]" />
                  <span className="font-black text-gray-700 uppercase text-[10px] tracking-widest">Cart</span>
                  {count > 0 && (
                    <span className="absolute -top-2 -right-2 h-6 w-6 bg-orange-500 text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-lg border-2 border-white">
                      {count}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md flex flex-col p-0 border-l-0 shadow-2xl">
                <SheetHeader className="p-6 border-b bg-teal-50/30">
                  <SheetTitle className="flex items-center gap-3 text-[#10847E] font-black uppercase tracking-[0.2em] text-xs">
                    <ShoppingBag className="h-5 w-5" /> My Shopping Bag
                  </SheetTitle>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                  {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                       <div className="h-24 w-24 rounded-full bg-gray-50 flex items-center justify-center">
                          <ShoppingCart className="h-10 w-10 text-gray-200" />
                       </div>
                       <div className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Your bag is currently empty</div>
                       <Button asChild variant="link" className="text-[#10847E] font-bold"><Link to="/">Start Shopping</Link></Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {items.map((it) => (
                        <div key={`${it.medicine_id}_${it.unit_type}`} className="flex gap-4 group animate-in slide-in-from-right duration-300">
                          <div className="h-20 w-20 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100">
                            <Pill className="h-10 w-10 text-gray-200" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <h4 className="font-black text-sm text-gray-800 line-clamp-1">{it.name}</h4>
                            <div className="flex items-center gap-2">
                               <Badge variant="secondary" className="text-[8px] font-black uppercase bg-gray-100">{it.unit_type}</Badge>
                               <span className="text-[10px] font-bold text-muted-foreground tracking-tight">₹{it.price.toFixed(2)} / unit</span>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                               <div className="flex items-center gap-3 bg-white border-2 border-gray-100 rounded-xl px-2 py-1 shadow-sm">
                                  <button onClick={() => setQty(it.medicine_id, it.quantity - 1)} className="hover:text-red-500 transition-colors p-1"><Minus className="h-3 w-3" /></button>
                                  <span className="text-sm font-black w-6 text-center">{it.quantity}</span>
                                  <button onClick={() => setQty(it.medicine_id, it.quantity + 1)} className="hover:text-teal-500 transition-colors p-1"><Plus className="h-3 w-3" /></button>
                               </div>
                               <span className="font-black text-base text-[#10847E]">₹{(it.price * it.quantity).toFixed(2)}</span>
                            </div>
                          </div>
                          <button onClick={() => remove(it.medicine_id)} className="h-8 w-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all self-start"><X className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {items.length > 0 && (
                  <SheetFooter className="p-8 border-t bg-white flex-col gap-6">
                    <div className="space-y-3 w-full">
                       <div className="flex justify-between items-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                          <span>Subtotal</span>
                          <span>₹{subtotal.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between items-center text-gray-900 font-black">
                          <span className="uppercase tracking-widest text-xs">Total Amount</span>
                          <span className="text-3xl tracking-tighter">₹{subtotal.toFixed(2)}</span>
                       </div>
                    </div>
                    <Button asChild className="w-full h-14 rounded-2xl bg-[#10847E] hover:bg-[#0d6b66] font-black text-lg shadow-2xl shadow-teal-900/20 transition-all active:scale-95">
                       <Link to="/app/cart" className="flex items-center gap-2">
                          Secure Checkout <ChevronRight className="h-5 w-5" />
                       </Link>
                    </Button>
                  </SheetFooter>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-12">
        
        {/* Category Selector */}
        <section className="flex justify-center gap-8 py-4 overflow-x-auto scrollbar-hide">
           <div 
             className="flex flex-col items-center gap-3 group cursor-pointer" 
             onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
           >
              <div className="h-16 w-16 rounded-[24px] bg-teal-50 text-[#10847E] flex items-center justify-center shadow-lg shadow-teal-900/5 group-hover:scale-110 transition-all border-2 border-teal-100">
                <Pill className="h-8 w-8" />
              </div>
              <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Medicine</span>
           </div>
           
           <div className="flex flex-col items-center gap-3 group cursor-pointer opacity-40 grayscale" onClick={() => toast({ title: "Coming Soon!", description: "Lab Tests will be available in the next update." })}>
              <div className="h-16 w-16 rounded-[24px] bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-all">
                <Clock className="h-8 w-8" />
              </div>
              <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Lab Tests</span>
           </div>
        </section>

        {/* Promotional Banner */}
        <section className="rounded-[40px] overflow-hidden relative min-h-[320px] shadow-3xl group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#10847E] via-[#15a39c] to-[#0d6b66] group-hover:scale-105 transition-transform duration-1000" />
          <div className="relative h-full flex items-center p-10 md:p-20">
            <div className="max-w-2xl space-y-8">
              <Badge className="bg-yellow-400 text-black border-none text-[10px] font-black px-5 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg">
                {banner.badge}
              </Badge>
              <h1 className="text-5xl md:text-7xl font-black text-white leading-[0.9] tracking-tighter">
                {banner.title}
              </h1>
              <p className="text-white/80 font-bold text-xl md:text-2xl leading-relaxed">{banner.subtitle}</p>
              <Button size="lg" className="bg-white text-[#10847E] hover:bg-teal-50 font-black rounded-2xl h-16 px-10 shadow-2xl transition-all active:scale-95 text-lg">
                Shop Medicines <ChevronRight className="ml-2 h-6 w-6" />
              </Button>
            </div>
          </div>
        </section>

        {/* Medicines Catalog */}
        <section id="catalog" className="space-y-10 scroll-mt-24">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter flex items-center gap-3 italic">
               <div className="h-10 w-3 bg-[#10847E] rounded-full shadow-lg" /> All Medicines
            </h2>
            <div className="text-[10px] font-black text-[#10847E] uppercase tracking-[0.3em] bg-teal-50 px-4 py-2 rounded-full border border-teal-100">
               Live Inventory
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <Card key={i} className="h-96 animate-pulse bg-white border-none rounded-[32px] shadow-soft" />
              ))
            ) : filteredMedicines.length === 0 ? (
               <div className="col-span-full py-32 text-center bg-white rounded-[40px] border-4 border-dashed border-gray-100">
                  <Package className="h-20 w-20 text-gray-100 mx-auto mb-6" />
                  <div className="font-black text-gray-300 uppercase tracking-[0.5em] text-sm">No Inventory Found</div>
               </div>
            ) : (
              filteredMedicines.map((item) => (
                <Card key={item.id} className="group hover:shadow-[0_32px_64px_-16px_rgba(16,132,126,0.15)] transition-all duration-700 border-none bg-white flex flex-col overflow-hidden rounded-[32px] shadow-soft hover:-translate-y-2">
                  <div className="h-56 bg-gray-50/50 flex items-center justify-center p-10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    {item.medicines?.image_url ? (
                      <img src={item.medicines.image_url} alt={item.medicines.name} className="h-full object-contain group-hover:scale-110 transition-transform duration-700 ease-out" />
                    ) : (
                      <div className="h-24 w-24 rounded-[32px] bg-white shadow-2xl shadow-gray-200/50 flex items-center justify-center">
                         <Pill className="h-12 w-12 text-gray-100" />
                      </div>
                    )}
                    {item.medicines?.requires_prescription && (
                      <Badge className="absolute top-5 left-5 bg-[#10847E] text-white border-none text-[8px] font-black uppercase tracking-widest px-3 py-1 shadow-xl">Rx</Badge>
                    )}
                  </div>
                  <CardContent className="p-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="text-[10px] font-black text-[#10847E]/60 uppercase tracking-[0.2em]">{item.pharmacies?.name || "MediGo Network"}</div>
                      <h3 className="font-black text-gray-800 text-xl leading-none tracking-tight">{item.medicines?.name}</h3>
                      <p className="text-xs text-muted-foreground font-bold leading-relaxed line-clamp-1">{item.medicines?.generic_name || "Premium Health Product"}</p>
                    </div>
                    
                    <div className="mt-6 pt-5 border-t border-gray-50 flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-black text-gray-900 tracking-tighter">₹{(item.price_per_piece || item.price).toFixed(2)}</div>
                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Per {item.price_per_piece ? "Piece" : "Pack"}</div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleAddToCart(item)}
                        className="bg-[#10847E] text-white hover:bg-gray-900 font-black rounded-2xl transition-all duration-500 px-8 h-12 shadow-lg shadow-teal-900/10 active:scale-90"
                      >
                        ADD
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* Feature Grid */}
        <section className="grid md:grid-cols-3 gap-10 py-10">
           {[
             { icon: Truck, title: "Super Fast", desc: "Delivery in under 30 mins.", color: "bg-green-50 text-green-600" },
             { icon: ShieldCheck, title: "Secured", desc: "100% Genuine Medicines.", color: "bg-blue-50 text-blue-600" },
             { icon: Star, title: "Trusted", desc: "50k+ Happy Customers.", color: "bg-orange-50 text-orange-600" }
           ].map((feat, i) => (
             <div key={i} className="flex flex-col items-center text-center space-y-4 p-10 bg-white rounded-[40px] shadow-soft border-2 border-transparent hover:border-teal-50 transition-all">
                <div className={`h-20 w-20 rounded-[30px] ${feat.color} flex items-center justify-center shadow-inner`}>
                   <feat.icon className="h-10 w-10" />
                </div>
                <h4 className="font-black text-xl text-gray-900">{feat.title}</h4>
                <p className="text-sm text-muted-foreground font-bold">{feat.desc}</p>
             </div>
           ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#0F1111] text-white pt-24 pb-12 mt-20">
        <div className="container mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-20">
          <div className="space-y-8">
             <div className="flex items-center gap-3">
                <Pill className="h-10 w-10 text-[#15a39c]" />
                <span className="text-3xl font-black tracking-tighter">MediGo</span>
             </div>
             <p className="text-sm text-gray-500 leading-relaxed font-bold">Your neighborhood's digital pharmacy. Connecting you to life-saving medicines in record time.</p>
          </div>
          <div className="space-y-8">
             <h4 className="font-black text-[10px] uppercase tracking-[0.4em] text-[#15a39c]">Join Us</h4>
             <ul className="space-y-4 text-sm text-gray-400 font-black">
                <li><Link to="/auth" className="hover:text-[#15a39c] transition-colors">Customer Login</Link></li>
                <li><Link to="/auth?role=pharmacy_owner" className="hover:text-[#15a39c] transition-colors">Pharmacy Partner</Link></li>
                <li><Link to="/auth?role=delivery_partner" className="hover:text-[#15a39c] transition-colors">Rider Application</Link></li>
             </ul>
          </div>
          <div className="space-y-8">
             <h4 className="font-black text-[10px] uppercase tracking-[0.4em] text-[#15a39c]">Company</h4>
             <ul className="space-y-4 text-sm text-gray-400 font-black">
                <li><Link to="/terms" className="hover:text-[#15a39c] transition-colors">Terms of Use</Link></li>
                <li><Link to="/privacy" className="hover:text-[#15a39c] transition-colors">Privacy Shield</Link></li>
                <li><Link to="/refund" className="hover:text-[#15a39c] transition-colors">Refund Guarantee</Link></li>
             </ul>
          </div>
          <div className="space-y-8">
             <h4 className="font-black text-[10px] uppercase tracking-[0.4em] text-[#15a39c]">Download</h4>
             <div className="flex flex-col gap-4">
                <button className="bg-white/5 hover:bg-white/10 px-8 py-4 rounded-2xl text-[10px] font-black border border-white/10 transition-all text-left uppercase tracking-widest">Android App</button>
                <button className="bg-white/5 hover:bg-white/10 px-8 py-4 rounded-2xl text-[10px] font-black border border-white/10 transition-all text-left uppercase tracking-widest">iOS App</button>
             </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-24 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">
           <span>© {new Date().getFullYear()} MediGo Technologies Pvt. Ltd.</span>
           <div className="flex gap-10">
              <span className="hover:text-white cursor-pointer">IG</span>
              <span className="hover:text-white cursor-pointer">TW</span>
              <span className="hover:text-white cursor-pointer">FB</span>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
