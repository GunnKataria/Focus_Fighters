import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Listens to phone status updates for all members in a room.
 * Uses a Supabase Realtime channel + a polling fallback so the
 * desktop lobby/game screen always reflects the phone's current state.
 */
export function usePhoneStatusListener(roomId) {
  const [phoneStatusMap, setPhoneStatusMap] = useState({});
  const pollIntervalRef = useRef(null);

  // Merge a single member update into the status map
  const updateStatus = useCallback((userId, phoneLocked, switchCount) => {
    setPhoneStatusMap((prev) => {
      // Skip update if nothing changed (avoids unnecessary re-renders)
      const existing = prev[userId];
      if (
        existing &&
        existing.isLockedIn === phoneLocked &&
        existing.appSwitchCount === (switchCount || 0)
      ) {
        return prev;
      }
      return {
        ...prev,
        [userId]: {
          isLockedIn: phoneLocked,
          appSwitchCount: switchCount || 0,
        },
      };
    });
  }, []);

  // Fetch latest status for all room members
  const fetchStatus = useCallback(async (rid) => {
    if (!rid) return;
    const { data, error } = await supabase
      .from('ff_room_members')
      .select('user_id, phone_locked_in, phone_app_switch_count')
      .eq('room_id', rid);

    if (error) {
      console.warn('[PhoneListener] fetchStatus error:', error.message);
      return;
    }
    if (data) {
      setPhoneStatusMap((prev) => {
        const next = { ...prev };
        data.forEach((m) => {
          next[m.user_id] = {
            isLockedIn: m.phone_locked_in,
            appSwitchCount: m.phone_app_switch_count || 0,
          };
        });
        return next;
      });
    }
  }, []);

  useEffect(() => {
    if (!roomId) return;

    // 1. Initial fetch
    fetchStatus(roomId);

    // 2. Realtime subscription on ff_room_members
    //    (requires table to be in supabase_realtime publication — see SQL patch)
    const channel = supabase
      .channel(`phone-status-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ff_room_members',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new) {
            const { user_id, phone_locked_in, phone_app_switch_count } = payload.new;
            updateStatus(user_id, phone_locked_in, phone_app_switch_count);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Re-fetch on (re-)subscribe to catch any updates missed during connection
          fetchStatus(roomId);
        }
      });

    // 3. Polling fallback — every 3 s so we catch updates even if realtime
    //    postgres_changes isn't set up for this table in Supabase.
    pollIntervalRef.current = setInterval(() => fetchStatus(roomId), 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollIntervalRef.current);
    };
  }, [roomId, fetchStatus, updateStatus]);

  const getPhoneStatus = useCallback(
    (userId) => {
      return (
        phoneStatusMap[userId] ?? {
          isLockedIn: null, // null = no phone connected / data not yet loaded
          appSwitchCount: 0,
        }
      );
    },
    [phoneStatusMap]
  );

  return { phoneStatusMap, getPhoneStatus };
}
