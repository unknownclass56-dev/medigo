import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { DashboardShell } from "@/components/DashboardShell";
import { LayoutDashboard, Package, ClipboardList, BarChart3, ShieldCheck, User, AlertCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PharmacyLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: pharmacy, isLoading } = useQuery({
    queryKey: ["current-pharmacy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacies")
        .select("*")
        .eq("owner_id", user?.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user,
  });

  const isApproved = pharmacy?.status === "approved";
  const isKycPage = location.pathname.includes("/kyc");
  const isProfilePage = location.pathname.includes("/profile");

  useEffect(() => {
    if (!isLoading && !isApproved && !isKycPage && !isProfilePage) {
      navigate("/pharmacy/kyc");
    }
  }, [isLoading, isApproved, isKycPage, isProfilePage, navigate]);

  const nav = [
    { to: "/pharmacy", label: "Overview", icon: LayoutDashboard, disabled: !isApproved },
    { to: "/pharmacy/orders", label: "Orders", icon: ClipboardList, disabled: !isApproved },
    { to: "/pharmacy/inventory", label: "Inventory", icon: Package, disabled: !isApproved },
    { to: "/pharmacy/kyc", label: "KYC", icon: ShieldCheck },
    { to: "/pharmacy/analytics", label: "Analytics", icon: BarChart3, disabled: !isApproved },
    { to: "/pharmacy/profile", label: "Profile", icon: User },
  ].filter(item => isApproved || item.to.includes("/kyc") || item.to.includes("/profile"));

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardShell brand="MediHelth Pharmacy" nav={nav}>
      {!isApproved && !isKycPage && (
        <Alert variant="destructive" className="mb-6 border-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-black italic">Account Not Approved</AlertTitle>
          <AlertDescription className="font-bold">
            Please complete your KYC to unlock all features. Your request will be sent to admin after submission.
          </AlertDescription>
        </Alert>
      )}
      <Outlet />
    </DashboardShell>
  );
};

export default PharmacyLayout;
