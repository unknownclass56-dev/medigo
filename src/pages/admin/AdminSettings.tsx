import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Settings, Save, Percent, Truck, MapPin, Clock } from "lucide-react";

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
      <div className="container max-w-4xl space-y-6 py-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">Adjust global fees, commissions, and service parameters.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              Financials
            </CardTitle>
            <CardDescription>Commission rates and base charges.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commission_pct">Platform Commission (%)</Label>
                <Input
                  id="commission_pct"
                  name="commission_pct"
                  type="number"
                  step="0.01"
                  value={formData.commission_pct}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_base_charge">Delivery Base Charge (₹)</Label>
                <Input
                  id="delivery_base_charge"
                  name="delivery_base_charge"
                  type="number"
                  value={formData.delivery_base_charge}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="service_charge">Platform Service Fee (₹)</Label>
                <p className="text-xs text-muted-foreground">Flat fee added to every customer order. Currently shown in cart as "Platform Service Fee".</p>
                <Input
                  id="service_charge"
                  name="service_charge"
                  type="number"
                  step="0.50"
                  min="0"
                  value={formData.service_charge ?? 5}
                  onChange={handleChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Logistics
            </CardTitle>
            <CardDescription>Configure delivery fees and threshold.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_per_km">Per KM Charge (₹)</Label>
                <Input
                  id="delivery_per_km"
                  name="delivery_per_km"
                  type="number"
                  value={formData.delivery_per_km}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="free_delivery_threshold">Free Delivery Above (₹)</Label>
                <Input
                  id="free_delivery_threshold"
                  name="free_delivery_threshold"
                  type="number"
                  value={formData.free_delivery_threshold}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_delivery_radius_km">Max Delivery Radius (KM)</Label>
                <Input
                  id="max_delivery_radius_km"
                  name="max_delivery_radius_km"
                  type="number"
                  value={formData.max_delivery_radius_km}
                  onChange={handleChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Service Performance
            </CardTitle>
            <CardDescription>Timeouts and windows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pharmacy_accept_window_seconds">Pharmacy Acceptance Window (sec)</Label>
                <Input
                  id="pharmacy_accept_window_seconds"
                  name="pharmacy_accept_window_seconds"
                  type="number"
                  value={formData.pharmacy_accept_window_seconds}
                  onChange={handleChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="gap-2" disabled={mutation.isPending}>
            <Save className="h-4 w-4" />
            {mutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettings;
