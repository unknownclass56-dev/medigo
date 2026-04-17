import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing.tsx";
import AuthPage from "./pages/Auth.tsx";
import CustomerLayout from "./pages/customer/CustomerLayout.tsx";
import CustomerHome from "./pages/customer/CustomerHome.tsx";
import CustomerSearch from "./pages/customer/CustomerSearch.tsx";
import CustomerCart from "./pages/customer/CustomerCart.tsx";
import CustomerOrders from "./pages/customer/CustomerOrders.tsx";
import CustomerProfile from "./pages/customer/CustomerProfile.tsx";
import PharmacyLayout from "./pages/pharmacy/PharmacyLayout.tsx";
import PharmacyHome from "./pages/pharmacy/PharmacyHome.tsx";
import PharmacyOrders from "./pages/pharmacy/PharmacyOrders.tsx";
import PharmacyInventory from "./pages/pharmacy/PharmacyInventory.tsx";
import PharmacyKyc from "./pages/pharmacy/PharmacyKyc.tsx";
import PharmacyAnalytics from "./pages/pharmacy/PharmacyAnalytics.tsx";
import PharmacyProfile from "./pages/pharmacy/PharmacyProfile.tsx";
import DeliveryLayout from "./pages/delivery/DeliveryLayout.tsx";
import DeliveryHome from "./pages/delivery/DeliveryHome.tsx";
import DeliveryJobs from "./pages/delivery/DeliveryJobs.tsx";
import DeliveryEarnings from "./pages/delivery/DeliveryEarnings.tsx";
import DeliveryKyc from "./pages/delivery/DeliveryKyc.tsx";
import DeliveryProfile from "./pages/delivery/DeliveryProfile.tsx";
import AdminHome from "./pages/admin/AdminHome.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

import { CartProvider } from "@/lib/cart";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />

            <Route path="/app" element={
              <ProtectedRoute allow={["customer"]}>
                <CartProvider>
                  <CustomerLayout />
                </CartProvider>
              </ProtectedRoute>
            }>
              <Route index element={<CustomerHome />} />
              <Route path="search" element={<CustomerSearch />} />
              <Route path="cart" element={<CustomerCart />} />
              <Route path="orders" element={<CustomerOrders />} />
              <Route path="profile" element={<CustomerProfile />} />
            </Route>
            <Route path="/pharmacy" element={
              <ProtectedRoute allow={["pharmacy_owner"]}><PharmacyLayout /></ProtectedRoute>
            }>
              <Route index element={<PharmacyHome />} />
              <Route path="orders" element={<PharmacyOrders />} />
              <Route path="inventory" element={<PharmacyInventory />} />
              <Route path="kyc" element={<PharmacyKyc />} />
              <Route path="analytics" element={<PharmacyAnalytics />} />
              <Route path="profile" element={<PharmacyProfile />} />
            </Route>
            <Route path="/delivery" element={
              <ProtectedRoute allow={["delivery_partner"]}><DeliveryLayout /></ProtectedRoute>
            }>
              <Route index element={<DeliveryHome />} />
              <Route path="jobs" element={<DeliveryJobs />} />
              <Route path="earnings" element={<DeliveryEarnings />} />
              <Route path="kyc" element={<DeliveryKyc />} />
              <Route path="profile" element={<DeliveryProfile />} />
            </Route>
            <Route path="/admin/*" element={
              <ProtectedRoute allow={["admin"]}><AdminHome /></ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
