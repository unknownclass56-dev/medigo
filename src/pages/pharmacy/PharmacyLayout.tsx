import { Outlet } from "react-router-dom";
import { DashboardShell } from "@/components/DashboardShell";
import { LayoutDashboard, Package, ClipboardList, BarChart3, ShieldCheck, User } from "lucide-react";

const nav = [
  { to: "/pharmacy", label: "Overview", icon: LayoutDashboard },
  { to: "/pharmacy/orders", label: "Orders", icon: ClipboardList },
  { to: "/pharmacy/inventory", label: "Inventory", icon: Package },
  { to: "/pharmacy/kyc", label: "KYC", icon: ShieldCheck },
  { to: "/pharmacy/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/pharmacy/profile", label: "Profile", icon: User },
];

const PharmacyLayout = () => (
  <DashboardShell brand="Pharmacy" nav={nav}>
    <Outlet />
  </DashboardShell>
);

export default PharmacyLayout;
