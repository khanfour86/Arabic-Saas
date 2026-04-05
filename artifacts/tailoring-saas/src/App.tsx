import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";

import { Login } from "./pages/login";
import { OwnerDashboard, OwnerShops } from "./pages/owner";
import { ShopDashboard } from "./pages/shop/dashboard";
import { CustomersList } from "./pages/shop/customers";
import { CustomerDetail } from "./pages/shop/customer-detail";
import { InvoicesList, InvoiceDetail } from "./pages/shop/invoices";
import { InvoiceCreate } from "./pages/shop/invoice-create";
import { InvoiceEdit } from "./pages/shop/invoice-edit";
import { TailorQueue } from "./pages/shop/tailor-queue";
import { ShopSettings } from "./pages/shop/settings";
import { WorkflowDashboard } from "./pages/shop/workflow";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "");
const baseUrl = import.meta.env.BASE_URL;
const appHomeUrl = new URL(baseUrl, window.location.origin).toString();

function withApiBaseUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!apiBaseUrl) {
    return input;
  }

  if (typeof input === "string") {
    return input.startsWith("/api/") ? `${apiBaseUrl}${input}` : input;
  }

  if (input instanceof URL) {
    return input.pathname.startsWith("/api/")
      ? new URL(`${apiBaseUrl}${input.pathname}${input.search}${input.hash}`)
      : input;
  }

  const currentOrigin =
    typeof window !== "undefined" ? window.location.origin : undefined;

  if (currentOrigin && input.url.startsWith(`${currentOrigin}/api/`)) {
    return new Request(`${apiBaseUrl}${input.url.slice(currentOrigin.length)}`, input);
  }

  return input;
}

// Setup global fetch interceptor to inject JWT token
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const resolvedInput = withApiBaseUrl(input);
  const token = localStorage.getItem('auth_token');
  if (token) {
    init = init || {};
    // Use the Headers constructor to safely merge — spreading a Headers object
    // with { ...headers } loses all values since Headers entries are not enumerable.
    const headers = new Headers(init.headers as HeadersInit | undefined);
    headers.set('Authorization', `Bearer ${token}`);
    init.headers = headers;
  }
  return originalFetch(resolvedInput, init);
};

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background" dir="rtl">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Allow unrestricted access to login
  if (location === '/login' || location === '/') {
    if (user) {
      // Redirect if already logged in
      window.location.href = user.role === 'owner' ? '/owner/dashboard' : user.role === 'tailor' ? '/shop/tailor' : '/shop/dashboard';
      return null;
    }
    return <Login />;
  }

  // Protect all other routes
  if (!user) {
    window.location.href = appHomeUrl;
    return null;
  }

  return (
    <Layout>
      <Switch>
        {/* Owner Routes */}
        {user.role === 'owner' && (
          <>
            <Route path="/owner/dashboard" component={OwnerDashboard} />
            <Route path="/owner/shops" component={OwnerShops} />
          </>
        )}

        {/* Shop Routes */}
        {['shop_manager', 'reception', 'tailor'].includes(user.role) && (
          <>
            <Route path="/shop/dashboard" component={ShopDashboard} />
            
            {/* Customers */}
            <Route path="/shop/customers" component={CustomersList} />
            <Route path="/shop/customers/:id" component={CustomerDetail} />
            
            {/* Invoices */}
            <Route path="/shop/invoices" component={InvoicesList} />
            <Route path="/shop/invoices/new" component={InvoiceCreate} />
            <Route path="/shop/invoices/:id/edit" component={InvoiceEdit} />
            <Route path="/shop/invoices/:id" component={InvoiceDetail} />
            
            {/* Tailor */}
            <Route path="/shop/tailor" component={TailorQueue} />

            {/* Workflow Dashboard (Manager only) */}
            {user.role === 'shop_manager' && (
              <Route path="/shop/workflow" component={WorkflowDashboard} />
            )}

            {/* Settings (Manager only) */}
            {user.role === 'shop_manager' && (
              <Route path="/shop/settings" component={ShopSettings} />
            )}
          </>
        )}

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
