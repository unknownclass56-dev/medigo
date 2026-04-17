import { Outlet } from "react-router-dom";
import { DashboardShell } from "@/components/DashboardShell";
import { Home, Search, ClipboardList, User, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";

const CustomerLayout = () => {
  const { count } = useCart();

  const nav = [
    { to: "/app", label: "Home", icon: Home },
    { to: "/app/search", label: "Search", icon: Search },
    { to: "/app/cart", label: "Cart", icon: ShoppingCart, badge: count },
    { to: "/app/orders", label: "Orders", icon: ClipboardList },
    { to: "/app/profile", label: "Profile", icon: User },
  ];

  return (
    <DashboardShell brand="Customer" nav={nav}>
      <Outlet />
    </DashboardShell>
  );
};

export default CustomerLayout;
