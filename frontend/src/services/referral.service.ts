import { apiClient } from './api/ApiClient';
import { ReferralStats, ReferralEntry } from '../types/growth';

export interface GenerateReferralCodeResponse {
  referralCode: string;
  referralLink: string;
}

export const referralService = {
  async getStats(): Promise<ReferralStats> {
    const response = await apiClient.get<ReferralStats>('/referral/stats');
    return response.data;
  },

  async getReferrals(page = 1, limit = 20): Promise<{ referrals: ReferralEntry[]; total: number }> {
    const response = await apiClient.get<{ referrals: ReferralEntry[]; total: number }>(
      `/referral/referrals?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  async generateCode(): Promise<GenerateReferralCodeResponse> {
    const response = await apiClient.post<GenerateReferralCodeResponse>('/referral/generate');
    return response.data;
  },

  async trackClick(referralCode: string): Promise<void> {
    await apiClient.post('/referral/track/click', { referralCode });
  },

  async trackSignup(referralCode: string): Promise<void> {
    await apiClient.post('/referral/track/signup', { referralCode });
  },
};
