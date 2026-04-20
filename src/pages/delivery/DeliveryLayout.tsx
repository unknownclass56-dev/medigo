import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { DashboardShell } from "@/components/DashboardShell";
import { LayoutDashboard, Truck, Wallet, ShieldCheck, User, AlertCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DeliveryLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: partner, isLoading } = useQuery({
    queryKey: ["current-partner"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_partners")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user,
  });

  const isApproved = partner?.approved === true;
  const isKycPage = location.pathname.includes("/kyc");
  const isProfilePage = location.pathname.includes("/profile");

  useEffect(() => {
    if (!isLoading && !isApproved && !isKycPage && !isProfilePage) {
      navigate("/delivery/kyc");
    }
  }, [isLoading, isApproved, isKycPage, isProfilePage, navigate]);

  const nav = [
    { to: "/delivery", label: "Dashboard", icon: LayoutDashboard, disabled: !isApproved },
    { to: "/delivery/jobs", label: "Find Jobs", icon: Truck, disabled: !isApproved },
    { to: "/delivery/earnings", label: "Earnings", icon: Wallet, disabled: !isApproved },
    { to: "/delivery/kyc", label: "KYC Verification", icon: ShieldCheck },
    { to: "/delivery/profile", label: "Profile", icon: User },
  ].filter(item => isApproved || item.to.includes("/kyc") || item.to.includes("/profile"));

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardShell brand="Delivery Partner" nav={nav}>
      {!isApproved && !isKycPage && (
        <Alert variant="destructive" className="mb-6 border-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-black italic">KYC Verification Required</AlertTitle>
          <AlertDescription className="font-bold">
            Please complete your KYC to start receiving delivery jobs. Your account will be activated after admin review.
          </AlertDescription>
        </Alert>
      )}
      <Outlet />
    </DashboardShell>
  );
};

export default DeliveryLayout;
