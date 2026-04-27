import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BugReportState, BugReport } from '../../types/growth';

const initialState: BugReportState = {
  reports: [],
  totalRewards: 0,
  loading: false,
  error: null,
};

const bugReportSlice = createSlice({
  name: 'bugReport',
  initialState,
  reducers: {
    submitBugReportStart(state) {
      state.loading = true;
      state.error = null;
    },
    submitBugReportSuccess(state, action: PayloadAction<BugReport>) {
      state.reports.unshift(action.payload);
      if (action.payload.rewardAmount) {
        state.totalRewards += action.payload.rewardAmount;
      }
      state.loading = false;
      state.error = null;
    },
    submitBugReportFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchBugReportsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchBugReportsSuccess(state, action: PayloadAction<BugReport[]>) {
      state.reports = action.payload;
      state.totalRewards = action.payload.reduce(
        (sum, report) => sum + (report.rewardAmount || 0),
        0
      );
      state.loading = false;
      state.error = null;
    },
    fetchBugReportsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    clearBugReportError(state) {
      state.error = null;
    },
  },
});

export const {
  submitBugReportStart,
  submitBugReportSuccess,
  submitBugReportFailure,
  fetchBugReportsStart,
  fetchBugReportsSuccess,
  fetchBugReportsFailure,
  clearBugReportError,
} = bugReportSlice.actions;

export default bugReportSlice.reducer;
