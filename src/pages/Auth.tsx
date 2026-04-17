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

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground font-bold">Or continue with</span></div>
            </div>

            <Button 
              variant="outline" 
              className="w-full h-11 font-bold flex items-center justify-center gap-3 border-2 hover:bg-gray-50 transition-all"
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: `${window.location.origin}/` }
                });
                if (error) toast.error(error.message);
              }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
