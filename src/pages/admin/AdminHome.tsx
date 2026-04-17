import { Routes, Route } from "react-router-dom";
import { DashboardShell } from "@/components/DashboardShell";
import { LayoutDashboard, Users, Building2, Truck, Settings, AlertCircle, Wallet } from "lucide-react";
import AdminOverview from "./AdminOverview";

import AdminUsers from "./AdminUsers";
import AdminPharmacies from "./AdminPharmacies";
import AdminDelivery from "./AdminDelivery";
import AdminSettings from "./AdminSettings";
import AdminComplaints from "./AdminComplaints";
import AdminEarnings from "./AdminEarnings";
import AdminSettlements from "./AdminSettlements";

const nav = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/pharmacies", label: "Pharmacies", icon: Building2 },
  { to: "/admin/delivery", label: "Delivery", icon: Truck },
  { to: "/admin/financials", label: "Financials", icon: Wallet },
  { to: "/admin/settlements", label: "Settlements", icon: Wallet },
  { to: "/admin/complaints", label: "Complaints", icon: AlertCircle },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];


const AdminHome = () => (
  <DashboardShell brand="Admin Dashboard" nav={nav}>
    <Routes>
      <Route index element={<AdminOverview />} />
      <Route path="overview" element={<AdminOverview />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="pharmacies" element={<AdminPharmacies />} />
      <Route path="delivery" element={<AdminDelivery />} />
      <Route path="financials" element={<AdminEarnings />} />
      <Route path="settlements" element={<AdminSettlements />} />
      <Route path="complaints" element={<AdminComplaints />} />
      <Route path="settings" element={<AdminSettings />} />
      <Route path="*" element={<AdminOverview />} />
    </Routes>
  </DashboardShell>
);

export default AdminHome;



