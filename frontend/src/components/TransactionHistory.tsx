/**
 * TransactionHistory.tsx
 *
 * Component for displaying and filtering transaction history.
 * Includes search, status/type filters, pagination, and export functionality.
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Button,
  Alert,
  Skeleton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Refresh,
  Download,
  Search,
  Visibility,
  CheckCircle,
  Error,
  Schedule,
  Help,
  Clear,
} from "@mui/icons-material";
import { useTransactions } from "../contexts/TransactionContext";
import { TransactionStatus, TransactionType, TransactionHistoryFilter } from "../interfaces/domain";
import { TransactionTracker } from "./TransactionTracker";

// ─── Status Configuration ─────────────────────────────────────────────────────

interface StatusConfig {
  color: "default" | "primary" | "success" | "error" | "warning";
  icon: React.ReactNode;
  label: string;
}

const STATUS_CONFIG: Record<TransactionStatus, StatusConfig> = {
  pending: {
    color: "warning",
    icon: <Schedule fontSize="small" />,
    label: "Pending",
  },
  confirmed: {
    color: "success",
    icon: <CheckCircle fontSize="small" />,
    label: "Confirmed",
  },
  failed: {
    color: "error",
    icon: <Error fontSize="small" />,
    label: "Failed",
  },
  unknown: {
    color: "default",
    icon: <Help fontSize="small" />,
    label: "Unknown",
  },
};

const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: "payment", label: "Payment" },
  { value: "contract_call", label: "Contract Call" },
  { value: "token_transfer", label: "Token Transfer" },
  { value: "other", label: "Other" },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

interface FilterPanelProps {
  filter: TransactionHistoryFilter;
  onFilterChange: (filter: TransactionHistoryFilter) => void;
  onClearFilters: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filter,
  onFilterChange,
  onClearFilters,
}) => {
  const hasFilters =
    filter.status || filter.type || filter.searchQuery || filter.startDate || filter.endDate;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box mb={isMobile ? 2 : 3}>
      <Grid container spacing={isMobile ? 1.5 : 2} alignItems="center">
        {/* Search */}
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by hash, address, or memo..."
            value={filter.searchQuery || ""}
            onChange={(e) =>
              onFilterChange({ ...filter, searchQuery: e.target.value || undefined })
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& input": {
                fontSize: { xs: "16px", sm: "14px" },
                paddingY: { xs: 1.5, sm: 1 },
              },
            }}
          />
        </Grid>

        {/* Status Filter */}
        <Grid item xs={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontSize: { xs: "0.875rem", sm: "0.75rem" } }}>
              Status
            </InputLabel>
            <Select
              value={filter.status || ""}
              label="Status"
              onChange={(e) =>
                onFilterChange({
                  ...filter,
                  status: (e.target.value as TransactionStatus) || undefined,
                })
              }
              sx={{
                fontSize: { xs: "16px", sm: "14px" },
                "& .MuiSelect-select": {
                  paddingY: { xs: 1.5, sm: 1 },
                },
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Type Filter */}
        <Grid item xs={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontSize: { xs: "0.875rem", sm: "0.75rem" } }}>
              Type
            </InputLabel>
            <Select
              value={filter.type || ""}
              label="Type"
              onChange={(e) =>
                onFilterChange({
                  ...filter,
                  type: (e.target.value as TransactionType) || undefined,
                })
              }
              sx={{
                fontSize: { xs: "16px", sm: "14px" },
                "& .MuiSelect-select": {
                  paddingY: { xs: 1.5, sm: 1 },
                },
              }}
            >
              <MenuItem value="">All</MenuItem>
              {TRANSACTION_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Clear Filters */}
        <Grid item xs={12} md={2}>
          {hasFilters && (
            <Button
              fullWidth
              size="small"
              startIcon={<Clear />}
              onClick={onClearFilters}
              sx={{
                minHeight: { xs: 44, sm: 32 },
                touchAction: "manipulation",
              }}
            >
              Clear Filters
            </Button>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

interface TransactionTableProps {
  transactions: import("../interfaces/domain").BlockchainTransaction[];
  onViewDetails: (txHash: string) => void;
  truncateHash: (hash: string, chars?: number) => string;
  truncateAddress: (address: string, chars?: number) => string;
  formatType: (type: string) => string;
  isMobile: boolean;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onViewDetails,
  truncateHash,
  truncateAddress,
  formatType,
  isMobile,
}) => {
  const theme = useTheme();

  // Mobile card view
  if (isMobile) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {transactions.map((tx) => {
          const statusConfig = STATUS_CONFIG[tx.status];
          return (
            <Card
              key={tx.txHash}
              variant="outlined"
              sx={{
                borderRadius: 2,
                borderColor: "divider",
                bgcolor: "background.paper",
                "&:active": {
                  bgcolor: "action.selected",
                },
              }}
            >
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                {/* Header row with status and actions */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 1.5,
                  }}
                >
                  <Chip
                    size="small"
                    color={statusConfig.color}
                    icon={statusConfig.icon as React.ReactElement}
                    label={statusConfig.label}
                    sx={{ height: 24 }}
                  />
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => onViewDetails(tx.txHash)}
                      sx={{
                        touchAction: "manipulation",
                        minWidth: 40,
                        minHeight: 40,
                      }}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Transaction hash */}
                <Box sx={{ mb: 1.5 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: "0.75rem", mb: 0.5 }}
                  >
                    Hash
                  </Typography>
                  <Tooltip title={tx.txHash}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                        color: "primary.main",
                      }}
                    >
                      {truncateHash(tx.txHash, 8)}
                    </Typography>
                  </Tooltip>
                </Box>

                {/* Two-column info grid */}
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: "0.75rem" }}
                    >
                      Type
                    </Typography>
                    <Typography variant="body2">
                      {formatType(tx.type)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: "0.75rem" }}
                    >
                      Amount
                    </Typography>
                    <Typography variant="body2" align="right">
                      {tx.amount || "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: "0.75rem" }}
                    >
                      From
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {truncateAddress(tx.from)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: "0.75rem" }}
                    >
                      To
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {truncateAddress(tx.to)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: "0.75rem" }}
                    >
                      Fee
                    </Typography>
                    <Typography variant="body2">
                      {tx.fees.formattedTotal}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: "0.75rem" }}
                    >
                      Submitted
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
                      {formatDate(tx.submittedAt)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    );
  }

  // Desktop table view
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Hash</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>From</TableCell>
            <TableCell>To</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="right">Fee</TableCell>
            <TableCell>Submitted</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((tx) => {
            const statusConfig = STATUS_CONFIG[tx.status];
            return (
              <TableRow key={tx.txHash} hover>
                <TableCell>
                  <Tooltip title={tx.txHash}>
                    <span>{truncateHash(tx.txHash, 8)}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={statusConfig.color}
                    icon={statusConfig.icon as React.ReactElement}
                    label={statusConfig.label}
                  />
                </TableCell>
                <TableCell>{formatType(tx.type)}</TableCell>
                <TableCell>{truncateAddress(tx.from)}</TableCell>
                <TableCell>{truncateAddress(tx.to)}</TableCell>
                <TableCell align="right">{tx.amount || "-"}</TableCell>
                <TableCell align="right">{tx.fees.formattedTotal}</TableCell>
                <TableCell>{formatDate(tx.submittedAt)}</TableCell>
                <TableCell align="center">
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => onViewDetails(tx.txHash)}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface TransactionHistoryProps {
  onTransactionSelect?: (txHash: string) => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  onTransactionSelect,
}) => {
  const {
    history,
    isLoadingHistory,
    historyError,
    loadHistory,
    refreshHistory,
    exportHistory,
    truncateHash,
    truncateAddress,
    formatType,
  } = useTransactions();

  const [filter, setFilter] = useState<TransactionHistoryFilter>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedTx, setSelectedTx] = useState<string | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Load history on mount and when filter/page changes
  useEffect(() => {
    loadHistory(filter, page + 1, rowsPerPage);
  }, [filter, page, rowsPerPage, loadHistory]);

  const handleClearFilters = useCallback(() => {
    setFilter({});
    setPage(0);
  }, []);

  const handleChangePage = useCallback((_: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      setPage(0);
    },
    []
  );

  const handleViewDetails = useCallback(
    (txHash: string) => {
      setSelectedTx(txHash);
      onTransactionSelect?.(txHash);
    },
    [onTransactionSelect]
  );

  const handleCloseDetails = useCallback(() => {
    setSelectedTx(null);
  }, []);

  const handleExport = useCallback(() => {
    const timestamp = new Date().toISOString().split("T")[0];
    exportHistory(`transaction-history-${timestamp}.csv`);
  }, [exportHistory]);

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={3}
        >
          <Typography variant="h6">Transaction History</Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="Refresh">
              <IconButton onClick={refreshHistory} disabled={isLoadingHistory}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download />}
              onClick={handleExport}
              disabled={!history?.transactions.length}
            >
              Export
            </Button>
          </Box>
        </Box>

        {/* Error Alert */}
        {historyError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {historyError}
          </Alert>
        )}

        {/* Filters */}
        <FilterPanel
          filter={filter}
          onFilterChange={setFilter}
          onClearFilters={handleClearFilters}
        />

        {/* Loading State */}
        {isLoadingHistory && !history && (
          <Box>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} height={50} sx={{ mb: 1 }} />
            ))}
          </Box>
        )}

        {/* Empty State */}
        {!isLoadingHistory && history?.transactions.length === 0 && (
          <Alert severity="info">No transactions found</Alert>
        )}

        {/* Transaction Table */}
        {history && history.transactions.length > 0 && (
          <>
            <TransactionTable
              transactions={history.transactions}
              onViewDetails={handleViewDetails}
              truncateHash={truncateHash}
              truncateAddress={truncateAddress}
              formatType={formatType}
              isMobile={isMobile}
            />
            {!isMobile && (
              <TablePagination
                component="div"
                count={history.totalCount}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 20, 50]}
              />
            )}
            {isMobile && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 2,
                  pt: 2,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Showing {Math.min(page * rowsPerPage + 1, history.totalCount)}-
                  {Math.min((page + 1) * rowsPerPage, history.totalCount)} of{" "}
                  {history.totalCount}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                    sx={{ touchAction: "manipulation", minHeight: 36 }}
                  >
                    Previous
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * rowsPerPage >= history.totalCount}
                    sx={{ touchAction: "manipulation", minHeight: 36 }}
                  >
                    Next
                  </Button>
                </Stack>
              </Box>
            )}
          </>
        )}
      </CardContent>

      {/* Details Dialog */}
      <Dialog
        open={!!selectedTx}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Transaction Details</DialogTitle>
        <DialogContent>
          {selectedTx && (
            <TransactionTracker txHash={selectedTx} showDetails />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default TransactionHistory;
