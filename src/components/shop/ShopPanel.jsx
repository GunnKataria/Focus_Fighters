import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SHOP_ITEMS } from '../../constants';
import Btn from '../ui/Btn';
import { supabase } from '../../lib/supabase';
export default function ShopPanel({ onBuyItem }) {
  const { profile, inventory, fetchInventory } = useAuth();
  const [loading, setLoading] = useState({});

  useEffect(() => {
    if (profile) fetchInventory(profile.id);
  }, [profile, fetchInventory]);

  const buyItem = async (item) => {
  if (!profile || profile.is_guest || profile.coins < item.price) return;

  setLoading(prev => ({ ...prev, [item.id]: true }));

  try {
    const { data, error } = await supabase.rpc('buy_item', {
      p_user_id: profile.id,
      p_item_id: item.id
    });

    if (error) throw error;

    fetchInventory(profile.id);
    onBuyItem && onBuyItem(item);

  } catch (err) {
    console.error('Buy error:', err);
  } finally {
    setLoading(prev => ({ ...prev, [item.id]: false }));
  }
};
 const ownedCount = (itemId) => 
  inventory
    .filter(i => i.item_id === itemId)
    .reduce((sum, i) => sum + i.quantity, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', margin: 0 }}>🛒 Focus Fighters Shop</h3>
      <div style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
        Coins: <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{profile?.coins || 0} 🪙</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', maxHeight: 300, overflowY: 'auto' }}>
        {SHOP_ITEMS.map(item => (
          <div key={item.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '.75rem',
            padding: '.75rem',
            background: 'var(--bg-elevated)',
            borderRadius: 8,
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: '1.8rem' }}>{item.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '.85rem', marginBottom: '.2rem' }}>
                {item.name}
              </div>
              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                {item.description}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                {ownedCount(item.id)} owned
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', color: 'var(--accent-gold)', fontSize: '.9rem', fontWeight: 600 }}>
                {item.price} 🪙
              </div>
              <Btn 
                variant="gold" 
                size="sm"
                disabled={loading[item.id] || profile?.coins < item.price}
                onClick={() => buyItem(item)}
                style={{ padding: '.4rem .8rem', fontSize: '.75rem' }}
              >
                {loading[item.id] ? '...' : 'Buy'}
              </Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
