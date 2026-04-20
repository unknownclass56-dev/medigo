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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import { 
  Pill, Search, ShoppingCart, User, MapPin, 
  ChevronRight, Star, Clock, ShieldCheck, 
  Package, LayoutDashboard, Truck, X, Minus, Plus, ShoppingBag, Loader2, ArrowRight, Zap, Heart, CheckCircle2,
  Instagram, Twitter, Facebook, MessageCircle, Send, Globe, LifeBuoy, MessageSquare
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
  const [location, setLocation] = useState<string>("Detecting...");
  const [config, setConfig] = useState<any>({
    banner_title: "Medicines Delivered in 30 Mins.",
    banner_subtitle: "Connecting you to verified local pharmacies for life-saving care.",
    banner_badge: "FLAT 25% OFF",
    whatsapp_number: "919000000000"
  });

  const [feedback, setFeedback] = useState({ message: "", rating: 5 });
  const [submitting, setSubmitting] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

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

  const filteredMedicines = useMemo(() => {
    if (!searchQuery) return medicines;
    return medicines.filter(m => 
      m.medicines?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.medicines?.generic_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, medicines]);

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

  return (
    <div className="min-h-screen bg-slate-50/50 selection:bg-primary/10 selection:text-primary font-sans">
      
      {/* WhatsApp Floating Button */}
      <a 
        href={`https://wa.me/${config.whatsapp_number}?text=Hello%20MediHelth%2C%20I%20have%20a%20query%20regarding%20my%20order.`}
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-[100] h-16 w-16 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95 group"
      >
        <MessageCircle className="h-8 w-8" />
        <span className="absolute right-20 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest">Chat with us</span>
      </a>

      {/* Premium Navbar */}
      <header className="sticky top-0 z-[100] w-full glass border-b transition-all duration-300">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3 group transition-transform active:scale-95 shrink-0">
            <div className="flex h-12 w-12 items-center justify-center relative">
              <img 
                src="/logo.png" 
                alt="MediHelth" 
                className="h-full w-full object-contain z-10" 
                onError={(e) => (e.currentTarget.style.opacity = '0')} 
              />
              <div className="absolute inset-0 flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary text-white shadow-lg -z-0 opacity-20">
                <Pill className="h-7 w-7" />
              </div>
            </div>
            <span className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900">
              Medi<span className="text-primary">Helth</span>
            </span>
          </Link>

          {/* Smart Search - Desktop */}
          <div className="hidden lg:flex flex-1 max-w-2xl relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-3 border-r border-slate-200">
              <MapPin className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate max-w-[80px]">{location}</span>
            </div>
            <input 
              placeholder="Search medicines..." 
              className="pl-32 pr-14 h-14 w-full rounded-2xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button className="absolute right-1.5 top-1.5 h-11 w-11 rounded-xl bg-slate-900 hover:bg-primary text-white p-0 transition-all duration-300">
              <Search className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild variant="ghost" className="flex gap-2 font-bold text-slate-600 rounded-xl hover:bg-slate-100">
                <Link to={primaryRoleRoute(roles)}>
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              </Button>
            ) : (
              <Button asChild variant="ghost" className="flex gap-2 font-bold text-slate-600 rounded-xl hover:bg-slate-100">
                <Link to="/auth">
                  <User className="h-4 w-4 text-primary" />
                  <span>Login</span>
                </Link>
              </Button>
            )}

            <Sheet>
              <SheetTrigger asChild>
                <Button className="relative h-12 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 transition-all active:scale-95">
                  <ShoppingCart className="h-5 w-5" />
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
                    <ShoppingBag className="h-5 w-5 text-primary" /> Your Bag
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-8 scrollbar-hide space-y-8">
                  {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                       <ShoppingCart className="h-12 w-12 text-slate-200" />
                       <div className="font-black text-slate-300 uppercase tracking-[0.3em] text-xs">Empty</div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {items.map((it) => (
                        <div key={`${it.medicine_id}_${it.unit_type}`} className="flex gap-5 group">
                          <div className="h-20 w-20 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100">
                            <Pill className="h-8 w-8 text-slate-200" />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <h4 className="font-bold text-slate-900 truncate pr-6">{it.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px] font-black bg-slate-100 text-slate-500">{it.unit_type}</Badge>
                                <span className="text-[11px] font-bold text-slate-400">₹{it.price.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-4">
                               <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-2 py-1">
                                  <button onClick={() => setQty(it.medicine_id, it.quantity - 1)} className="p-1"><Minus className="h-3 w-3" /></button>
                                  <span className="text-sm font-black w-4 text-center">{it.quantity}</span>
                                  <button onClick={() => setQty(it.medicine_id, it.quantity + 1)} className="p-1"><Plus className="h-3 w-3" /></button>
                               </div>
                               <span className="font-black text-slate-900">₹{(it.price * it.quantity).toFixed(2)}</span>
                            </div>
                          </div>
                          <button onClick={() => remove(it.medicine_id)} className="h-8 w-8 text-slate-300 hover:text-destructive self-start"><X className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {items.length > 0 && (
                  <SheetFooter className="p-8 border-t bg-white flex-col gap-8">
                    <div className="flex justify-between items-center">
                       <span className="text-slate-900 font-black uppercase tracking-widest text-xs">Total</span>
                       <span className="text-3xl font-black text-slate-900 tracking-tighter">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <Button asChild className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black text-lg">
                       <Link to="/app/cart" className="flex items-center gap-2">Checkout <ArrowRight className="h-5 w-5" /></Link>
                    </Button>
                  </SheetFooter>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-16 space-y-24">
        
        {/* Hero Banner */}
        <section className="relative min-h-[500px] rounded-[48px] overflow-hidden bg-slate-900">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full" />
          <div className="relative h-full flex flex-col md:flex-row items-center p-10 md:p-24 gap-12 z-10 text-center md:text-left">
            <div className="flex-1 space-y-10">
              <Badge className="bg-white/5 text-white border-white/10 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest">{config.banner_badge}</Badge>
              <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.85] tracking-tighter italic">{config.banner_title}</h1>
              <p className="text-slate-400 font-bold text-xl md:text-2xl leading-relaxed max-w-lg mx-auto md:mx-0">{config.banner_subtitle}</p>
              <Button size="lg" className="bg-white text-slate-900 hover:bg-primary hover:text-white font-black rounded-2xl h-16 px-10 text-lg shadow-2xl transition-all">Order Now <ArrowRight className="ml-2 h-6 w-6" /></Button>
            </div>
            <div className="flex-1 relative hidden lg:flex justify-end">
              <div className="animate-float relative">
                <div className="glass p-3 rounded-[40px] shadow-2xl border-white/20 w-[350px] overflow-hidden">
                  <div className="aspect-[4/5] w-full rounded-[30px] overflow-hidden bg-slate-100">
                    <img src="/hero-health.png" alt="Health" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Inventory */}
        <section id="catalog" className="space-y-12">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-10">
             <div className="h-12 w-2 bg-primary rounded-full" />
             <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">Live Inventory</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {loading ? (
              Array(4).fill(0).map((_, i) => <div key={i} className="h-96 animate-pulse bg-slate-100 rounded-[40px]" />)
            ) : filteredMedicines.map((item) => (
              <Card key={item.id} className="group border-none bg-white rounded-[40px] shadow-soft hover:shadow-elegant transition-all duration-700 hover:-translate-y-3 overflow-hidden">
                <div className="h-64 bg-slate-50/50 flex items-center justify-center p-12 relative overflow-hidden">
                  {item.medicines?.image_url ? (
                    <img src={item.medicines.image_url} alt={item.medicines.name} className="h-full object-contain group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <Pill className="h-14 w-14 text-slate-100" />
                  )}
                </div>
                <CardContent className="p-8 pt-6 space-y-6">
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-primary uppercase tracking-widest">{item.pharmacies?.name}</div>
                    <h3 className="font-black text-slate-900 text-2xl truncate">{item.medicines?.name}</h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-black text-slate-900 tracking-tighter">₹{(item.price_per_piece || item.price).toFixed(2)}</div>
                    <Button onClick={() => handleAddToCart(item)} className="h-14 w-14 rounded-2xl bg-slate-900 hover:bg-primary text-white p-0 shadow-xl active:scale-90"><Plus className="h-6 w-6" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t pt-24 pb-12 mt-40">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="space-y-8">
             <div className="flex items-center gap-4">
                <img src="/logo.png" alt="MediHelth" className="h-12 w-12 object-contain" />
                <span className="text-3xl font-black tracking-tighter text-slate-900">MediHelth</span>
             </div>
             <p className="text-slate-500 font-bold italic leading-relaxed">Your trusted neighborhood digital pharmacy network.</p>
             <div className="flex gap-4">
                <a href="#" className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-soft"><Instagram className="h-5 w-5" /></a>
                <a href="#" className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-soft"><Twitter className="h-5 w-5" /></a>
                <a href="#" className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-soft"><Facebook className="h-5 w-5" /></a>
             </div>
          </div>
          <div className="space-y-8">
             <h4 className="font-black text-[10px] uppercase tracking-[0.4em] text-primary">Company</h4>
             <ul className="space-y-4 text-slate-500 font-black text-sm">
                <li><Link to="/auth" className="hover:text-primary">Login</Link></li>
                <li><Link to="/terms" className="hover:text-primary">Terms of Use</Link></li>
                <li><Link to="/privacy" className="hover:text-primary">Privacy Shield</Link></li>
                <li>
                  <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-2 hover:text-primary transition-colors">
                        <MessageSquare className="h-4 w-4" /> Give Feedback
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] rounded-[32px]">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tighter italic">Feedback</DialogTitle>
                        <DialogDescription className="font-bold">Share your experience with MediHelth.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={submitFeedback} className="space-y-6 pt-4">
                        <div className="flex justify-center gap-4 py-2">
                          {[1,2,3,4,5].map(star => (
                            <button key={star} type="button" onClick={() => setFeedback({ ...feedback, rating: star })} className={`transition-all ${feedback.rating >= star ? "text-yellow-400 scale-110" : "text-slate-200"}`}>
                               <Star className="h-8 w-8 fill-current" />
                            </button>
                          ))}
                        </div>
                        <Textarea 
                          placeholder="Your message..." 
                          className="rounded-2xl h-32"
                          value={feedback.message}
                          onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
                        />
                        <Button disabled={submitting} type="submit" className="w-full h-14 rounded-2xl bg-primary font-black">
                          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit Feedback"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </li>
             </ul>
          </div>
          <div className="space-y-8">
             <h4 className="font-black text-[10px] uppercase tracking-[0.4em] text-primary">Support</h4>
             <ul className="space-y-4 text-slate-500 font-black text-sm">
                <li><div className="flex items-center gap-2 hover:text-primary cursor-pointer"><Globe className="h-4 w-4" /> Sitemap</div></li>
                <li><div className="flex items-center gap-2 hover:text-primary cursor-pointer"><LifeBuoy className="h-4 w-4" /> Accessibility</div></li>
             </ul>
          </div>
          <div className="space-y-8">
             <h4 className="font-black text-[10px] uppercase tracking-[0.4em] text-primary">Get App</h4>
             <div className="flex flex-col gap-4">
                <Button variant="outline" className="h-14 rounded-2xl border-2 font-black">Play Store</Button>
                <Button variant="outline" className="h-14 rounded-2xl border-2 font-black">App Store</Button>
             </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-24 pt-10 border-t flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
           <span>© {new Date().getFullYear()} MediHelth Technologies Pvt. Ltd.</span>
           <div className="flex gap-8">
              <span>Bhopal, India</span>
              <span>Made with ❤️ for Health</span>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
