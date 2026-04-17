import { Outlet } from "react-router-dom";
import { DashboardShell } from "@/components/DashboardShell";
import { LayoutDashboard, Bike, Wallet, User, ShieldCheck } from "lucide-react";

const nav = [
  { to: "/delivery", label: "Overview", icon: LayoutDashboard },
  { to: "/delivery/jobs", label: "Jobs", icon: Bike },
  { to: "/delivery/earnings", label: "Wallet", icon: Wallet },
  { to: "/delivery/kyc", label: "KYC", icon: ShieldCheck },
  { to: "/delivery/profile", label: "Profile", icon: User },
];

const DeliveryLayout = () => (
  <DashboardShell brand="Delivery" nav={nav}>
    <Outlet />
  </DashboardShell>
);

export default DeliveryLayout;
