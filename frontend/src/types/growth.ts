// Referral types
export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  conversionRate: number;
  referralCode: string;
  referralLink: string;
}

export interface ReferralEntry {
  id: string;
  email: string;
  joinedAt: string;
  status: 'active' | 'pending' | 'converted';
  earnings: number;
}

export interface ReferralState {
  stats: ReferralStats | null;
  referrals: ReferralEntry[];
  loading: boolean;
  error: string | null;
}

// Affiliate types
export interface AffiliateStats {
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  conversionRate: number;
  partnerTier: 'Starter' | 'Growth' | 'Scale' | 'Gold';
  totalClicks: number;
  totalSignups: number;
}

export interface AffiliatePayout {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'rejected';
  method: string;
  requestedAt: string;
  processedAt?: string;
}

export interface AffiliateReport {
  date: string;
  clicks: number;
  signups: number;
  conversions: number;
  commission: number;
}

export interface AffiliateState {
  stats: AffiliateStats | null;
  payouts: AffiliatePayout[];
  reports: AffiliateReport[];
  loading: boolean;
  error: string | null;
}

// Bug Report types
export type BugPriority = 'low' | 'medium' | 'high' | 'critical';
export type BugStatus = 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'resolved';

export interface BugReport {
  id: string;
  title: string;
  description: string;
  priority: BugPriority;
  status: BugStatus;
  screenshots: string[];
  submittedAt: string;
  rewardAmount?: number;
  rewardStatus?: 'pending' | 'approved' | 'paid';
}

export interface BugReportState {
  reports: BugReport[];
  totalRewards: number;
  loading: boolean;
  error: string | null;
}

// Notification types
export type NotificationType = 'waitlist' | 'referral' | 'affiliate' | 'bug_report' | 'system';
export type NotificationChannel = 'push' | 'email' | 'both';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  read: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  referralNotifications: boolean;
  affiliateNotifications: boolean;
  waitlistNotifications: boolean;
  bugReportNotifications: boolean;
}

export interface NotificationState {
  notifications: Notification[];
  preferences: NotificationPreferences;
  unreadCount: number;
  loading: boolean;
  error: string | null;
}
