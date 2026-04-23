import React, { useState } from "react";
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Stack, 
  Alert,
  CircularProgress
} from "@mui/material";
import { useNotification } from "../contexts/NotificationContext";

const Waitlist: React.FC = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { addNotification } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, name }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to join waitlist");
      }

      setSuccess(true);
      addNotification({
        type: "success",
        title: "Joined Waitlist",
        message: "You have successfully joined the waitlist! We will notify you soon.",
        duration: 5000,
      });
    } catch (err: any) {
      setError(err.message);
      addNotification({
        type: "error",
        title: "Error",
        message: err.message,
        duration: 8000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 500, mx: "auto", mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: "bold" }}>
          Join the Waitlist
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Be the first to know when we launch new AI-powered trading features.
        </Typography>

        {success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Thank you for joining! Check your email for a welcome notification.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                label="Full Name"
                variant="outlined"
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
              <TextField
                label="Email Address"
                variant="outlined"
                type="email"
                required
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              
              {error && (
                <Alert severity="error">{error}</Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{ py: 1.5, fontSize: "1.1rem" }}
              >
                {loading ? <CircularProgress size={24} /> : "Notify Me"}
              </Button>
            </Stack>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default Waitlist;
