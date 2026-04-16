import React, { useState, useEffect, useRef } from 'react';
import { getNotifications, saveNotifications } from './storageHelpers';

export default function NotificationBell({ userId, isMobile }) {
  const [open, setOpen]  = useState(false);
  const [list, setList]  = useState([]);
  const ref = useRef(null);

  const load = () => setList(getNotifications().filter(n => n.userId === userId));

  useEffect(() => { load(); }, [userId]);

  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const unread = list.filter(n => !n.isRead).length;

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      const all = getNotifications();
      saveNotifications(all.map(n => n.userId === userId ? { ...n, isRead: true } : n));
      setList(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  const handleClear = () => {
    saveNotifications(getNotifications().filter(n => n.userId !== userId));
    setList([]);
  };

  const ICON = { grade: '📊', feedback: '💬', counseling: '📋' };
  const fmt  = iso => {
    const d = new Date(iso);
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={handleOpen} style={{
        position: 'relative', background: 'rgba(255,255,255,0.2)', border: 'none',
        borderRadius: 8, padding: '5px 9px', cursor: 'pointer', color: 'white', fontSize: 16, lineHeight: 1,
      }}>
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3, background: '#ef4444', color: 'white',
            borderRadius: '50%', minWidth: 17, height: 17, fontSize: 10, fontWeight: 'bold',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: isMobile ? 'fixed' : 'absolute',
          top: isMobile ? 56 : 'calc(100% + 8px)',
          right: isMobile ? 8 : 0,
          left: isMobile ? 8 : 'auto',
          width: isMobile ? 'auto' : 330,
          maxHeight: 380, overflowY: 'auto',
          background: 'white', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,.18)',
          border: '1px solid #e5e7eb', zIndex: 1000,
        }}>
          <div style={{ padding: '11px 14px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', color: '#1f2937', fontSize: 14 }}>알림</span>
            {list.length > 0 && (
              <button onClick={handleClear} style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>전체 삭제</button>
            )}
          </div>
          {list.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>알림이 없습니다.</div>
          ) : list.slice(0, 30).map(n => (
            <div key={n.id} style={{ padding: '11px 14px', borderBottom: '1px solid #f9fafb', background: n.isRead ? 'white' : '#eff6ff' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 17, flexShrink: 0 }}>{ICON[n.type] || '📢'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: n.isRead ? 'normal' : 'bold', color: '#1f2937' }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{fmt(n.date)}</div>
                </div>
                {!n.isRead && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', flexShrink: 0, marginTop: 4 }} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
