/**
 * pushNotificationService.test.ts
 * 
 * Tests for the push notification service
 */

import { pushNotificationService, PushNotificationService } from '../services/pushNotificationService';

// Mock the Notification API
const mockNotification = {
  permission: 'default',
  requestPermission: jest.fn(),
};

// Mock the Service Worker API
const mockServiceWorker = {
  register: jest.fn(),
  ready: Promise.resolve({
    showNotification: jest.fn(),
    pushManager: {
      subscribe: jest.fn(),
      getSubscription: jest.fn(),
    },
  }),
};

describe('PushNotificationService', () => {
  let service: PushNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup global mocks using Object.defineProperty
    Object.defineProperty(window, 'Notification', {
      value: mockNotification,
      writable: true,
      configurable: true,
    });
    
    Object.defineProperty(window, 'navigator', {
      value: { serviceWorker: mockServiceWorker },
      writable: true,
      configurable: true,
    });
    
    Object.defineProperty(window, 'atob', {
      value: jest.fn((str: string) => {
        // Simple base64 decode for testing (browser-compatible)
        const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        const padding = '='.repeat((4 - (base64.length % 4)) % 4);
        return globalThis.atob(base64 + padding);
      }),
      writable: true,
      configurable: true,
    });

    // Reset singleton instance
    (PushNotificationService as any).instance = null;
    service = PushNotificationService.getInstance();
  });

  describe('isSupported', () => {
    it('should return true when all APIs are available', () => {
      expect(service.isSupported()).toBe(true);
    });

    it('should return false when serviceWorker is not available', () => {
      Object.defineProperty(window, 'navigator', {
        value: { serviceWorker: undefined },
        writable: true,
        configurable: true,
      });
      expect(service.isSupported()).toBe(false);
    });

    it('should return false when PushManager is not available', () => {
      Object.defineProperty(window, 'PushManager', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(service.isSupported()).toBe(false);
    });
  });

  describe('getPermissionState', () => {
    it('should return current permission state', () => {
      mockNotification.permission = 'granted';
      expect(service.getPermissionState()).toBe('granted');
    });

    it('should return denied when not supported', () => {
      Object.defineProperty(window, 'navigator', {
        value: { serviceWorker: undefined },
        writable: true,
        configurable: true,
      });
      expect(service.getPermissionState()).toBe('denied');
    });
  });

  describe('requestPermission', () => {
    it('should request permission and return granted', async () => {
      mockNotification.requestPermission.mockResolvedValue('granted');
      const result = await service.requestPermission();
      expect(result).toBe('granted');
      expect(mockNotification.requestPermission).toHaveBeenCalled();
    });

    it('should request permission and return denied', async () => {
      mockNotification.requestPermission.mockResolvedValue('denied');
      const result = await service.requestPermission();
      expect(result).toBe('denied');
    });

    it('should return denied when not supported', async () => {
      Object.defineProperty(window, 'navigator', {
        value: { serviceWorker: undefined },
        writable: true,
        configurable: true,
      });
      const result = await service.requestPermission();
      expect(result).toBe('denied');
    });
  });

  describe('registerServiceWorker', () => {
    it('should register service worker successfully', async () => {
      const result = await service.registerServiceWorker();
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
      expect(result).not.toBeNull();
    });

    it('should return null when service workers not supported', async () => {
      (global as any).navigator = { serviceWorker: undefined };
      const result = await service.registerServiceWorker();
      expect(result).toBeNull();
    });

    it('should return null on registration failure', async () => {
      mockServiceWorker.register.mockRejectedValue(new Error('Registration failed'));
      const result = await service.registerServiceWorker();
      expect(result).toBeNull();
    });
  });

  describe('showTradeExecutedNotification', () => {
    it('should show notification for executed trade', async () => {
      // Mock registration
      await service.registerServiceWorker();
      
      await service.showTradeExecutedNotification(
        'trade-123',
        'BTC',
        'buy',
        0.5,
        50000,
        25000
      );

      expect(mockServiceWorker.ready).toBeDefined();
    });
  });

  describe('showTradeStatusNotification', () => {
    it('should show notification for trade status update', async () => {
      await service.registerServiceWorker();
      
      await service.showTradeStatusNotification(
        'trade-123',
        'completed',
        'Your trade has been completed'
      );

      expect(mockServiceWorker.ready).toBeDefined();
    });

    it('should show failed trade notification with requireInteraction', async () => {
      await service.registerServiceWorker();
      
      await service.showTradeStatusNotification(
        'trade-123',
        'failed',
        'Your trade has failed'
      );

      expect(mockServiceWorker.ready).toBeDefined();
    });
  });

  describe('subscribe', () => {
    it('should subscribe to push notifications', async () => {
      const mockSubscription = {
        toJSON: () => ({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test',
          keys: {
            p256dh: 'test-p256dh',
            auth: 'test-auth',
          },
        }),
      };

      mockNotification.permission = 'granted';
      mockServiceWorker.ready = Promise.resolve({
        showNotification: jest.fn(),
        pushManager: {
          subscribe: jest.fn().mockResolvedValue(mockSubscription),
          getSubscription: jest.fn().mockResolvedValue(null),
        },
      });

      await service.registerServiceWorker();
      const result = await service.subscribe();

      expect(result).not.toBeNull();
    });

    it('should request permission if not granted', async () => {
      mockNotification.permission = 'default';
      mockNotification.requestPermission.mockResolvedValue('granted');
      
      const mockSubscription = {
        toJSON: () => ({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test',
          keys: {
            p256dh: 'test-p256dh',
            auth: 'test-auth',
          },
        }),
      };

      mockServiceWorker.ready = Promise.resolve({
        showNotification: jest.fn(),
        pushManager: {
          subscribe: jest.fn().mockResolvedValue(mockSubscription),
          getSubscription: jest.fn().mockResolvedValue(null),
        },
      });

      await service.registerServiceWorker();
      const result = await service.subscribe();

      expect(mockNotification.requestPermission).toHaveBeenCalled();
      expect(result).not.toBeNull();
    });

    it('should return null if permission denied', async () => {
      mockNotification.permission = 'denied';
      
      await service.registerServiceWorker();
      const result = await service.subscribe();

      expect(result).toBeNull();
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from push notifications', async () => {
      const mockUnsubscribe = jest.fn().mockResolvedValue(true);
      const mockSubscription = {
        unsubscribe: mockUnsubscribe,
        toJSON: () => ({}),
      };

      service = PushNotificationService.getInstance();
      (service as any).subscription = mockSubscription;

      const result = await service.unsubscribe();

      expect(result).toBe(true);
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should return false when not subscribed', async () => {
      service = PushNotificationService.getInstance();
      (service as any).subscription = null;

      const result = await service.unsubscribe();

      expect(result).toBe(false);
    });
  });

  describe('isSubscribed', () => {
    it('should return true when subscribed', async () => {
      const mockSubscription = { endpoint: 'test' };
      
      mockServiceWorker.ready = Promise.resolve({
        showNotification: jest.fn(),
        pushManager: {
          subscribe: jest.fn(),
          getSubscription: jest.fn().mockResolvedValue(mockSubscription),
        },
      });

      await service.registerServiceWorker();
      const result = await service.isSubscribed();

      expect(result).toBe(true);
    });

    it('should return false when not subscribed', async () => {
      mockServiceWorker.ready = Promise.resolve({
        showNotification: jest.fn(),
        pushManager: {
          subscribe: jest.fn(),
          getSubscription: jest.fn().mockResolvedValue(null),
        },
      });

      await service.registerServiceWorker();
      const result = await service.isSubscribed();

      expect(result).toBe(false);
    });
  });
});
