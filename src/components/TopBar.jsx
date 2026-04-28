import React from 'react';
import NotificationBell from './NotificationBell';

export default function TopBar({ user, onLogout, isMobile }) {
  const roleLabel = { teacher: '교사', student: '학생', parent: '학부모' }[user.role];
  return (
    <div style={{ background: '#1a1d27', color: '#dde0f0', padding: isMobile ? '12px 16px' : '14px 20px', marginBottom: 20, borderBottom: '1px solid #2d3148' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 'bold', fontSize: isMobile ? 13 : 17, color: '#dde0f0' }}>
          {isMobile ? '학생 관리 시스템' : '학생 성적 및 상담 관리 시스템'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NotificationBell userId={user.id} isMobile={isMobile} />
          <button onClick={onLogout} style={{
            padding: '6px 12px', background: '#252836', color: '#b0b4cc',
            border: '1px solid #363a52', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 12,
          }}>로그아웃</button>
        </div>
      </div>
    </div>
  );
}
