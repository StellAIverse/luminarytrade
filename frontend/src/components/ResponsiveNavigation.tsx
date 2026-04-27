import React, { useState } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useTheme,
  useMediaQuery,
  Divider,
  Button,
  Stack,
} from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { useAuth } from "../context/AuthContext";

interface NavLink {
  to: string;
  label: string;
  prefetch?: () => Promise<any>;
}

interface ResponsiveNavigationProps {
  navLinks: NavLink[];
  user: any;
  onLogout: () => void;
}

const DRAWER_WIDTH = 280;

export const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({
  navLinks,
  user,
  onLogout,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavClick = () => {
    setMobileOpen(false);
  };

  const navLinkStyle = {
    color: theme.palette.primary.main,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "0.875rem",
    padding: "12px 16px",
    borderRadius: "8px",
    display: "block",
    touchAction: "manipulation",
    transition: "background-color 0.2s",
    backgroundColor:
      location.pathname === navLink.to
        ? `${theme.palette.primary.main}15`
        : "transparent",
  };

  const drawer = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        pt: 2,
        pb: 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          pb: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          LuminaryTrade
        </Typography>
        <IconButton onClick={handleDrawerToggle} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <List sx={{ flex: 1, pt: 1 }}>
        {navLinks.map((link) => (
          <ListItem key={link.to} disablePadding>
            <ListItemButton
              component={Link}
              to={link.to}
              onClick={handleNavClick}
              onMouseEnter={link.prefetch}
              sx={{
                mx: 1,
                borderRadius: 2,
                backgroundColor:
                  location.pathname === link.to
                    ? `${theme.palette.primary.main}15`
                    : "transparent",
                "&:hover": {
                  backgroundColor: `${theme.palette.primary.main}25`,
                },
              }}
            >
              <ListItemText
                primary={link.label}
                primaryTypographyProps={{
                  fontWeight: location.pathname === link.to ? 700 : 500,
                  color:
                    location.pathname === link.to
                      ? theme.palette.primary.main
                      : "text.primary",
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        {user ? (
          <Button
            variant="outlined"
            fullWidth
            onClick={onLogout}
            size="large"
            sx={{
              minHeight: 48,
              touchAction: "manipulation",
            }}
          >
            Logout
          </Button>
        ) : (
          <Stack spacing={1}>
            <Button
              variant="outlined"
              fullWidth
              component={Link}
              to="/login"
              size="large"
              sx={{ minHeight: 48 }}
            >
              Login
            </Button>
            <Button
              variant="contained"
              fullWidth
              component={Link}
              to="/signup"
              size="large"
              sx={{ minHeight: 48 }}
            >
              Sign up
            </Button>
          </Stack>
        )}
      </Box>
    </Box>
  );

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: "background.paper",
        color: "text.primary",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Toolbar
        sx={{
          minHeight: { xs: 64, sm: 56 },
          px: { xs: 1, sm: 2, md: 3 },
          gap: 1,
        }}
      >
        {isMobile && (
          <IconButton
            aria-label="open navigation drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              color: "text.primary",
              touchAction: "manipulation",
              minWidth: 48,
              minHeight: 48,
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            flexGrow: isMobile ? 1 : 0,
            textDecoration: "none",
            color: "text.primary",
            fontWeight: 800,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: { xs: "1.125rem", sm: "1.25rem" },
          }}
        >
          LuminaryTrade
        </Typography>

        {!isMobile && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
              ml: "auto",
            }}
          >
            {navLinks.map((link) => (
              <Button
                key={link.to}
                component={Link}
                to={link.to}
                onMouseEnter={link.prefetch}
                size="small"
                sx={{
                  color: "text.primary",
                  fontWeight: 600,
                  touchAction: "manipulation",
                  minHeight: 36,
                  backgroundColor:
                    location.pathname === link.to
                      ? `${theme.palette.primary.main}15`
                      : "transparent",
                  "&:hover": {
                    backgroundColor: `${theme.palette.primary.main}25`,
                  },
                }}
              >
                {link.label}
              </Button>
            ))}
          </Box>
        )}

        {!isMobile && (
          <Box sx={{ ml: 1 }}>
            {user ? (
              <Button
                variant="outlined"
                size="small"
                onClick={onLogout}
                sx={{
                  touchAction: "manipulation",
                  minHeight: 36,
                }}
              >
                Logout
              </Button>
            ) : (
              <Stack direction="row" spacing={1}>
                <Button
                  component={Link}
                  to="/login"
                  size="small"
                  sx={{ touchAction: "manipulation", minHeight: 36 }}
                >
                  Login
                </Button>
                <Button
                  component={Link}
                  to="/signup"
                  size="small"
                  variant="contained"
                  sx={{ touchAction: "manipulation", minHeight: 36 }}
                >
                  Sign up
                </Button>
              </Stack>
            )}
          </Box>
        )}
      </Toolbar>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: DRAWER_WIDTH,
            backgroundColor: "background.paper",
          },
        }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
};
