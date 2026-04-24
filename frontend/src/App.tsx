import React, { Suspense, lazy } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { Box, Button, Stack, Typography, useTheme } from "@mui/material";
import { useAuth } from "./context/AuthContext";
import AuthPage from "./components/auth/AuthPage";
import { useResponsive } from "./hooks/useResponsive";
import ProtectedRoute from "./components/auth/ProtectedRoute";

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
    <Typography variant="body1">Loading...</Typography>
  </Box>
);

const App: React.FC = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const { isMobile } = useResponsive();

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
      prefetch: () =>
        import("./components/examples/ResponsiveComponentExamples"),
    },
    {
      to: "/waitlist",
      label: "Waitlist",
      prefetch: () => import("./components/Waitlist"),
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
<Box
  component="nav"
  sx={{
    px: { xs: 2, sm: 3, md: 4 },
    py: { xs: 2, sm: 3 }, // Increased vertical padding on mobile for touch
    borderBottom: "1px solid",
    borderColor: "divider",
    backgroundColor: "background.paper",
    position: "sticky",
    top: 0,
    zIndex: 10,
    minHeight: { xs: 64, sm: 56 }, // Minimum height for touch targets
  }}
>
        <Stack
          direction={isMobile ? "column" : "row"}
          spacing={2}
          alignItems={isMobile ? "flex-start" : "center"}
        >
          <Stack
            direction={isMobile ? "column" : "row"}
            spacing={2}
            alignItems={isMobile ? "flex-start" : "center"}
            flexWrap="wrap"
          >
{navLinks.map((link) => (
               <Link
                 key={link.to}
                 to={link.to}
                 onMouseEnter={link.prefetch}
                 style={{
                   color: theme.palette.primary.main,
                   textDecoration: "none",
                   fontSize: theme.typography.body2.fontSize as string,
                   fontWeight: 600,
                   padding: { xs: '8px 12px', sm: '6px 12px' }[theme.breakpoints.up('sm') ? 'sm' : 'xs'] as unknown as string,
                   borderRadius: '4px',
                   // Add touch feedback
                   '&:active': {
                     backgroundColor: 'rgba(255,255,255,0.1)',
                   },
                 }}
               >
                 {link.label}
               </Link>
             ))}
          </Stack>

          <Box sx={{ marginLeft: isMobile ? 0 : "auto" }}>
            {user ? (
              <Button
                variant="outlined"
                onClick={() => void logout()}
                size="small"
              >
                Logout
              </Button>
            ) : (
              <Stack direction="row" spacing={1.5}>
                <Link to="/login">Login</Link>
                <Link to="/signup">Sign up</Link>
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>

      <Box
        component="main"
        sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 } }}
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
