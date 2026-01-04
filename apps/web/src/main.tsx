import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

// Import pages
import ForgotPasswordPage from "./pages/forgot-password";
import LoginPage from "./pages/login";
import OnboardingPage from "./pages/onboarding";
import OnboardingBotPage from "./pages/onboarding/bot";
import OnboardingPricingPage from "./pages/onboarding/pricing";
import ResetPasswordPage from "./pages/reset-password";
import SignupPage from "./pages/signup";
import SettingsPage from "./pages/signup/settings";
import SettingsBotPage from "./pages/settings/bot";
import SettingsPricingPage from "./pages/settings/pricing";
import { VerificationBanner } from "./components/auth/VerificationBanner";
import { LandingPage } from "./components/navigation/LandingPage";
import { Dashboard } from "./components/navigation/Dashboard";
import { NotFound } from "./components/NotFound";
import { TestPage } from "./pages/test";
import { DashboardDummyPage } from "./pages/dashboard-dummy";
import { PricingPage } from "./pages/pricing";
import { CheckoutPage } from "./pages/checkout";
import { MemberPortal } from "./pages/member-portal";

const queryClient = new QueryClient();

// Create Root Route
const rootRoute = createRootRoute({
  component: () => (
    <>
      <VerificationBanner />
      <Outlet />
    </>
  ),
  notFoundComponent: NotFound,
});

// Create Routes
// Index Route - Landing Page with auth-aware redirect
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async ({ location }) => {
    // Check if user is authenticated
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          // Authenticated users redirect to dashboard
          throw redirect({ to: "/dashboard" });
        }
      }
    } catch (e) {
      // If redirect was thrown, re-throw it
      if (e instanceof Error && "to" in e) throw e;
      // Otherwise continue to landing page
    }
  },
  component: LandingPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: SignupPage,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  beforeLoad: async ({ location }) => {
    // Check authentication
    const authRes = await fetch("/api/auth/me");
    if (!authRes.ok) {
      throw redirect({
        to: "/login",
        search: { return: location.href },
      });
    }

    // Redirect to correct step based on onboarding state
    const onboardingRes = await fetch("/api/onboarding/state");
    if (onboardingRes.ok) {
      const onboardingData = await onboardingRes.json();
      if (onboardingData.completedAt) {
        throw redirect({ to: "/dashboard" });
      } else if (!onboardingData.botConnected) {
        throw redirect({ to: "/onboarding/bot" });
      } else if (!onboardingData.pricingConfigured) {
        throw redirect({ to: "/onboarding/pricing" });
      } else {
        // Both complete but not marked - auto-complete and redirect
        await fetch("/api/onboarding/complete", { method: "POST" });
        throw redirect({ to: "/dashboard" });
      }
    }
  },
  component: OnboardingPage,
});

const onboardingBotRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding/bot",
  component: OnboardingBotPage,
});

const onboardingPricingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding/pricing",
  component: OnboardingPricingPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  component: ResetPasswordPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  beforeLoad: async () => {
    throw redirect({ to: "/settings/bot" });
  },
});

const settingsBotRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/bot",
  beforeLoad: async ({ location }) => {
    // Check authentication
    const authRes = await fetch("/api/auth/me");
    if (!authRes.ok) {
      throw redirect({
        to: "/login",
        search: { return: location.href },
      });
    }

    // Check onboarding state - redirect to onboarding if incomplete
    const onboardingRes = await fetch("/api/onboarding/state");
    if (onboardingRes.ok) {
      const onboardingData = await onboardingRes.json();
      if (!onboardingData.botConnected) {
        throw redirect({ to: "/onboarding/bot" });
      }
    }
  },
  component: SettingsBotPage,
});

// Dashboard Route - Authenticated hub with onboarding check
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  beforeLoad: async ({ location }) => {
    // Check authentication
    const authRes = await fetch("/api/auth/me");
    if (!authRes.ok) {
      throw redirect({
        to: "/login",
        search: { return: location.href },
      });
    }

    const authData = await authRes.json();
    if (!authData.user) {
      throw redirect({
        to: "/login",
        search: { return: location.href },
      });
    }

    // Check onboarding state
    const onboardingRes = await fetch("/api/onboarding/state");
    if (onboardingRes.ok) {
      const onboardingData = await onboardingRes.json();
      if (!onboardingData.completedAt) {
        if (!onboardingData.botConnected) {
          throw redirect({ to: "/onboarding/bot" });
        } else if (!onboardingData.pricingConfigured) {
          throw redirect({ to: "/onboarding/pricing" });
        }
      }
    }
  },
  component: Dashboard,
});

// Settings Pricing Route - Missing from route tree
const settingsPricingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/pricing",
  beforeLoad: async ({ location }) => {
    // Check authentication
    const authRes = await fetch("/api/auth/me");
    if (!authRes.ok) {
      throw redirect({
        to: "/login",
        search: { return: location.href },
      });
    }

    const authData = await authRes.json();
    if (!authData.user) {
      throw redirect({
        to: "/login",
        search: { return: location.href },
      });
    }

    // Check onboarding state
    const onboardingRes = await fetch("/api/onboarding/state");
    if (onboardingRes.ok) {
      const onboardingData = await onboardingRes.json();
      if (!onboardingData.botConnected) {
        throw redirect({ to: "/onboarding/bot" });
      }
    }
  },
  component: SettingsPricingPage,
});


// Test Route - For component library testing
const testRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/test",
  component: TestPage,
});

// Dashboard Dummy Route - For theme showcase
const dashboardDummyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard-dummy",
  component: DashboardDummyPage,
});

// Pricing Route - Public pricing page
const pricingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pricing",
  component: () => <PricingPage serverId="hm31pithttsxh5hcaq9xk198m" />,
});

// Checkout Route - Payment confirmation page
const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/checkout",
  component: CheckoutPage,
});

// Member Portal Route - T067 [US3]: Self-service subscription management
const memberPortalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/member-portal",
  beforeLoad: async ({ location }) => {
    // Check authentication - require sign in
    const authRes = await fetch("/api/auth/me");
    if (!authRes.ok) {
      throw redirect({
        to: "/login",
        search: { return: "/member-portal" },
      });
    }
  },
  component: MemberPortal,
});

// Create Router
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  dashboardRoute,
  onboardingRoute,
  onboardingBotRoute,
  onboardingPricingRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  settingsRoute,
  testRoute,
  dashboardDummyRoute,
  settingsBotRoute,
  settingsPricingRoute,
  pricingRoute,
  checkoutRoute,
  memberPortalRoute,
]);

const router = createRouter({ routeTree });

// Register router for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
