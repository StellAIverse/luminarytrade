import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Stack,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNotification } from "../contexts/NotificationContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiClient } from "../services/api/ApiClient";
import { io, Socket } from "socket.io-client";

type WaitlistStatusType = 'form' | 'verification_pending' | 'verifying' | 'verified' | 'error';

interface WaitlistPosition {
  position: number;
  totalInWaitlist: number;
  eta: string;
}

const Waitlist: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<WaitlistStatusType>('form');
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [position, setPosition] = useState<WaitlistPosition | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      handleVerify(token);
    }
  }, [searchParams]);

  useEffect(() => {
    // Initialize socket connection for real-time updates
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
      namespace: 'waitlist',
    });

    newSocket.on('connect', () => {
      console.log('Connected to waitlist socket');
      setRealTimeEnabled(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from waitlist socket');
      setRealTimeEnabled(false);
    });

    newSocket.on('position-update', (data: WaitlistPosition) => {
      setPosition(data);
      addNotification({
        type: "info",
        title: "Position Updated",
        message: `Your waitlist position is now #${data.position}`,
        duration: 3000,
      });
    });

    newSocket.on('waitlist-updated', (data: any) => {
      if (position && email) {
        fetchPosition(email);
      }
    });

    newSocket.on('error', (error: any) => {
      console.error('Socket error:', error);
      addNotification({
        type: "error",
        title: "Connection Error",
        message: "Real-time updates unavailable",
        duration: 5000,
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [email, position]);

  const fetchPosition = async (emailToCheck: string) => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        position?: number;
        totalInWaitlist?: number;
        eta?: string;
        message?: string;
      }>(`/waitlist/position/${encodeURIComponent(emailToCheck)}`);

      if (response.data.success && response.data.position) {
        setPosition({
          position: response.data.position,
          totalInWaitlist: response.data.totalInWaitlist || 0,
          eta: response.data.eta || 'Unknown',
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch position:', err);
    }
  };

  const handleVerify = async (token: string) => {
    setStatus('verifying');
    setError(null);

    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        '/waitlist/verify',
        { token }
      );

      if (response.data.success) {
        setStatus('verified');
        addNotification({
          type: "success",
          title: t('waitlist.notifications.emailVerified.title'),
          message: t('waitlist.notifications.emailVerified.message'),
          duration: 5000,
        });
        
        // Fetch position and subscribe to real-time updates
        if (email) {
          await fetchPosition(email);
          if (socket) {
            socket.emit('subscribe-position', email);
          }
        }
      }
    } catch (err: any) {
      setStatus('error');
      const errorMessage = err.message || t('waitlist.notifications.verifyFailed');
      setError(errorMessage);
      addNotification({
        type: "error",
        title: t('waitlist.notifications.verificationFailed.title'),
        message: errorMessage,
        duration: 8000,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{ id: string; email: string; emailVerified: boolean }>(
        '/waitlist/join',
        { email, name }
      );

      if (response.data.emailVerified) {
        setStatus('verified');
        addNotification({
          type: "success",
          title: t('waitlist.notifications.joined.title'),
          message: t('waitlist.notifications.joined.message'),
          duration: 5000,
        });
      } else {
        setStatus('verification_pending');
        addNotification({
          type: "success",
          title: t('waitlist.notifications.confirmationSent.title'),
          message: t('waitlist.notifications.confirmationSent.message'),
          duration: 5000,
        });
      }
    } catch (err: any) {
      const errorMessage = err.message || t('waitlist.notifications.joinFailed');
      setError(errorMessage);
      addNotification({
        type: "error",
        title: t('waitlist.notifications.error.title'),
        message: errorMessage,
        duration: 8000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!email) return;

    setLoading(true);
    try {
      const response = await apiClient.get<{
        found: boolean;
        email?: string;
        emailVerified?: boolean;
        status?: string;
        createdAt?: string;
      }>(`/waitlist/status/${encodeURIComponent(email)}`);

      if (response.data.found) {
        if (response.data.emailVerified) {
          // If email is verified, fetch position and update status
          await fetchPosition(email);
          setStatus('verified');
          if (socket) {
            socket.emit('subscribe-position', email);
          }
        } else {
          addNotification({
            type: "info",
            title: "Waitlist Status",
            message: `Status: ${response.data.status}, Email Verified: ${response.data.emailVerified ? 'Yes' : 'No'}`,
            duration: 5000,
          });
        }
        addNotification({
          type: "info",
          title: t('waitlist.notifications.statusCheck.title'),
          message: t('waitlist.notifications.statusCheck.message', {
            status: response.data.status,
            verified: response.data.emailVerified ? t('common.yes') : t('common.no'),
          }),
          duration: 5000,
        });
      } else {
        setError(t('waitlist.notifications.notFound'));
      }
    } catch (err: any) {
      setError(err.message || t('waitlist.notifications.checkFailed'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStatus('form');
    setEmail('');
    setName('');
  };

  // ── Verifying state ──────────────────────────────────────────────────────────
  if (status === 'verifying') {
    return (
      <Box sx={{ maxWidth: 500, mx: "auto", mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            {t('waitlist.states.verifying')}
          </Typography>
        </Paper>
      </Box>
    );
  }

  // ── Verified state ───────────────────────────────────────────────────────────
  if (status === 'verified') {
    return (
      <Box sx={{ maxWidth: 600, mx: "auto", mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            {t('waitlist.states.verified.alert')}
          </Alert>
          
          {position ? (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: "bold" }}>
                Your Waitlist Position
              </Typography>
              
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <Typography variant="h2" color="primary" sx={{ fontWeight: "bold", mb: 1 }}>
                  #{position.position}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  of {position.totalInWaitlist} people on the waitlist
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={(1 - position.position / position.totalInWaitlist) * 100}
                  sx={{ height: 8, borderRadius: 4, mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary" align="center">
                  {Math.round((1 - position.position / position.totalInWaitlist) * 100)}% of people ahead of you have been processed
                </Typography>
              </Box>

              <Box sx={{ textAlign: "center", mb: 3 }}>
                <Chip 
                  label={`ETA: ${position.eta}`}
                  color="primary" 
                  variant="outlined"
                  sx={{ fontSize: '1rem', py: 1, px: 2 }}
                />
              </Box>

              {realTimeEnabled && (
                <Box sx={{ textAlign: "center", mb: 2 }}>
                  <Typography variant="body2" color="success.main">
                    ✓ Real-time updates enabled
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <CircularProgress size={24} sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Loading your position...
              </Typography>
            </Box>
          )}

          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
            We will notify you when it's your turn to access LuminaryTrade.
          </Typography>
          
          <Stack spacing={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                if (email) fetchPosition(email);
              }}
              disabled={!position}
            >
              Refresh Position
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setStatus('form');
                setEmail('');
                setName('');
                setPosition(null);
              }}
            >
              Back to Waitlist
            </Button>
          </Stack>
          <Typography variant="body1" color="text.secondary" align="center">
            {t('waitlist.states.verified.body')}
          </Typography>
          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
            onClick={resetForm}
          >
            {t('waitlist.states.verified.backButton')}
          </Button>
        </Paper>
      </Box>
    );
  }

  // ── Verification pending state ───────────────────────────────────────────────
  if (status === 'verification_pending') {
    return (
      <Box sx={{ maxWidth: 500, mx: "auto", mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            {t('waitlist.states.pending.alert')}
          </Alert>
          <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: "bold" }}>
            {t('waitlist.states.pending.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            {t('waitlist.states.pending.body', { email })}
          </Typography>
          <Button
            fullWidth
            variant="outlined"
            sx={{ mb: 2 }}
            onClick={handleCheckStatus}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : t('waitlist.states.pending.checkStatusButton')}
          </Button>
          <Button fullWidth variant="text" onClick={resetForm}>
            {t('waitlist.states.pending.backButton')}
          </Button>
        </Paper>
      </Box>
    );
  }

  // ── Default form state ───────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 500, mx: "auto", mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: "bold" }}>
          {t('waitlist.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          {t('waitlist.subtitle')}
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label={t('waitlist.form.fullName')}
              variant="outlined"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            <TextField
              label={t('waitlist.form.emailAddress')}
              variant="outlined"
              type="email"
              required
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading || !email}
              sx={{ py: 1.5, fontSize: "1.1rem" }}
            >
              {loading ? <CircularProgress size={24} /> : t('waitlist.form.joinButton')}
            </Button>

            <Button
              variant="text"
              size="small"
              onClick={handleCheckStatus}
              disabled={loading || !email}
            >
              {t('waitlist.form.checkStatus')}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
};

export default Waitlist;