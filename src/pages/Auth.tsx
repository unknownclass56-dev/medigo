import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, primaryRoleRoute, AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Pill, Loader2 } from "lucide-react";

const signUpSchema = z.object({
  fullName: z.string().min(2, "Name too short").max(80),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  password: z.string().min(8, "Min 8 characters").max(72),
  role: z.enum(["customer", "pharmacy_owner", "delivery_partner", "admin"]),
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const AuthPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, roles, loading: authLoading } = useAuth();
  const initialRole = (params.get("role") as AppRole) || "customer";

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [signUp, setSignUp] = useState({ fullName: "", email: "", phone: "", password: "", role: initialRole });
  const [signIn, setSignIn] = useState({ email: "", password: "" });

  useEffect(() => {
    if (!authLoading && user) navigate(primaryRoleRoute(roles), { replace: true });
  }, [user, roles, authLoading, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(signUp);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: parsed.data.fullName, phone: parsed.data.phone, role: parsed.data.role },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Redirecting...");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse(signIn);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Welcome back!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/40 via-background to-background">
      <div className="container max-w-md py-10">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-soft">
            <Pill className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">MediGo</span>
        </Link>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to MediGo</CardTitle>
            <p className="text-sm text-muted-foreground">Medicines delivered in minutes from your nearest pharmacy.</p>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="si-email">Email</Label>
                    <Input id="si-email" type="email" required value={signIn.email} onChange={(e) => setSignIn({ ...signIn, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-pwd">Password</Label>
                    <Input id="si-pwd" type="password" required value={signIn.password} onChange={(e) => setSignIn({ ...signIn, password: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>I am a</Label>
                    <RadioGroup value={signUp.role} onValueChange={(v) => setSignUp({ ...signUp, role: v as AppRole })} className="grid grid-cols-4 gap-2">
                      {[
                        { v: "customer", l: "Customer" },
                        { v: "pharmacy_owner", l: "Pharmacy" },
                        { v: "delivery_partner", l: "Delivery" },
                        { v: "admin", l: "Admin" },
                      ].map((o) => (
                        <Label
                          key={o.v}
                          htmlFor={`role-${o.v}`}
                          className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-sm transition ${signUp.role === o.v ? "border-primary bg-secondary text-secondary-foreground" : "hover:bg-muted"}`}
                        >
                          <RadioGroupItem id={`role-${o.v}`} value={o.v} className="sr-only" />
                          {o.l}
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Full name</Label>
                    <Input id="su-name" required value={signUp.fullName} onChange={(e) => setSignUp({ ...signUp, fullName: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="su-email">Email</Label>
                      <Input id="su-email" type="email" required value={signUp.email} onChange={(e) => setSignUp({ ...signUp, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-phone">Phone</Label>
                      <Input id="su-phone" type="tel" required value={signUp.phone} onChange={(e) => setSignUp({ ...signUp, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pwd">Password</Label>
                    <Input id="su-pwd" type="password" required minLength={8} value={signUp.password} onChange={(e) => setSignUp({ ...signUp, password: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
