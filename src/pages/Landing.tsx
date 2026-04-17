import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pill, MapPin, Clock, ShieldCheck, Truck, Stethoscope } from "lucide-react";
import { useAuth, primaryRoleRoute } from "@/lib/auth";

const Landing = () => {
  const { user, roles } = useAuth();
  const ctaTo = user ? primaryRoleRoute(roles) : "/auth";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="container flex items-center justify-between py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-soft">
            <Pill className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">MediGo</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
          <Button asChild><Link to={ctaTo}>{user ? "Open app" : "Get started"}</Link></Button>
        </nav>
      </header>

      {/* Hero */}
      <section className="container grid gap-12 py-12 md:grid-cols-2 md:py-20 md:items-center">
        <div className="animate-fade-in">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse-soft" />
            Live in your neighborhood
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.05] md:text-6xl">
            Medicines at your door <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">in minutes</span>.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            MediGo connects you with the nearest pharmacy and delivery partner in real time. Upload a prescription, track on map, pay COD or online.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="text-base">
              <Link to={ctaTo}>{user ? "Open MediGo" : "Order medicines"}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link to="/auth?role=pharmacy_owner">List your pharmacy</Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> 30-min delivery</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Verified pharmacies</span>
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Live tracking</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-3xl gradient-hero opacity-20 blur-3xl" />
          <div className="relative grid grid-cols-2 gap-4">
            {[
              { icon: Pill, title: "20k+ medicines", desc: "Including prescription drugs" },
              { icon: Truck, title: "500+ partners", desc: "Always nearby" },
              { icon: Stethoscope, title: "Rx upload", desc: "Image or PDF" },
              { icon: ShieldCheck, title: "Secure pay", desc: "COD or Razorpay" },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl border bg-card p-5 shadow-card">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="font-semibold">{f.title}</div>
                <div className="text-sm text-muted-foreground">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="container pb-20">
        <h2 className="mb-8 text-center text-3xl font-bold">One platform, four experiences</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { title: "Customer", desc: "Search, order & track medicines", to: "/auth" },
            { title: "Pharmacy", desc: "Manage inventory & orders", to: "/auth?role=pharmacy_owner" },
            { title: "Delivery Partner", desc: "Earn delivering nearby", to: "/auth?role=delivery_partner" },
            { title: "Admin", desc: "Operate the marketplace", to: "/auth" },
          ].map((r, i) => (
            <Link key={i} to={r.to} className="group rounded-2xl border bg-card p-6 shadow-soft transition hover:shadow-elegant">
              <div className="text-lg font-semibold group-hover:text-primary">{r.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{r.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} MediGo. Built on Lovable Cloud.
      </footer>
    </div>
  );
};

export default Landing;
