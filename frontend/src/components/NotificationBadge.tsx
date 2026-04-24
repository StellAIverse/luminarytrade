import React from 'react';
import { useAppSelector } from '../store/hooks';

interface NotificationBadgeProps {
  showCount?: boolean;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ showCount = true }) => {
  const { unreadCount } = useAppSelector((state) => state.notification);

  if (unreadCount === 0) {
    return null;
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: showCount ? '20px' : '8px',
        height: '20px',
        padding: showCount ? '0 6px' : '0',
        borderRadius: '10px',
        background: '#ef4444',
        color: '#fff',
        fontSize: '11px',
        fontWeight: 700,
        position: 'absolute',
        top: '-8px',
        right: '-8px',
        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
      }}
    >
      {showCount ? (unreadCount > 99 ? '99+' : unreadCount) : ''}
    </span>
  );
};

export default NotificationBadge;
