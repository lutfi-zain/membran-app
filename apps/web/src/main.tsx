import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

// Import pages
import ForgotPasswordPage from "./pages/forgot-password";
import LoginPage from "./pages/login";
import OnboardingPage from "./pages/onboarding";
import OnboardingBotPage from "./pages/onboarding/bot";
import ResetPasswordPage from "./pages/reset-password";
import SignupPage from "./pages/signup";
import SettingsPage from "./pages/signup/settings";
import SettingsBotPage from "./pages/settings/bot";
import { VerificationBanner } from "./components/auth/VerificationBanner";

const queryClient = new QueryClient();

// Create Root Route
const rootRoute = createRootRoute({
  component: () => (
    <>
      <VerificationBanner />
      <Outlet />
    </>
  ),
});

// Create Routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-3xl font-bold">
      Welcome to Membran
    </div>
  ),
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
  component: OnboardingPage,
});

const onboardingBotRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding/bot",
  component: OnboardingBotPage,
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
  component: SettingsPage,
});

const settingsBotRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/bot",
  component: SettingsBotPage,
});

// Create Router
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  onboardingRoute,
  onboardingBotRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  settingsRoute,
  settingsBotRoute,
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
