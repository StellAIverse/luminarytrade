import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AffiliateState, AffiliateStats, AffiliatePayout, AffiliateReport } from '../../types/growth';

const initialState: AffiliateState = {
  stats: null,
  payouts: [],
  reports: [],
  loading: false,
  error: null,
};

const affiliateSlice = createSlice({
  name: 'affiliate',
  initialState,
  reducers: {
    fetchAffiliateStatsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchAffiliateStatsSuccess(state, action: PayloadAction<AffiliateStats>) {
      state.stats = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchAffiliateStatsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchPayoutsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchPayoutsSuccess(state, action: PayloadAction<AffiliatePayout[]>) {
      state.payouts = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchPayoutsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchReportsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchReportsSuccess(state, action: PayloadAction<AffiliateReport[]>) {
      state.reports = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchReportsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    requestPayoutStart(state) {
      state.loading = true;
      state.error = null;
    },
    requestPayoutSuccess(state, action: PayloadAction<AffiliatePayout>) {
      state.payouts.unshift(action.payload);
      state.loading = false;
      state.error = null;
    },
    requestPayoutFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    clearAffiliateError(state) {
      state.error = null;
    },
  },
});

export const {
  fetchAffiliateStatsStart,
  fetchAffiliateStatsSuccess,
  fetchAffiliateStatsFailure,
  fetchPayoutsStart,
  fetchPayoutsSuccess,
  fetchPayoutsFailure,
  fetchReportsStart,
  fetchReportsSuccess,
  fetchReportsFailure,
  requestPayoutStart,
  requestPayoutSuccess,
  requestPayoutFailure,
  clearAffiliateError,
} = affiliateSlice.actions;

export default affiliateSlice.reducer;
