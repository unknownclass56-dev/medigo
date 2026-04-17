import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Settings, Save, Percent, Truck, MapPin, Clock, CreditCard, ShieldAlert } from "lucide-react";

const AdminSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ["platform-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_config")
        .select("*")
        .eq("id", 1)
        .single();
      
      if (error) throw error;
      setFormData(data);
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (updatedConfig: any) => {
      const { error } = await supabase
        .from("platform_config")
        .update(updatedConfig)
        .eq("id", 1);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-config"] });
      toast({
        title: "Settings Saved",
        description: "Platform configuration has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  if (isLoading || !formData) {
    return (
      <div className="container max-w-4xl space-y-6 py-6 font-sans">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl space-y-8 py-8 font-sans">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Configuration</h1>
        <p className="text-muted-foreground mt-2">Central hub to manage all charges, delivery fees, and operational parameters.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 pb-20">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Financials Section */}
          <Card className="shadow-soft border-primary/10">
            <CardHeader className="bg-primary/5 rounded-t-xl">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                Financial Settings
              </CardTitle>
              <CardDescription>Manage platform revenue streams</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="commission_pct" className="font-semibold">Platform Commission (%)</Label>
                  <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">Pharmacy Cut</span>
                </div>
                <p className="text-xs text-muted-foreground">The percentage cut taken from the pharmacy's subtotal on every order.</p>
                <div className="relative">
                  <Input id="commission_pct" name="commission_pct" type="number" step="0.1" value={formData.commission_pct} onChange={handleChange} className="pl-8" />
                  <Percent className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="service_charge" className="font-semibold">Service Charge (₹)</Label>
                  <span className="text-xs font-bold text-green-600 px-2 py-0.5 bg-green-50 rounded-full">Direct Profit</span>
                </div>
                <p className="text-xs text-muted-foreground">Fixed convenience fee charged to the customer on every checkout.</p>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground">₹</span>
                  <Input id="service_charge" name="service_charge" type="number" step="1" value={formData.service_charge} onChange={handleChange} className="pl-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logistics Section */}
          <Card className="shadow-soft border-orange-200/50">
            <CardHeader className="bg-orange-50/50 rounded-t-xl">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-orange-700">
                <Truck className="h-5 w-5" />
                Delivery Logistics
              </CardTitle>
              <CardDescription>Configure shipping costs and limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="delivery_base_charge" className="font-semibold">Base Charge (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground">₹</span>
                    <Input id="delivery_base_charge" name="delivery_base_charge" type="number" value={formData.delivery_base_charge} onChange={handleChange} className="pl-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery_per_km" className="font-semibold">Per KM Fee (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground">₹</span>
                    <Input id="delivery_per_km" name="delivery_per_km" type="number" value={formData.delivery_per_km} onChange={handleChange} className="pl-8" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="free_delivery_threshold" className="font-semibold">Free Delivery Above (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground">₹</span>
                  <Input id="free_delivery_threshold" name="free_delivery_threshold" type="number" value={formData.free_delivery_threshold} onChange={handleChange} className="pl-8" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_delivery_radius_km" className="font-semibold flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Max Radius (KM)
                </Label>
                <Input id="max_delivery_radius_km" name="max_delivery_radius_km" type="number" value={formData.max_delivery_radius_km} onChange={handleChange} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operations Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-soft border-blue-200/50">
            <CardHeader className="bg-blue-50/50 rounded-t-xl">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-blue-700">
                <Clock className="h-5 w-5" />
                Operational Parameters
              </CardTitle>
              <CardDescription>System timeouts and automation rules</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pharmacy_accept_window_seconds" className="font-semibold text-sm">Pharmacy Acceptance Window (Sec)</Label>
                  <div className="relative">
                    <Input id="pharmacy_accept_window_seconds" name="pharmacy_accept_window_seconds" type="number" value={formData.pharmacy_accept_window_seconds} onChange={handleChange} className="pl-8" />
                    <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50/30 p-4 flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-blue-600 mt-0.5" />
                  <p className="text-[10px] text-blue-800/80 leading-relaxed font-bold">Changes apply instantly to new orders.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Home Banner Management */}
          <Card className="shadow-soft border-purple-200/50">
            <CardHeader className="bg-purple-50/50 rounded-t-xl">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-purple-700">
                <LayoutDashboard className="h-5 w-5" />
                Home Banner Setup
              </CardTitle>
              <CardDescription>Customize the main promotional banner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="banner_badge" className="font-semibold text-sm">Discount Badge (e.g. FLAT 25% OFF)</Label>
                <Input id="banner_badge" name="banner_badge" value={formData.banner_badge || ''} onChange={handleChange} placeholder="FLAT 25% OFF" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner_title" className="font-semibold text-sm">Banner Main Title</Label>
                <Input id="banner_title" name="banner_title" value={formData.banner_title || ''} onChange={handleChange} placeholder="Get your medicines Delivered..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner_subtitle" className="font-semibold text-sm">Banner Subtitle</Label>
                <Input id="banner_subtitle" name="banner_subtitle" value={formData.banner_subtitle || ''} onChange={handleChange} placeholder="Verified Pharmacies..." />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Floating Action Button for Saving */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button type="submit" size="lg" className="shadow-xl px-8 gap-2 rounded-full h-14" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {mutation.isPending ? "Updating Platform..." : "Save Global Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettings;

const Loader2 = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
