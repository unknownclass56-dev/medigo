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
  Package, LayoutDashboard, Truck, X, Minus, Plus, ShoppingBag, Loader2, ArrowRight, Zap, Heart, CheckCircle2
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
    title: "Medicines Delivered in 30 Mins.",
    subtitle: "Connecting you to verified local pharmacies for life-saving care.",
    badge: "FLAT 25% OFF"
  });

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

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { data: inv } = await supabase
          .from("pharmacy_inventory")
          .select(`
            id, price, price_per_piece, price_per_pack, pieces_per_pack, stock,
            medicines!inner ( id, name, generic_name, image_url, requires_prescription, category ),
            pharmacies!inner ( id, name, city, status )
          `)
          .eq("pharmacies.status", "approved")
          .gt("stock", 0)
          .limit(20);
        
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
    toast({ title: "Added to Bag!", description: `${item.medicines?.name} is ready for checkout.` });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 selection:bg-primary/10 selection:text-primary">
      {/* Premium Navbar */}
      <header className="sticky top-0 z-[100] w-full glass border-b transition-all duration-300">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3 group transition-transform active:scale-95">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary text-white shadow-lg shadow-primary/20 rotate-3 group-hover:rotate-0 transition-transform duration-500">
              <Pill className="h-7 w-7" />
            </div>
            <span className="text-3xl font-black tracking-tighter text-slate-900">
              Medi<span className="text-primary">Go</span>
            </span>
          </Link>

          {/* Smart Search - Desktop */}
          <div className="hidden lg:flex flex-1 max-w-2xl relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-3 border-r border-slate-200">
              <MapPin className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate max-w-[100px]">{location}</span>
            </div>
            <Input 
              placeholder="Search for medicines or health essentials..." 
              className="pl-36 pr-14 h-14 rounded-2xl border-slate-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-medium text-slate-900 placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button className="absolute right-1.5 top-1.5 h-11 w-11 rounded-xl bg-slate-900 hover:bg-primary text-white p-0 transition-all duration-300">
              <Search className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <Button asChild variant="ghost" className="hidden sm:flex gap-2 font-bold text-slate-600 rounded-xl hover:bg-slate-100">
                <Link to={primaryRoleRoute(roles)}>
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  Dashboard
                </Link>
              </Button>
            ) : (
              <Button asChild variant="ghost" className="hidden sm:flex gap-2 font-bold text-slate-600 rounded-xl hover:bg-slate-100">
                <Link to="/auth">
                  <User className="h-4 w-4 text-primary" />
                  Login
                </Link>
              </Button>
            )}

            <Sheet>
              <SheetTrigger asChild>
                <Button className="relative h-12 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 transition-all active:scale-95">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  <span className="font-bold hidden sm:inline">Bag</span>
                  {count > 0 && (
                    <span className="absolute -top-2 -right-2 h-6 w-6 bg-primary text-white text-[10px] font-black flex items-center justify-center rounded-full border-4 border-white animate-in zoom-in">
                      {count}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md flex flex-col p-0 border-l-0 shadow-2xl">
                <SheetHeader className="p-8 border-b bg-slate-50/50">
                  <SheetTitle className="flex items-center gap-3 text-slate-900 font-black uppercase tracking-widest text-sm">
                    <ShoppingBag className="h-5 w-5 text-primary" /> Your Shopping Bag
                  </SheetTitle>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto p-8 scrollbar-hide space-y-8">
                  {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                       <div className="h-32 w-32 rounded-full bg-slate-50 flex items-center justify-center relative">
                          <ShoppingCart className="h-12 w-12 text-slate-200" />
                          <div className="absolute top-0 right-0 h-8 w-8 bg-white rounded-full shadow-sm flex items-center justify-center">
                            <Zap className="h-4 w-4 text-slate-100" />
                          </div>
                       </div>
                       <div>
                         <div className="font-black text-slate-300 uppercase tracking-[0.3em] text-xs">Your bag is empty</div>
                         <p className="text-slate-400 text-sm mt-2">Add some medicines to get started.</p>
                       </div>
                       <Button asChild variant="outline" className="rounded-xl border-2 font-bold px-8">
                         <Link to="/">Browse Shop</Link>
                       </Button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {items.map((it) => (
                        <div key={`${it.medicine_id}_${it.unit_type}`} className="flex gap-5 group animate-in slide-in-from-right duration-500">
                          <div className="h-24 w-24 bg-slate-50 rounded-3xl flex items-center justify-center shrink-0 border border-slate-100 group-hover:bg-primary/5 transition-colors">
                            <Pill className="h-10 w-10 text-slate-200 group-hover:text-primary/20" />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                            <div>
                              <h4 className="font-bold text-slate-900 truncate pr-6">{it.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 rounded-md">{it.unit_type}</Badge>
                                <span className="text-[11px] font-bold text-slate-400">₹{it.price.toFixed(2)} / unit</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-4">
                               <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-2 py-1.5 border border-slate-100">
                                  <button onClick={() => setQty(it.medicine_id, it.quantity - 1)} className="hover:text-primary transition-colors p-1"><Minus className="h-3.5 w-3.5" /></button>
                                  <span className="text-sm font-black w-6 text-center text-slate-900">{it.quantity}</span>
                                  <button onClick={() => setQty(it.medicine_id, it.quantity + 1)} className="hover:text-primary transition-colors p-1"><Plus className="h-3.5 w-3.5" /></button>
                               </div>
                               <span className="font-black text-slate-900">₹{(it.price * it.quantity).toFixed(2)}</span>
                            </div>
                          </div>
                          <button onClick={() => remove(it.medicine_id)} className="h-9 w-9 flex items-center justify-center text-slate-300 hover:text-destructive hover:bg-destructive/5 rounded-full transition-all self-start"><X className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {items.length > 0 && (
                  <SheetFooter className="p-8 border-t bg-white flex-col gap-8 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.1)]">
                    <div className="space-y-4 w-full">
                       <div className="flex justify-between items-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                          <span>Subtotal Cost</span>
                          <span>₹{subtotal.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-slate-900 font-black uppercase tracking-widest text-xs">Total Payable</span>
                          <span className="text-3xl font-black text-slate-900 tracking-tighter">₹{subtotal.toFixed(2)}</span>
                       </div>
                    </div>
                    <Button asChild className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black text-lg shadow-xl shadow-primary/20 transition-all active:scale-[0.98]">
                       <Link to="/app/cart" className="flex items-center gap-2">
                          Checkout Now <ArrowRight className="h-5 w-5" />
                       </Link>
                    </Button>
                  </SheetFooter>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12 space-y-24">
        
        {/* Modern Hero Banner */}
        <section className="relative min-h-[500px] rounded-[48px] overflow-hidden group">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 bg-slate-900">
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full" />
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
          </div>

          <div className="relative h-full flex flex-col md:flex-row items-center p-10 md:p-24 gap-12">
            <div className="flex-1 space-y-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">{banner.badge}</span>
              </div>

              <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.85] tracking-tighter italic">
                {banner.title.split(' ').map((word, i) => (
                  <span key={i} className={i === 0 ? "text-primary" : ""}>
                    {word}{' '}
                  </span>
                ))}
              </h1>

              <p className="text-slate-400 font-bold text-xl md:text-2xl leading-relaxed max-w-lg">
                {banner.subtitle}
              </p>

              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-primary hover:text-white font-black rounded-2xl h-16 px-10 transition-all duration-500 text-lg shadow-2xl">
                  Order Now <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
                <div className="flex -space-x-3 items-center">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-12 w-12 rounded-full border-4 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                       <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="user" />
                    </div>
                  ))}
                  <span className="pl-6 text-sm font-bold text-slate-500 uppercase tracking-widest">50k+ Happy Users</span>
                </div>
              </div>
            </div>

            <div className="flex-1 relative hidden lg:block">
              <div className="animate-float">
                <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-[60px] shadow-2xl overflow-hidden group/card">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-1000" />
                  <Pill className="h-64 w-64 text-primary opacity-20 mx-auto" />
                  <div className="mt-8 space-y-4">
                     <div className="h-4 w-3/4 bg-white/10 rounded-full" />
                     <div className="h-4 w-1/2 bg-white/10 rounded-full" />
                  </div>
                </div>
                {/* Floating Elements */}
                <div className="absolute -top-10 -right-10 h-24 w-24 bg-primary/20 blur-2xl rounded-full" />
                <div className="absolute top-20 -left-10 p-6 glass rounded-3xl shadow-2xl animate-bounce duration-[3000ms]">
                   <Truck className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute bottom-10 right-0 p-6 glass rounded-3xl shadow-2xl animate-bounce delay-700 duration-[4000ms]">
                   <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="space-y-12">
          <div className="text-center space-y-4">
             <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Browse Categories</h2>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">What are you looking for today?</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             {[
               { icon: Pill, label: "Medicine", color: "bg-primary/10 text-primary", count: "10k+ Products" },
               { icon: Zap, label: "Energy", color: "bg-yellow-500/10 text-yellow-600", count: "500+ Items" },
               { icon: Heart, label: "Wellness", color: "bg-rose-500/10 text-rose-600", count: "2k+ Choices" },
               { icon: ShieldCheck, label: "Hygiene", color: "bg-blue-500/10 text-blue-600", count: "1.5k+ Items" }
             ].map((cat, i) => (
               <Card key={i} className="group hover:border-primary transition-all duration-500 cursor-pointer border-2 border-transparent bg-white shadow-soft rounded-[32px] overflow-hidden">
                 <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                   <div className={`h-16 w-16 rounded-2xl ${cat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <cat.icon className="h-8 w-8" />
                   </div>
                   <div>
                     <div className="font-black text-slate-900 text-lg">{cat.label}</div>
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat.count}</div>
                   </div>
                 </CardContent>
               </Card>
             ))}
          </div>
        </section>

        {/* Catalog Section */}
        <section id="catalog" className="space-y-12 scroll-mt-32">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-100 pb-10">
            <div className="flex items-center gap-4">
               <div className="h-12 w-2 bg-primary rounded-full" />
               <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">Live Pharmacy Inventory</h2>
            </div>
            <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-2xl">
               <Button variant="ghost" className="rounded-xl font-bold bg-white shadow-sm">All</Button>
               <Button variant="ghost" className="rounded-xl font-bold text-slate-500">Essential</Button>
               <Button variant="ghost" className="rounded-xl font-bold text-slate-500">Wellness</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="h-[450px] animate-pulse bg-slate-100 rounded-[40px]" />
              ))
            ) : filteredMedicines.length === 0 ? (
               <div className="col-span-full py-40 text-center bg-white rounded-[48px] border-4 border-dashed border-slate-100">
                  <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Package className="h-10 w-10 text-slate-200" />
                  </div>
                  <div className="font-black text-slate-300 uppercase tracking-[0.5em] text-xs">Inventory Currently Empty</div>
                  <p className="text-slate-400 mt-4 font-bold">Check back later or try a different search.</p>
               </div>
            ) : (
              filteredMedicines.map((item) => (
                <Card key={item.id} className="group relative border-none bg-white rounded-[40px] shadow-soft hover:shadow-elegant transition-all duration-700 hover:-translate-y-3 overflow-hidden">
                  <div className="h-64 bg-slate-50/50 flex items-center justify-center p-12 relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    {item.medicines?.image_url ? (
                      <img src={item.medicines.image_url} alt={item.medicines.name} className="h-full object-contain group-hover:scale-110 transition-transform duration-1000 ease-out" />
                    ) : (
                      <div className="h-28 w-28 rounded-[40px] bg-white shadow-2xl shadow-slate-200/50 flex items-center justify-center relative">
                         <Pill className="h-14 w-14 text-slate-100" />
                         <Heart className="absolute top-4 right-4 h-5 w-5 text-slate-50" />
                      </div>
                    )}
                    {item.medicines?.requires_prescription && (
                      <div className="absolute top-6 left-6 px-3 py-1 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase tracking-[0.2em] shadow-xl">
                        Rx Required
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-8 pt-6 space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[9px] font-black text-primary uppercase tracking-[0.3em]">
                        <CheckCircle2 className="h-3 w-3" /> {item.pharmacies?.name || "MediGo Verified"}
                      </div>
                      <h3 className="font-black text-slate-900 text-2xl leading-none tracking-tight line-clamp-1">{item.medicines?.name}</h3>
                      <p className="text-xs text-slate-400 font-bold leading-relaxed line-clamp-1">{item.medicines?.generic_name || "Premium Quality Formulation"}</p>
                    </div>
                    
                    <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">₹{(item.price_per_piece || item.price).toFixed(2)}</div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Price per {item.price_per_piece ? "Piece" : "Pack"}</div>
                      </div>
                      <Button 
                        onClick={() => handleAddToCart(item)}
                        className="h-14 w-14 rounded-2xl bg-slate-900 hover:bg-primary text-white p-0 transition-all duration-500 shadow-xl shadow-slate-900/10 active:scale-90"
                      >
                        <Plus className="h-6 w-6" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-20 rounded-[64px] bg-white shadow-soft border border-slate-100 px-10 md:px-20 text-center space-y-20 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-blue-500 to-primary/50" />
           
           <div className="max-w-3xl mx-auto space-y-6 relative z-10">
              <Badge variant="outline" className="rounded-full border-2 border-primary/20 text-primary font-black px-6 py-1.5 uppercase tracking-widest text-[10px]">Our Promise</Badge>
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter italic">Why Thousands Trust MediGo?</h2>
              <p className="text-slate-500 font-bold text-lg leading-relaxed">We are building the future of hyperlocal medicine delivery, one pharmacy at a time.</p>
           </div>

           <div className="grid md:grid-cols-3 gap-16 relative z-10">
              {[
                { icon: Truck, title: "30-Min Delivery", desc: "Our local rider network ensures life-saving medicines reach you in record time.", color: "text-emerald-500" },
                { icon: ShieldCheck, title: "100% Genuine", desc: "Every medicine is sourced directly from licensed, verified neighborhood pharmacies.", color: "text-blue-500" },
                { icon: Clock, title: "24/7 Availability", desc: "Emergency medicines available round the clock through our partner network.", color: "text-orange-500" }
              ].map((feat, i) => (
                <div key={i} className="group space-y-6 flex flex-col items-center">
                   <div className="h-24 w-24 rounded-[40px] bg-slate-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-elegant transition-all duration-500">
                      <feat.icon className={`h-12 w-12 ${feat.color}`} />
                   </div>
                   <div className="space-y-3">
                     <h4 className="font-black text-2xl text-slate-900">{feat.title}</h4>
                     <p className="text-slate-400 font-bold leading-relaxed max-w-xs mx-auto">{feat.desc}</p>
                   </div>
                </div>
              ))}
           </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white mt-40">
        <div className="container mx-auto px-4 py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20">
            <div className="space-y-8">
               <Link to="/" className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center rotate-3">
                    <Pill className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-4xl font-black tracking-tighter">MediGo</span>
               </Link>
               <p className="text-slate-400 font-bold leading-relaxed max-w-sm italic">"Bridging the gap between pharmacies and patients through technology and speed."</p>
               <div className="flex gap-4">
                 {[1,2,3,4].map(i => <div key={i} className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:bg-primary transition-colors cursor-pointer" />)}
               </div>
            </div>

            <div className="space-y-10">
               <h4 className="font-black text-[11px] uppercase tracking-[0.5em] text-primary">Get Involved</h4>
               <ul className="space-y-5 text-sm font-black text-slate-400">
                  <li><Link to="/auth" className="hover:text-primary transition-all flex items-center gap-2 group"><ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -ml-6 group-hover:ml-0 transition-all" /> Patient Login</Link></li>
                  <li><Link to="/auth?role=pharmacy_owner" className="hover:text-primary transition-all flex items-center gap-2 group"><ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -ml-6 group-hover:ml-0 transition-all" /> Pharmacy Partner</Link></li>
                  <li><Link to="/auth?role=delivery_partner" className="hover:text-primary transition-all flex items-center gap-2 group"><ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -ml-6 group-hover:ml-0 transition-all" /> Rider Network</Link></li>
               </ul>
            </div>

            <div className="space-y-10">
               <h4 className="font-black text-[11px] uppercase tracking-[0.5em] text-primary">Trust Center</h4>
               <ul className="space-y-5 text-sm font-black text-slate-400">
                  <li><Link to="/terms" className="hover:text-primary transition-all">Service Terms</Link></li>
                  <li><Link to="/privacy" className="hover:text-primary transition-all">Data Protection</Link></li>
                  <li><Link to="/refund" className="hover:text-primary transition-all">Refund Shield</Link></li>
               </ul>
            </div>

            <div className="space-y-10">
               <h4 className="font-black text-[11px] uppercase tracking-[0.5em] text-primary">Experience</h4>
               <div className="space-y-4">
                  <button className="w-full h-14 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-between px-6">
                    <span className="text-[10px] font-black uppercase tracking-widest">Android Client</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button className="w-full h-14 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-between px-6">
                    <span className="text-[10px] font-black uppercase tracking-widest">iOS Platform</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
               </div>
            </div>
          </div>

          <div className="mt-40 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
             <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
               © {new Date().getFullYear()} MediGo Technologies. All rights reserved.
             </div>
             <div className="flex gap-12 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                <span className="hover:text-primary cursor-pointer">Accessibility</span>
                <span className="hover:text-primary cursor-pointer">Sitemap</span>
                <span className="hover:text-primary cursor-pointer">Feedback</span>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
