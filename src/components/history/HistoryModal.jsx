import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Modal from '../ui/Modal';
import Btn from '../ui/Btn';
import { formatTime } from '../../utils/formatTime';

export default function HistoryModal({ open, onClose }) {
  const { history, profile, fetchHistory } = useAuth();
  const [tab, setTab] = useState('recent');

  const recent = history?.slice(0, 10) || [];
  const victories = history?.filter(h => h.victory).slice(0, 10) || [];

  const stats = {
    total: history?.length || 0,
    victories: history?.filter(h => h.victory).length || 0,
    avgDuration: history?.reduce((sum, h) => sum + h.actual_seconds, 0) / (history?.length || 1) / 60 || 0,
    bestSquad: Math.max(...history?.map(h => h.squad_size) || [1]),
  };

  const renderSession = (session) => (
    <div style={{ 
      padding: '.75rem', 
      border: '1px solid var(--border)', 
      borderRadius: 8, 
      background: 'var(--bg-elevated)',
      marginBottom: '.5rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.25rem' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '.85rem' }}>{session.room_name}</span>
        <span style={{ fontSize: '.75rem', color: session.victory ? 'var(--accent-green)' : 'var(--accent-red)' }}>
          {session.victory ? '🏆 Victory' : '⚔️ Defeat'}
        </span>
      </div>
      <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        <span>⏱️ {Math.floor(session.actual_seconds / 60)}m</span>
        <span>👥 {session.squad_size} squad</span>
        <span>⚡ {session.xp_reward} XP</span>
        <span>🪙 {session.coins_reward} coins</span>
      </div>
      {session.objectives_cleared?.length > 0 && (
        <div style={{ fontSize: '.7rem', color: 'var(--accent-violet)', mt: '.25rem' }}>
          ✅ {session.objectives_cleared.slice(0, 2).join(', ')}{session.objectives_cleared.length > 2 ? '...' : ''}
        </div>
      )}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} maxWidth={500}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '1rem' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', m: 0 }}>📜 Battle History</h3>
        <Btn variant="ghost" size="sm" onClick={onClose}>✕</Btn>
      </div>

      <div style={{ display: 'flex', gap: '.25rem', mb: '1rem', background: 'var(--bg-elevated)', borderRadius: 6, padding: '.25rem' }}>
        <button onClick={() => setTab('recent')} style={{ 
          padding: '.4rem .8rem', 
          borderRadius: 4, 
          background: tab === 'recent' ? 'var(--accent-violet)' : 'transparent',
          color: tab === 'recent' ? 'white' : 'var(--text-secondary)',
          border: 'none', 
          fontSize: '.75rem', 
          fontFamily: 'var(--font-heading)'
        }}>
          Recent
        </button>
        <button onClick={() => setTab('victories')} style={{ 
          padding: '.4rem .8rem', 
          borderRadius: 4, 
          background: tab === 'victories' ? 'var(--accent-gold)' : 'transparent',
          color: tab === 'victories' ? 'var(--bg-primary)' : 'var(--text-secondary)',
          border: 'none', 
          fontSize: '.75rem', 
          fontFamily: 'var(--font-heading)'
        }}>
          Victories
        </button>
      </div>

      <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', mb: '1rem' }}>
        Total Battles: <strong>{stats.total}</strong> | Victories: <strong>{stats.victories}</strong> | 
        Avg Duration: <strong>{stats.avgDuration.toFixed(1)}m</strong> | Largest Squad: <strong>{stats.bestSquad}</strong>
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {tab === 'recent' ? recent.map(renderSession) : victories.map(renderSession)}
        {(!recent.length && !victories.length) && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem', py: '2rem' }}>
            No battles yet. Complete your first raid to see history! ⚔️
          </div>
        )}
      </div>
    </Modal>
  );
}
