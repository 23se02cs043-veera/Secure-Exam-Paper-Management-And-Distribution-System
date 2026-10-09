import React, { useState, useEffect } from 'react';
import { usersAPI } from '../../api/users';
import { toast } from 'react-toastify';
import { FaTimes, FaCheck, FaTrash, FaInbox } from 'react-icons/fa';

function NotificationDrawer({ isOpen, onClose, onUpdateCount }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const res = await usersAPI.getNotifications();
      setNotifications(res.data.notifications);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [isOpen]);

  const handleMarkRead = async (id) => {
    try {
      await usersAPI.markRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      onUpdateCount();
    } catch {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await usersAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      onUpdateCount();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to update notifications');
    }
  };

  const handleDelete = async (id) => {
    try {
      await usersAPI.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      onUpdateCount();
      toast.success('Notification deleted');
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '380px',
        maxWidth: '100%',
        height: '100vh',
        background: 'var(--color-bg-light)',
        boxShadow: 'var(--shadow-2xl)',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--color-border)',
        animation: 'slide-in-right 0.3s ease',
      }}
    >
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--gradient-primary)',
          color: 'white',
        }}
      >
        <h4 style={{ margin: 0, color: 'white', fontSize: '18px' }}>Notifications</h4>
        <div className="flex gap-2">
          {notifications.some(n => !n.is_read) && (
            <button
              className="btn btn-sm btn-outline-light"
              onClick={handleMarkAllRead}
              title="Mark all as read"
            >
              <FaCheck />
            </button>
          )}
          <button
            className="btn btn-sm btn-icon btn-outline-light"
            onClick={onClose}
          >
            <FaTimes />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
        {loading ? (
          <div className="text-center p-4">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <FaInbox className="empty-state-icon" />
            <h3>No notifications</h3>
            <p>You're all caught up!</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              style={{
                padding: '12px 15px',
                borderRadius: '8px',
                background: notif.is_read
                  ? 'var(--color-bg-secondary)'
                  : 'var(--color-bg-tertiary)',
                marginBottom: '10px',
                borderLeft: `4px solid ${
                  notif.type === 'security'
                    ? 'var(--color-danger)'
                    : notif.type === 'paper_released'
                    ? 'var(--color-success)'
                    : 'var(--color-secondary)'
                }`,
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                position: 'relative',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  className="font-bold"
                  style={{
                    fontSize: '13px',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {notif.title}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    marginTop: '4px',
                  }}
                >
                  {notif.message}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--color-text-tertiary)',
                    marginTop: '8px',
                  }}
                >
                  {new Date(notif.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {!notif.is_read && (
                  <button
                    className="btn btn-sm btn-icon"
                    onClick={() => handleMarkRead(notif.id)}
                    style={{ padding: '4px', fontSize: '10px', background: 'transparent' }}
                    title="Mark read"
                  >
                    <FaCheck className="text-success" />
                  </button>
                )}
                <button
                  className="btn btn-sm btn-icon"
                  onClick={() => handleDelete(notif.id)}
                  style={{ padding: '4px', fontSize: '10px', background: 'transparent' }}
                  title="Delete"
                >
                  <FaTrash className="text-danger" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NotificationDrawer;
