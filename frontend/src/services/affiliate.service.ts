import { apiClient } from './api/ApiClient';
import { AffiliateStats, AffiliatePayout, AffiliateReport } from '../types/growth';

export interface PayoutRequest {
  amount: number;
  method: string;
}

export const affiliateService = {
  async getStats(): Promise<AffiliateStats> {
    const response = await apiClient.get<AffiliateStats>('/affiliate/stats');
    return response.data;
  },

  async getPayouts(page = 1, limit = 20): Promise<{ payouts: AffiliatePayout[]; total: number }> {
    const response = await apiClient.get<{ payouts: AffiliatePayout[]; total: number }>(
      `/affiliate/payouts?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  async requestPayout(request: PayoutRequest): Promise<AffiliatePayout> {
    const response = await apiClient.post<AffiliatePayout>('/affiliate/payouts', request);
    return response.data;
  },

  async getReports(startDate?: string, endDate?: string): Promise<AffiliateReport[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await apiClient.get<AffiliateReport[]>(
      `/affiliate/reports?${params.toString()}`
    );
    return response.data;
  },

  async getReferralLink(): Promise<{ referralLink: string }> {
    const response = await apiClient.get<{ referralLink: string }>('/affiliate/link');
    return response.data;
  },
};
