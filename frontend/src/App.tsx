import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Box } from "@mui/material";
import { useAuth } from "./context/AuthContext";
import AuthPage from "./components/auth/AuthPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { ResponsiveNavigation } from "./components/ResponsiveNavigation";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { useTranslation } from 'react-i18next';

const Dashboard = lazy(() => import("./components/Dashboard"));
const CreditScoring = lazy(() => import("./components/CreditScoring"));
const FraudDetection = lazy(() => import("./components/FraudDetection"));
const WalletInterface = lazy(() => import("./components/WalletInterface"));
const TransactionPage = lazy(() => import("./components/TransactionPage"));
const GrowthHub = lazy(() => import("./components/GrowthHub"));
const ReferralDashboard = lazy(() => import("./components/ReferralDashboard"));
const AffiliateDashboard = lazy(() => import("./components/AffiliateDashboard"));
const BugReportForm = lazy(() => import("./components/BugReportForm"));
const NotificationCenter = lazy(() => import("./components/NotificationCenter"));
const ResponsiveExamples = lazy(
  () => import("./components/examples/ResponsiveComponentExamples"),
);
const Waitlist = lazy(() => import("./components/Waitlist"));

const Loading: React.FC = () => (
  <Box sx={{ py: 6, textAlign: "center" }}>
    <Box component="span" sx={{ fontSize: "1.5rem" }}>⏳</Box>
    <Box component="p" sx={{ mt: 1 }}>Loading...</Box>
  </Box>
);

const navLinks = [
  {
    to: "/",
    label: "Dashboard",
    prefetch: () => import("./components/Dashboard"),
  },
  {
    to: "/scoring",
    label: "Credit Scoring",
    prefetch: () => import("./components/CreditScoring"),
  },
  {
    to: "/fraud",
    label: "Fraud Detection",
    prefetch: () => import("./components/FraudDetection"),
  },
  {
    to: "/wallet",
    label: "Wallet",
    prefetch: () => import("./components/WalletInterface"),
  },
  {
    to: "/transactions",
    label: "Transactions",
    prefetch: () => import("./components/TransactionPage"),
  },
  {
    to: "/growth",
    label: "Growth Hub",
    prefetch: () => import("./components/GrowthHub"),
  },
  {
    to: "/referrals",
    label: "Referrals",
    prefetch: () => import("./components/ReferralDashboard"),
  },
  {
    to: "/affiliate",
    label: "Affiliate",
    prefetch: () => import("./components/AffiliateDashboard"),
  },
  {
    to: "/bug-reports",
    label: "Bug Reports",
    prefetch: () => import("./components/BugReportForm"),
  },
  {
    to: "/notifications",
    label: "Notifications",
    prefetch: () => import("./components/NotificationCenter"),
  },
  {
    to: "/responsive-examples",
    label: "Responsive Examples",
    prefetch: () => import("./components/examples/ResponsiveComponentExamples"),
  },
  {
    to: "/waitlist",
    label: "Waitlist",
    prefetch: () => import("./components/Waitlist"),
  },
];

const App: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      <ResponsiveNavigation
        navLinks={navLinks}
        user={user}
        onLogout={logout}
      />

      <Box
        component="main"
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 2, sm: 3 },
          paddingTop: { xs: 3, sm: 4, md: 5 },
        }}
      >
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/signup" element={<AuthPage mode="signup" />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/scoring" element={<CreditScoring />} />
              <Route path="/fraud" element={<FraudDetection />} />
              <Route path="/wallet" element={<WalletInterface />} />
              <Route path="/transactions" element={<TransactionPage />} />
              <Route path="/growth" element={<GrowthHub />} />
              <Route path="/referrals" element={<ReferralDashboard />} />
              <Route path="/affiliate" element={<AffiliateDashboard />} />
              <Route path="/bug-reports" element={<BugReportForm />} />
              <Route path="/notifications" element={<NotificationCenter />} />
            </Route>
            <Route path="/waitlist" element={<Waitlist />} />
            <Route
              path="/responsive-examples"
              element={<ResponsiveExamples />}
            />
          </Routes>
        </Suspense>
      </Box>
    </Box>
  );
};

export default App;
