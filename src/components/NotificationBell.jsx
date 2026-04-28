import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function NotificationBell({ userId, isMobile }) {
  const [open, setOpen]  = useState(false);
  const [list, setList]  = useState([]);
  const ref = useRef(null);

  const load = () => api.getNotifications().then(setList).catch(() => {});

  useEffect(() => { load(); }, [userId]);

  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const unread = list.filter(n => !n.isRead).length;

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await api.markAllRead().catch(() => {});
      setList(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  const fmt = iso => {
    const d = new Date(iso);
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const ICON = { grade: '성적', feedback: '피드백', counseling: '상담' };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={handleOpen} style={{
        position: 'relative', background: 'rgba(124,106,240,0.2)', border: '1px solid rgba(124,106,240,0.3)',
        borderRadius: 8, padding: '5px 9px', cursor: 'pointer', color: '#a89bf7', fontSize: 16, lineHeight: 1,
      }}>
        알림
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
          background: '#1a1d27', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,.5)',
          border: '1px solid #2d3148', zIndex: 1000,
        }}>
          <div style={{ padding: '11px 14px', borderBottom: '1px solid #2d3148', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', color: '#dde0f0', fontSize: 14 }}>알림</span>
          </div>
          {list.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#8b8fa8', fontSize: 13 }}>알림이 없습니다.</div>
          ) : list.slice(0, 30).map(n => (
            <div key={n.id} style={{ padding: '11px 14px', borderBottom: '1px solid #2d3148', background: n.isRead ? '#1a1d27' : '#1e1b3a' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: 11, flexShrink: 0, background: '#252836', color: '#a89bf7',
                  borderRadius: 4, padding: '2px 6px', fontWeight: 'bold', whiteSpace: 'nowrap', marginTop: 1,
                  border: '1px solid #4a3f8a',
                }}>{ICON[n.type] || '알림'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: n.isRead ? 'normal' : 'bold', color: '#dde0f0' }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: '#8b8fa8', marginTop: 2 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: '#8b8fa8', marginTop: 3 }}>{fmt(n.date)}</div>
                </div>
                {!n.isRead && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c6af0', flexShrink: 0, marginTop: 4 }} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
