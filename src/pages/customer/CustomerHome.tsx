import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, ClipboardList, User, Pill, Upload, MapPin, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ComplaintForm from "@/components/ComplaintForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const CustomerHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileReady, setProfileReady] = useState<boolean | null>(null);
  const [defaultAddress, setDefaultAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { data: addr }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle(),
        supabase.from("addresses").select("line1, city, state").eq("user_id", user.id).eq("is_default", true).maybeSingle(),
      ]);
      const ok = !!profile?.full_name && !!profile?.phone && !!addr;
      setProfileReady(ok);
      if (addr) setDefaultAddress([addr.line1, addr.city, addr.state].filter(Boolean).join(", "));
    })();
  }, [user]);

  return (
    <div className="container max-w-5xl space-y-6 py-6 font-primary">
      {profileReady === false && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <div className="font-semibold">Complete your profile to start ordering</div>
                <div className="text-sm text-muted-foreground">Add your name, phone, and delivery address.</div>
              </div>
            </div>
            <Button onClick={() => navigate("/app/profile")}>Complete profile</Button>
          </CardContent>
        </Card>
      )}

      <div className="rounded-2xl gradient-hero p-6 text-primary-foreground shadow-elegant">
        <div className="flex items-center gap-2 text-sm opacity-90">
          <MapPin className="h-4 w-4" /> {defaultAddress ?? "No delivery address set"}
        </div>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">Hello! What medicine do you need today?</h1>
        <p className="mt-1 text-sm opacity-90">We'll find the nearest pharmacy with stock and deliver fast.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="secondary" className="bg-background text-foreground hover:bg-background/90">
            <Link to="/app/search"><Search className="mr-2 h-4 w-4" />Search medicines</Link>
          </Button>
          <Button asChild variant="secondary" className="bg-background text-foreground hover:bg-background/90">
            <Link to="/app/orders"><Upload className="mr-2 h-4 w-4" />Upload prescription</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Pill, title: "Popular medicines", desc: "Coming soon", to: "/app/search" },
          { icon: ClipboardList, title: "Your orders", desc: "Track and reorder", to: "/app/orders" },
          { icon: User, title: "Profile & address", desc: "Manage your details", to: "/app/profile" },
        ].map((c, i) => (
          <Link key={i} to={c.to}>
            <Card className="h-full shadow-soft transition hover:shadow-elegant">
              <CardContent className="p-5">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
                  <c.icon className="h-4 w-4" />
                </div>
                <div className="font-semibold">{c.title}</div>
                <div className="text-sm text-muted-foreground">{c.desc}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Dialog>
          <DialogTrigger asChild>
            <Card className="shadow-soft transition hover:shadow-elegant hover:bg-muted/10 cursor-pointer border-dashed border-2">
              <CardContent className="p-10 flex flex-col items-center text-center gap-3">
                <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-lg">Help & Support</div>
                  <div className="text-sm text-muted-foreground">Having trouble with an order or the app? Report a complaint here.</div>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <ComplaintForm />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CustomerHome;
