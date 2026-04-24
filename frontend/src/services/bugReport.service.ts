import { apiClient } from './api/ApiClient';
import { BugReport, BugPriority } from '../types/growth';

export interface SubmitBugReportRequest {
  title: string;
  description: string;
  priority: BugPriority;
  screenshots?: string[];
  browserInfo?: string;
  osInfo?: string;
}

export const bugReportService = {
  async submitBugReport(request: SubmitBugReportRequest): Promise<BugReport> {
    const response = await apiClient.post<BugReport>('/bug-reports', request);
    return response.data;
  },

  async getBugReports(page = 1, limit = 20): Promise<{ reports: BugReport[]; total: number }> {
    const response = await apiClient.get<{ reports: BugReport[]; total: number }>(
      `/bug-reports?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  async getBugReport(id: string): Promise<BugReport> {
    const response = await apiClient.get<BugReport>(`/bug-reports/${id}`);
    return response.data;
  },

  async uploadScreenshot(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('screenshot', file);
    
    const response = await apiClient.post<{ url: string }>('/bug-reports/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.url;
  },

  async getTotalRewards(): Promise<{ totalRewards: number }> {
    const response = await apiClient.get<{ totalRewards: number }>('/bug-reports/rewards');
    return response.data;
  },
};
