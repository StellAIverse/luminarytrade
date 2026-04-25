import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ReferralState, ReferralStats, ReferralEntry } from '../../types/growth';

const initialState: ReferralState = {
  stats: null,
  referrals: [],
  loading: false,
  error: null,
};

const referralSlice = createSlice({
  name: 'referral',
  initialState,
  reducers: {
    fetchReferralStatsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchReferralStatsSuccess(state, action: PayloadAction<ReferralStats>) {
      state.stats = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchReferralStatsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchReferralsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchReferralsSuccess(state, action: PayloadAction<ReferralEntry[]>) {
      state.referrals = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchReferralsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    generateReferralCode(state, action: PayloadAction<string>) {
      if (state.stats) {
        state.stats.referralCode = action.payload;
        state.stats.referralLink = `https://luminarytrade.app/join?ref=${action.payload}`;
      }
    },
    clearReferralError(state) {
      state.error = null;
    },
  },
});

export const {
  fetchReferralStatsStart,
  fetchReferralStatsSuccess,
  fetchReferralStatsFailure,
  fetchReferralsStart,
  fetchReferralsSuccess,
  fetchReferralsFailure,
  generateReferralCode,
  clearReferralError,
} = referralSlice.actions;

export default referralSlice.reducer;
