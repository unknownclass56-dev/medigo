import { Link } from "react-router-dom";
import { Pill, Home, User, ShoppingBag, ShieldCheck, MapPin, Truck, LayoutDashboard, Globe, LifeBuoy, FileText, Lock, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const Sitemap = () => {
  const sections = [
    {
      title: "Main Pages",
      icon: Home,
      links: [
        { name: "Home Page", to: "/", icon: Home },
        { name: "Login / Register", to: "/auth", icon: User },
        { name: "Shopping Bag", to: "/app/cart", icon: ShoppingBag },
      ]
    },
    {
      title: "User Portals",
      icon: LayoutDashboard,
      links: [
        { name: "Patient Dashboard", to: "/app", icon: User },
        { name: "Pharmacy Dashboard", to: "/pharmacy", icon: Pill },
        { name: "Delivery Dashboard", to: "/delivery", icon: Truck },
        { name: "Admin Console", to: "/admin", icon: ShieldCheck },
      ]
    },
    {
      title: "Legal & Support",
      icon: ShieldCheck,
      links: [
        { name: "Terms of Service", to: "/terms", icon: FileText },
        { name: "Privacy Policy", to: "/privacy", icon: Lock },
        { name: "Refund Policy", to: "/refund", icon: RefreshCcw },
        { name: "Accessibility", to: "/accessibility", icon: LifeBuoy },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans">
      {/* Simple Header */}
      <header className="h-20 bg-white border-b flex items-center px-4 md:px-10 sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white">
            <Pill className="h-6 w-6" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-slate-900">MediHealth</span>
        </Link>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-5xl space-y-16">
        <div className="space-y-4">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic">Sitemap</h1>
          <p className="text-slate-500 font-bold text-lg">Detailed structure of the MediHealth digital ecosystem.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-8">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <section.icon className="h-5 w-5" />
                 </div>
                 <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">{section.title}</h3>
              </div>
              <ul className="space-y-4 border-l-2 border-slate-100 pl-6 ml-5">
                {section.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <Link to={link.to} className="group flex items-center gap-3 text-slate-500 hover:text-primary transition-all font-bold">
                       <link.icon className="h-4 w-4 opacity-0 group-hover:opacity-100 -ml-7 group-hover:ml-0 transition-all" />
                       {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-10 border-t text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white">
         © {new Date().getFullYear()} MediHealth Technologies. All rights reserved.
      </footer>
    </div>
  );
};

export default Sitemap;
