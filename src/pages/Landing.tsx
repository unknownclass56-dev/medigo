import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter 
} from "@/components/ui/sheet";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import { 
  Pill, Search, ShoppingCart, User, MapPin, 
  ChevronRight, Star, Clock, ShieldCheck, 
  Package, LayoutDashboard, Truck, X, Minus, Plus, ShoppingBag, Loader2, ArrowRight, Zap, Heart, CheckCircle2,
  Instagram, Twitter, Facebook, MessageCircle, Send, Globe, LifeBuoy, MessageSquare, Accessibility, Eye, Type, Contrast
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, primaryRoleRoute } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

const Landing = () => {
  const { user, roles } = useAuth();
  const { items, add, remove, setQty, subtotal, count } = useCart();
  const navigate = useNavigate();
  
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [location, setLocation] = useState<string>("Detecting...");
  const [config, setConfig] = useState<any>({
    banner_title: "Get your medicines Delivered in 30 Mins.",
    banner_subtitle: "Verified Pharmacies. Trusted Logistics. Best Prices.",
    banner_badge: "FLAT 25% OFF",
    whatsapp_number: "919000000000"
  });

  const [feedback, setFeedback] = useState({ message: "", rating: 5 });
  const [submitting, setSubmitting] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Accessibility State
  const [fontSize, setFontSize] = useState(14); // Default to smaller for compact look
  const [isContrast, setIsContrast] = useState(false);
  const [isDyslexicFont, setIsDyslexicFont] = useState(false);
  const [isAccessOpen, setIsAccessOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            id, price, price_per_piece, price_per_pack, pieces_per_pack, stock, expiry_date,
            medicines!inner ( id, name, generic_name, manufacturer, description, image_url, requires_prescription, category ),
            pharmacies!inner ( id, name, city, status )
          `)
          .eq("pharmacies.status", "approved")
          .gt("stock", 0)
          .limit(50);
        
        if (inv) setMedicines(inv);

        const { data: conf } = await supabase.from("platform_config").select("*").eq("id", 1).maybeSingle();
        if (conf) setConfig(conf);
      } catch (err) {
        console.error("Initialization Error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const suggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    return Array.from(new Set(medicines
      .filter(m => m.medicines?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(m => m.medicines?.name)))
      .slice(0, 5);
  }, [searchQuery, medicines]);

  const filteredMedicines = useMemo(() => {
    if (!searchQuery) return medicines.slice(0, 6); // Only show 6 by default
    return medicines.filter(m => 
      m.medicines?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.medicines?.generic_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, medicines]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/app/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/app/search');
    }
  };

  const handleAddToCart = (item: any) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please sign in to add items." });
      navigate("/auth");
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
    toast({ title: "Added to Bag!" });
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.message) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("feedback").insert({
        user_id: user?.id,
        full_name: user?.user_metadata?.full_name,
        email: user?.email,
        message: feedback.message,
        rating: feedback.rating
      });
      if (error) throw error;
      toast({ title: "Feedback Sent!", description: "Thank you for your valuable feedback." });
      setFeedback({ message: "", rating: 5 });
      setIsFeedbackOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "name": "MediHealth",
    "alternateName": "MediHealth Pharmacy Network",
    "url": window.location.origin,
    "logo": `${window.location.origin}/logo.png`,
    "description": "MediHealth is India's premium digital pharmacy network providing 30-minute medicine delivery from verified local pharmacies.",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Bhopal",
      "addressRegion": "MP",
      "addressCountry": "IN"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": config.whatsapp_number,
      "contactType": "customer service"
    }
  };

  return (
    <div 
      className={`min-h-screen bg-slate-50/50 selection:bg-primary/10 selection:text-primary transition-all duration-300 ${isContrast ? "grayscale contrast-125" : ""} ${isDyslexicFont ? "font-mono" : "font-sans"}`}
      style={{ fontSize: `${fontSize}px` }}
    >
      <Helmet>
        <title>MediHealth | 30-Min Medicine Delivery from Verified Pharmacies</title>
        <meta name="description" content="Order medicines online from MediHealth and get 30-minute delivery from verified local pharmacies. Best prices, authentic healthcare, and trusted logistics in Bhopal, India." />
        <meta name="keywords" content="online pharmacy, medicine delivery, 30 min delivery, authentic medicine, health tech, pharmacy network, Bhopal medicines, MediHealth" />
        
        {/* OpenGraph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.origin} />
        <meta property="og:title" content="MediHealth | Fastest Medicine Delivery" />
        <meta property="og:description" content="Get authentic medicines delivered in 30 minutes from your neighborhood pharmacy." />
        <meta property="og:image" content={`${window.location.origin}/logo.png`} />

        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      </Helmet>

      {/* WhatsApp Floating Button */}
      <a 
        href={`https://wa.me/${config.whatsapp_number}?text=Hello%20MediHealth%2C%20I%20have%20a%20query%20regarding%20my%20order.`}
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[100] h-14 w-14 md:h-16 md:w-16 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95 group"
      >
        <MessageCircle className="h-7 w-7 md:h-8 md:w-8" />
      </a>

      {/* Accessibility Widget Button */}
      <div className="fixed bottom-6 left-6 z-[100]">
        <Dialog open={isAccessOpen} onOpenChange={setIsAccessOpen}>
          <DialogTrigger asChild>
             <button className="h-14 w-14 md:h-16 md:w-16 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95 group">
                <Accessibility className="h-7 w-7 md:h-8 md:w-8" />
             </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px] rounded-[32px] p-6 md:p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tighter italic flex items-center gap-2">
                <Accessibility className="h-6 w-6 text-primary" /> Accessibility
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
               <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-500">
                    <span className="flex items-center gap-2"><Type className="h-4 w-4" /> Text Size</span>
                    <span className="text-primary">{fontSize}px</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 rounded-xl h-10 font-black" onClick={() => setFontSize(prev => Math.max(10, prev - 1))}>Smaller</Button>
                    <Button variant="outline" className="flex-1 rounded-xl h-10 font-black" onClick={() => setFontSize(prev => Math.min(20, prev + 1))}>Bigger</Button>
                  </div>
               </div>

               <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border-2 border-slate-100">
                  <div className="flex items-center gap-3">
                     <Contrast className="h-4 w-4 text-slate-900" />
                     <span className="font-black text-[10px] uppercase tracking-widest">High Contrast</span>
                  </div>
                  <button 
                    onClick={() => setIsContrast(!isContrast)}
                    className={`h-6 w-11 rounded-full transition-colors relative ${isContrast ? "bg-primary" : "bg-slate-200"}`}
                  >
                    <div className={`h-4 w-4 bg-white rounded-full absolute top-1 transition-all ${isContrast ? "left-6" : "left-1"}`} />
                  </button>
               </div>

               <Button className="w-full h-12 rounded-xl bg-slate-900 font-black text-white text-xs uppercase" onClick={() => { setIsContrast(false); setFontSize(14); setIsDyslexicFont(false); }}>Reset Settings</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Premium Navbar */}
      <header className="sticky top-0 z-[100] w-full glass border-b transition-all duration-300">
        <div className="container mx-auto px-4 h-auto lg:h-16 py-3 lg:py-0 flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-6">
          <div className="w-full lg:w-auto flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2 group transition-transform active:scale-95 shrink-0">
              <div className="flex h-10 w-10 items-center justify-center relative">
                <img src="/logo.png" alt="MediHealth" className="h-full w-full object-contain z-10" />
                <div className="absolute inset-0 flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-white shadow-lg -z-0 opacity-20"><Pill className="h-5 w-5" /></div>
              </div>
              <span className="text-xl font-black tracking-tighter text-slate-900">
                Medi<span className="text-primary">Helth</span>
              </span>
            </Link>

            <div className="flex lg:hidden items-center gap-1.5">
               {user ? (
                <Link to={primaryRoleRoute(roles)} className="h-9 w-9 bg-slate-100 rounded-lg flex items-center justify-center text-primary"><LayoutDashboard className="h-4 w-4" /></Link>
               ) : (
                <Link to="/auth" className="h-9 w-9 bg-slate-100 rounded-lg flex items-center justify-center text-primary"><User className="h-4 w-4" /></Link>
               )}
               <Sheet>
                 <SheetTrigger asChild>
                    <button className="h-9 w-9 bg-slate-900 text-white rounded-lg flex items-center justify-center relative">
                      <ShoppingCart className="h-4 w-4" />
                      {count > 0 && <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-primary rounded-full text-[7px] font-black flex items-center justify-center">{count}</span>}
                    </button>
                 </SheetTrigger>
               </Sheet>
            </div>
          </div>

          <div className="w-full lg:flex-1 max-w-xl relative group" ref={searchRef}>
            <input 
              placeholder="Search medicine name..." 
              className="pl-5 pr-12 h-11 w-full rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium text-sm shadow-sm"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
            />
            <Button 
              onClick={handleSearch}
              className="absolute right-1 top-1 h-9 w-9 rounded-lg bg-slate-900 hover:bg-primary text-white p-0"
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Smart Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[200] overflow-hidden animate-in fade-in zoom-in duration-200">
                {suggestions.map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      setSearchQuery(s);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors group"
                  >
                    <div className="h-8 w-8 bg-primary/5 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all"><Pill className="h-4 w-4" /></div>
                    <span className="font-bold text-slate-700 text-sm">{s}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <Button asChild variant="ghost" className="h-10 px-4 font-bold text-slate-600 rounded-xl hover:bg-slate-100 text-sm">
                <Link to={primaryRoleRoute(roles)}><LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard</Link>
              </Button>
            ) : (
              <Button asChild variant="ghost" className="h-10 px-4 font-bold text-slate-600 rounded-xl hover:bg-slate-100 text-sm">
                <Link to="/auth"><User className="h-4 w-4 mr-2" /> Login</Link>
              </Button>
            )}

            <Sheet>
              <SheetTrigger asChild>
                <Button className="relative h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg text-sm font-black uppercase">
                  <ShoppingCart className="h-4 w-4 mr-2" /> Bag {count > 0 && `(${count})`}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-sm flex flex-col p-0 border-l-0 shadow-2xl">
                <SheetHeader className="p-6 border-b bg-slate-50/50">
                  <SheetTitle className="flex items-center gap-2 text-slate-900 font-black uppercase tracking-widest text-[10px]">
                    <ShoppingBag className="h-4 w-4 text-primary" /> Shopping Bag
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                       <ShoppingCart className="h-10 w-10 text-slate-200" />
                       <p className="font-black text-slate-300 uppercase tracking-widest text-[9px]">Bag is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {items.map((it) => (
                        <div key={`${it.medicine_id}_${it.unit_type}`} className="flex gap-4 group">
                          <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 group-hover:bg-primary/5">
                            <Pill className="h-6 w-6 text-slate-200" />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <h4 className="font-bold text-slate-900 text-sm truncate">{it.name}</h4>
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1">
                                  <button onClick={() => setQty(it.medicine_id, it.quantity - 1)} className="hover:text-primary"><Minus className="h-3 w-3" /></button>
                                  <span className="text-xs font-black w-4 text-center">{it.quantity}</span>
                                  <button onClick={() => setQty(it.medicine_id, it.quantity + 1)} className="hover:text-primary"><Plus className="h-3 w-3" /></button>
                               </div>
                               <span className="font-black text-slate-900 text-sm">₹{(it.price * it.quantity).toFixed(2)}</span>
                            </div>
                          </div>
                          <button onClick={() => remove(it.medicine_id)} className="text-slate-300 hover:text-destructive"><X className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {items.length > 0 && (
                  <SheetFooter className="p-6 border-t bg-white flex-col gap-6">
                    <div className="flex justify-between items-center w-full">
                       <span className="text-slate-900 font-black uppercase tracking-widest text-[10px]">Total</span>
                       <span className="text-2xl font-black text-slate-900 tracking-tighter">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <Button asChild className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 font-black">
                       <Link to="/app/cart" className="flex items-center justify-center gap-2">Checkout <ArrowRight className="h-4 w-4" /></Link>
                    </Button>
                  </SheetFooter>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-12 space-y-16">
        
        {/* Compact Hero */}
        <section className="relative min-h-[300px] md:min-h-[400px] rounded-[32px] md:rounded-[48px] overflow-hidden bg-slate-900">
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary/20 blur-[100px] rounded-full" />
          <div className="relative h-full flex flex-col md:flex-row items-center p-8 md:p-20 gap-8 z-10 text-center md:text-left">
            <div className="flex-1 space-y-6">
              <Badge className="bg-white/5 text-white border-white/10 text-[8px] md:text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{config.banner_badge}</Badge>
              <h1 className="text-4xl md:text-7xl font-black text-white leading-[0.9] tracking-tighter italic">{config.banner_title}</h1>
              <p className="text-slate-400 font-bold text-base md:text-xl leading-relaxed max-w-sm mx-auto md:mx-0">{config.banner_subtitle}</p>
              <Button 
                size="lg" 
                onClick={() => navigate('/app/search')}
                className="bg-white text-slate-900 hover:bg-primary hover:text-white font-black rounded-xl h-12 md:h-14 px-8 text-sm md:text-base shadow-2xl transition-all"
              >
                Order Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 relative hidden lg:flex justify-end">
              <div className="animate-float relative">
                <div className="glass p-2 rounded-[32px] shadow-2xl border-white/20 w-[280px] overflow-hidden">
                  <div className="aspect-[4/5] w-full rounded-[24px] overflow-hidden bg-slate-100">
                    <img src="/hero-health.png" alt="Health" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Small Benefits for Mobile */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
           {[
             { i: Truck, t: "30-Min Delivery", d: "Fastest local medicine delivery." },
             { i: ShieldCheck, t: "100% Authentic", d: "Sourced from licensed pharmacies." },
             { i: Heart, t: "Trusted Care", d: "Priority health and wellness." }
           ].map((b, idx) => (
            <div key={idx} className="p-5 md:p-8 bg-white rounded-[24px] md:rounded-[32px] shadow-soft border border-slate-50 flex items-center md:flex-col gap-4 md:text-center">
              <div className="h-10 w-10 md:h-12 md:w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0"><b.i className="h-5 w-5 md:h-6 md:w-6" /></div>
              <div>
                <h2 className="text-sm md:text-xl font-black text-slate-900 mb-1">{b.t}</h2>
                <p className="text-slate-500 font-medium text-[11px] md:text-sm">{b.d}</p>
              </div>
            </div>
           ))}
        </section>

        {/* Smart Catalog */}
        <section id="catalog" className="space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-6 md:pb-8">
             <div className="flex items-center gap-3">
                <div className="h-8 md:h-10 w-1.5 bg-primary rounded-full" />
                <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter italic">Medicines Catalog</h2>
             </div>
             {medicines.length > 6 && !searchQuery && (
               <Button variant="ghost" className="text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary/5 rounded-xl">View All <ChevronRight className="h-4 w-4 ml-1" /></Button>
             )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-8">
            {loading ? (
              Array(6).fill(0).map((_, i) => <div key={i} className="h-64 md:h-96 animate-pulse bg-slate-100 rounded-3xl md:rounded-[40px]" />)
            ) : filteredMedicines.length === 0 ? (
               <div className="col-span-full py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
                  <Package className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <div className="font-black text-slate-300 uppercase tracking-widest text-[9px]">No results</div>
               </div>
            ) : (
              filteredMedicines.map((item) => (
                <Card key={item.id} className="group border-none bg-white rounded-2xl md:rounded-[40px] shadow-soft hover:shadow-elegant transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                  <div className="h-40 md:h-64 bg-slate-50/50 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
                    {item.medicines?.image_url ? (
                      <img src={item.medicines.image_url} alt={item.medicines.name} className="h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <Pill className="h-10 w-10 md:h-14 md:w-14 text-slate-100" />
                    )}
                  </div>
                  <CardContent className="p-4 md:p-8 pt-3 md:pt-6 space-y-4 md:space-y-6">
                    <div className="space-y-3 flex-1 flex flex-col">
                      <div className="space-y-1">
                        <div className="text-[8px] md:text-[10px] font-black text-primary uppercase tracking-widest truncate">{item.pharmacies?.name}</div>
                        <h3 className="font-black text-slate-900 text-sm md:text-xl line-clamp-2" title={item.medicines?.name}>{item.medicines?.name}</h3>
                      </div>
                      
                      {item.expiry_date && (
                        <div>
                          <div className="text-[9px] md:text-[10px] font-black text-red-600 bg-red-50 inline-flex items-center px-2 py-0.5 rounded-md border border-red-100 uppercase tracking-widest">
                            Exp: {new Date(item.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      )}
                      
                      {item.medicines?.description && (
                        <p className="text-[10px] md:text-xs text-slate-500 line-clamp-2 font-medium leading-relaxed">
                          {item.medicines.description}
                        </p>
                      )}
                      
                      <div className="mt-auto pt-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="text-[10px] md:text-xs font-black text-primary hover:text-primary/80 transition-colors uppercase tracking-widest flex items-center gap-1 group/btn">
                              Read More <ChevronRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[480px] rounded-[32px] p-6 md:p-8 border-none shadow-2xl max-h-[90vh] overflow-y-auto hide-scrollbar">
                            <DialogHeader className="space-y-4">
                              <div className="h-20 w-20 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                                {item.medicines?.image_url ? (
                                  <img src={item.medicines.image_url} alt={item.medicines.name} className="h-16 w-16 object-contain" />
                                ) : (
                                  <Pill className="h-10 w-10 text-slate-300" />
                                )}
                              </div>
                              <div>
                                <DialogTitle className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900">{item.medicines?.name}</DialogTitle>
                                {item.medicines?.generic_name && (
                                  <DialogDescription className="font-bold text-slate-500 uppercase tracking-widest text-[10px] mt-1">
                                    {item.medicines.generic_name}
                                  </DialogDescription>
                                )}
                              </div>
                            </DialogHeader>
                            
                            <div className="space-y-6 pt-6">
                              {item.medicines?.description && (
                                <div className="space-y-2">
                                  <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400">Description</h4>
                                  <p className="text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">{item.medicines.description}</p>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-2 gap-3">
                                {item.expiry_date && (
                                  <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                                    <div className="font-black text-[9px] uppercase tracking-widest text-red-500 mb-1">Expiry Date</div>
                                    <div className="text-sm font-bold text-red-700">{new Date(item.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                  </div>
                                )}
                                {item.medicines?.manufacturer && (
                                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="font-black text-[9px] uppercase tracking-widest text-slate-400 mb-1">Manufacturer</div>
                                    <div className="text-xs font-bold text-slate-900 truncate" title={item.medicines.manufacturer}>{item.medicines.manufacturer}</div>
                                  </div>
                                )}
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <div className="font-black text-[9px] uppercase tracking-widest text-slate-400 mb-1">Category</div>
                                  <div className="text-xs font-bold text-slate-900">{item.medicines?.category || "General"}</div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <div className="font-black text-[9px] uppercase tracking-widest text-slate-400 mb-1">Prescription</div>
                                  <div className="text-xs font-bold text-slate-900">{item.medicines?.requires_prescription ? "Required" : "Not Required"}</div>
                                </div>
                              </div>
                              
                              <div className="pt-6 mt-2 border-t border-slate-100 flex items-center justify-between sticky bottom-0 bg-white">
                                <div>
                                  <div className="font-black text-[9px] uppercase tracking-widest text-slate-400 mb-1">Price</div>
                                  <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">₹{(item.price_per_piece || item.price).toFixed(2)}</div>
                                </div>
                                <Button onClick={() => handleAddToCart(item)} className="h-12 md:h-14 px-6 md:px-8 rounded-xl md:rounded-2xl bg-slate-900 hover:bg-primary text-white font-black shadow-lg hover:scale-105 transition-transform active:scale-95">
                                  Add to Bag <Plus className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 mt-auto border-t border-slate-50">
                      <div className="text-base md:text-2xl font-black text-slate-900 tracking-tighter">₹{(item.price_per_piece || item.price).toFixed(2)}</div>
                      <Button onClick={() => handleAddToCart(item)} className="h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-slate-900 hover:bg-primary text-white p-0 active:scale-90 shadow-lg shrink-0"><Plus className="h-4 w-4 md:h-6 md:w-6" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* Compact SEO Section */}
        <section className="bg-slate-900 text-white rounded-[32px] md:rounded-[64px] p-8 md:p-20 space-y-8">
           <div className="max-w-2xl space-y-4 md:space-y-6">
              <h2 className="text-2xl md:text-5xl font-black tracking-tighter italic text-primary leading-tight">Fastest Medicine Delivery in your City.</h2>
              <p className="text-slate-400 font-medium leading-relaxed text-sm md:text-lg">
                MediHealth bridges the gap between patients and local verified pharmacies. Get authentic medicines at your doorstep in under 30 minutes.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4 text-[10px] md:text-sm font-bold">
                 <div className="flex items-center gap-2"><CheckCircle2 className="text-primary h-4 w-4" /> <span>24/7 Support</span></div>
                 <div className="flex items-center gap-2"><CheckCircle2 className="text-primary h-4 w-4" /> <span>Live Tracking</span></div>
              </div>
           </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t pt-16 md:pt-24 pb-8 mt-20">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-16">
          <div className="space-y-6">
             <div className="flex items-center gap-3">
                <img src="/logo.png" alt="MediHealth" className="h-10 w-10 object-contain" />
                <span className="text-2xl font-black tracking-tighter text-slate-900">MediHealth</span>
             </div>
             <p className="text-slate-500 font-bold italic leading-relaxed text-xs">Connecting you to authorized pharmacies for authentic healthcare.</p>
             <div className="flex gap-3">
                <a href="#" className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary transition-all"><Instagram className="h-4 w-4" /></a>
                <a href="#" className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary transition-all"><Facebook className="h-4 w-4" /></a>
             </div>
          </div>
          <div className="space-y-6">
             <h4 className="font-black text-[9px] uppercase tracking-[0.3em] text-primary">Company</h4>
             <ul className="space-y-3 text-slate-500 font-black text-[11px]">
                <li><Link to="/auth" className="hover:text-primary transition-all">Login</Link></li>
                <li><Link to="/terms" className="hover:text-primary transition-all">Terms</Link></li>
                <li><Link to="/privacy" className="hover:text-primary transition-all">Privacy</Link></li>
                <li>
                  <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-2 hover:text-primary transition-colors">
                        <MessageSquare className="h-3 w-3" /> Feedback
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] rounded-[32px] p-6">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-black tracking-tighter italic">Feedback</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={submitFeedback} className="space-y-4 pt-2">
                        <div className="flex justify-center gap-3">
                          {[1,2,3,4,5].map(star => (
                            <button key={star} type="button" onClick={() => setFeedback({ ...feedback, rating: star })} className={`transition-all ${feedback.rating >= star ? "text-yellow-400 scale-110" : "text-slate-200"}`}>
                               <Star className="h-6 w-6 fill-current" />
                            </button>
                          ))}
                        </div>
                        <Textarea placeholder="Experience..." className="rounded-xl h-24 text-sm" value={feedback.message} onChange={(e) => setFeedback({ ...feedback, message: e.target.value })} />
                        <Button disabled={submitting} type="submit" className="w-full h-12 rounded-xl bg-primary font-black">
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </li>
             </ul>
          </div>
          <div className="space-y-6">
             <h4 className="font-black text-[9px] uppercase tracking-[0.4em] text-primary">Support</h4>
             <ul className="space-y-3 text-slate-500 font-black text-[11px]">
                <li><Link to="/sitemap" className="flex items-center gap-2 hover:text-primary transition-all"><Globe className="h-3 w-3" /> Sitemap</Link></li>
                <li><Link to="/accessibility" className="flex items-center gap-2 hover:text-primary transition-all"><LifeBuoy className="h-3 w-3" /> Accessibility</Link></li>
             </ul>
          </div>
          <div className="space-y-6">
             <h4 className="font-black text-[9px] uppercase tracking-[0.4em] text-primary">App</h4>
             <div className="flex flex-col gap-3">
                <Button variant="outline" className="h-11 rounded-xl border-2 font-black text-[10px]">Google Play</Button>
                <Button variant="outline" className="h-11 rounded-xl border-2 font-black text-[10px]">App Store</Button>
             </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-16 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">
           <span>© {new Date().getFullYear()} MediHealth Technologies | Authentic Medicine Delivery</span>
           <div className="flex gap-4">
              <span>Bhopal, India</span>
              <span>Better Health</span>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
