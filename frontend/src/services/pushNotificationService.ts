/**
 * PushNotificationService.ts
 * 
 * Service for managing push notifications for trades.
 * Handles service worker registration, permission management,
 * subscription management, and notification display.
 */

export type PermissionState = 'granted' | 'denied' | 'default';

export interface PushNotificationConfig {
  vapidPublicKey?: string;
  serviceWorkerPath?: string;
  notificationTitle?: string;
  defaultIcon?: string;
  defaultBadge?: string;
}

export interface TradeNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
}

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private config: PushNotificationConfig;
  private onNotificationClick?: (action: string, data: any) => void;

  private constructor(config: PushNotificationConfig = {}) {
    this.config = {
      serviceWorkerPath: '/sw.js',
      notificationTitle: 'Luminary Trade',
      defaultIcon: '/favicon.ico',
      defaultBadge: '/favicon.ico',
      ...config,
    };
  }

  public static getInstance(config?: PushNotificationConfig): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService(config);
    }
    return PushNotificationService.instance;
  }

  /**
   * Check if push notifications are supported in the browser
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /**
   * Get current permission state
   */
  getPermissionState(): PermissionState {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission as PermissionState;
  }

  /**
   * Request permission for push notifications
   */
  async requestPermission(): Promise<PermissionState> {
    if (!this.isSupported()) {
      console.warn('[PushNotificationService] Push notifications not supported');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('[PushNotificationService] Permission:', permission);
      return permission as PermissionState;
    } catch (error) {
      console.error('[PushNotificationService] Error requesting permission:', error);
      return 'denied';
    }
  }

  /**
   * Register service worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      console.warn('[PushNotificationService] Service workers not supported');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register(this.config.serviceWorkerPath!);
      console.log('[PushNotificationService] Service worker registered');

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('[PushNotificationService] Service worker ready');

      return this.registration;
    } catch (error) {
      console.error('[PushNotificationService] Service worker registration failed:', error);
      return null;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.registerServiceWorker();
    }

    if (!this.registration) {
      console.error('[PushNotificationService] Cannot subscribe: service worker not registered');
      return null;
    }

    const permission = this.getPermissionState();
    if (permission !== 'granted') {
      const newPermission = await this.requestPermission();
      if (newPermission !== 'granted') {
        console.warn('[PushNotificationService] Permission denied');
        return null;
      }
    }

    try {
      const options: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
      };

      // Add VAPID public key if provided
      if (this.config.vapidPublicKey) {
        options.applicationServerKey = this.urlBase64ToUint8Array(this.config.vapidPublicKey) as BufferSource;
      }

      this.subscription = await this.registration.pushManager.subscribe(options);
      console.log('[PushNotificationService] Subscribed to push notifications');

      // Send subscription to backend
      await this.sendSubscriptionToBackend(this.subscription);

      return this.subscription;
    } catch (error) {
      console.error('[PushNotificationService] Subscription failed:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      console.warn('[PushNotificationService] Not currently subscribed');
      return false;
    }

    try {
      const result = await this.subscription.unsubscribe();
      console.log('[PushNotificationService] Unsubscribed:', result);
      
      if (result) {
        this.subscription = null;
        // Notify backend
        await this.removeSubscriptionFromBackend();
      }

      return result;
    } catch (error) {
      console.error('[PushNotificationService] Unsubscribe failed:', error);
      return false;
    }
  }

  /**
   * Get current subscription
   */
  getSubscription(): PushSubscription | null {
    return this.subscription;
  }

  /**
   * Check if currently subscribed
   */
  async isSubscribed(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      this.subscription = subscription;
      return !!subscription;
    } catch (error) {
      console.error('[PushNotificationService] Error checking subscription:', error);
      return false;
    }
  }

  /**
   * Show a local notification (without push)
   */
  async showNotification(options: TradeNotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      console.warn('[PushNotificationService] Notifications not supported');
      return;
    }

    const permission = this.getPermissionState();
    if (permission !== 'granted') {
      console.warn('[PushNotificationService] Permission not granted');
      return;
    }

    // Use service worker notification if available
    if (this.registration) {
      await this.registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || this.config.defaultIcon,
        badge: options.badge || this.config.defaultBadge,
        tag: options.tag || 'trade-notification',
        data: options.data || {},
        actions: options.actions || [],
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        timestamp: options.timestamp || Date.now(),
        renotify: true,
      } as NotificationOptions);
    } else {
      // Fallback to regular notification
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || this.config.defaultIcon,
        badge: options.badge || this.config.defaultBadge,
        tag: options.tag || 'trade-notification',
        data: options.data || {},
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        timestamp: options.timestamp || Date.now(),
      } as NotificationOptions);

      notification.onclick = (event) => {
        event.preventDefault();
        if (options.data?.url) {
          window.open(options.data.url, '_blank');
        }
        notification.close();
      };
    }
  }

  /**
   * Show trade executed notification
   */
  async showTradeExecutedNotification(
    tradeId: string,
    asset: string,
    type: 'buy' | 'sell',
    amount: number,
    price: number,
    total: number
  ): Promise<void> {
    const title = type === 'buy' ? 'Trade Executed - Buy' : 'Trade Executed - Sell';
    const body = `${type.toUpperCase()} ${amount} ${asset} @ ${price}\nTotal: ${total}`;

    await this.showNotification({
      title,
      body,
      tag: `trade-${tradeId}`,
      data: {
        tradeId,
        asset,
        type,
        amount,
        price,
        total,
        url: `/trades/${tradeId}`,
      },
      actions: [
        {
          action: 'view_trade',
          title: 'View Trade',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
      requireInteraction: false,
      silent: false,
    });
  }

  /**
   * Show trade status notification
   */
  async showTradeStatusNotification(
    tradeId: string,
    status: string,
    message?: string
  ): Promise<void> {
    const statusMessages: Record<string, string> = {
      pending: 'Trade is pending',
      processing: 'Trade is being processed',
      completed: 'Trade completed successfully',
      failed: 'Trade failed',
      cancelled: 'Trade was cancelled',
    };

    const title = `Trade ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    const body = message || statusMessages[status] || `Trade status: ${status}`;

    await this.showNotification({
      title,
      body,
      tag: `trade-status-${tradeId}`,
      data: {
        tradeId,
        status,
        url: `/trades/${tradeId}`,
      },
      actions: [
        {
          action: 'view_trade',
          title: 'View Details',
        },
      ],
      requireInteraction: status === 'failed',
      silent: status !== 'failed',
    });
  }

  /**
   * Set notification click handler
   */
  setNotificationClickHandler(handler: (action: string, data: any) => void): void {
    this.onNotificationClick = handler;
  }

  /**
   * Send subscription to backend
   */
  private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    try {
      const subscriptionData = subscription.toJSON() as unknown as PushSubscriptionData;
      
      // Send to your backend API
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscriptionData,
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        console.error('[PushNotificationService] Failed to save subscription to backend');
      }
    } catch (error) {
      console.error('[PushNotificationService] Error sending subscription to backend:', error);
    }
  }

  /**
   * Remove subscription from backend
   */
  private async removeSubscriptionFromBackend(): Promise<void> {
    try {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('[PushNotificationService] Error removing subscription from backend:', error);
    }
  }

  /**
   * Convert VAPID public key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  /**
   * Initialize the push notification service
   */
  async initialize(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('[PushNotificationService] Push notifications not supported in this browser');
      return false;
    }

    // Register service worker
    await this.registerServiceWorker();

    // Check if already subscribed
    const isSubscribed = await this.isSubscribed();
    if (isSubscribed) {
      console.log('[PushNotificationService] Already subscribed to push notifications');
      return true;
    }

    return false;
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
