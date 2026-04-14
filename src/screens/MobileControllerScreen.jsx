import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';
import { useVisibilityDetector } from '../hooks/useVisibilityDetector';
import Card from '../components/ui/Card';

export default function MobileControllerScreen() {
  const [sessionToken, setSessionToken] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [linkedUserId, setLinkedUserId] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [error, setError] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [syncSuccess, setSyncSuccess] = useState(false); // show confirmation on first successful sync

  const syncErrorCountRef = useRef(0);

  const { isFaceDown, permissionGranted, permissionError, isSupported, requestPermission } =
    useDeviceOrientation();
  const { isAppVisible, appSwitchCount } = useVisibilityDetector();

  // ── Parse URL params and look up the desktop user's ID ──────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('session');
    const room = params.get('roomId');

    if (!token || !room) {
      setError('Invalid session link. Please scan the QR code again.');
      setLoadingSession(false);
      return;
    }

    setSessionToken(token);
    setRoomId(room);

    // Look up the desktop user's ID via the session token.
    // ff_phone_sessions has an anon SELECT policy so this works without auth.
    supabase
      .from('ff_phone_sessions')
      .select('user_id, status')
      .eq('session_token', token)
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError || !data) {
          console.error('[PhoneCtrl] Could not find session:', fetchError?.message);
          setError(
            fetchError?.code === 'PGRST116'
              ? 'Session not found. Please re-scan the QR code from the lobby.'
              : `Session lookup failed: ${fetchError?.message ?? 'unknown error'}`
          );
          setLoadingSession(false);
          return;
        }

        if (data.status === 'expired') {
          setError('This session has expired. Please scan a new QR code from the lobby.');
          setLoadingSession(false);
          return;
        }

        setLinkedUserId(data.user_id);
        setLoadingSession(false);
      });
  }, []);

  // ── Sync phone status to database every 2 seconds ───────────────────────
  useEffect(() => {
    if (!sessionToken || !roomId || !linkedUserId) return;

    const syncPhoneStatus = async () => {
      try {
        const isLockedIn = isFaceDown && isAppVisible && permissionGranted;
        const now = new Date().toISOString();

        // 1. Update ff_phone_sessions — anon UPDATE policy allows this via session_token
        const { error: sessionErr } = await supabase
          .from('ff_phone_sessions')
          .update({
            phone_locked_in: isLockedIn,
            last_heartbeat: now,
            status: 'active',
          })
          .eq('session_token', sessionToken);

        if (sessionErr) {
          setSyncError(`Session sync error: ${sessionErr.message}`);
          syncErrorCountRef.current += 1;
          return;
        }

        // 2. Update ff_room_members — anon UPDATE policy ("Allow anonymous member updates") allows this.
        //    We match on BOTH user_id AND room_id so we only touch the right row.
        const { error: memberErr } = await supabase
          .from('ff_room_members')
          .update({
            phone_locked_in: isLockedIn,
            phone_app_switch_count: appSwitchCount,
            last_phone_update: now,
          })
          .eq('user_id', linkedUserId)
          .eq('room_id', roomId);

        if (memberErr) {
          setSyncError(`Member sync error: ${memberErr.message}`);
          syncErrorCountRef.current += 1;
        } else {
          // Clear errors on success
          if (syncError) setSyncError(null);
          syncErrorCountRef.current = 0;
          if (!syncSuccess) setSyncSuccess(true);
        }
      } catch (err) {
        setSyncError(`Unexpected error: ${err.message}`);
        syncErrorCountRef.current += 1;
      }
    };

    // Run once immediately, then poll
    syncPhoneStatus();
    const syncInterval = setInterval(syncPhoneStatus, 2000);
    return () => clearInterval(syncInterval);
  }, [sessionToken, roomId, linkedUserId, isFaceDown, isAppVisible, permissionGranted, appSwitchCount]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (loadingSession) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔗</div>
          <div style={{ color: 'var(--text-primary)' }}>Linking to desktop session...</div>
        </Card>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <Card style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--status-warning)', maxWidth: 360 }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <div style={{ color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: 1.5 }}>{error}</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Go back to the desktop lobby and scan the QR code again.
          </p>
        </Card>
      </div>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────
  const isLockedIn = isFaceDown && isAppVisible && permissionGranted;
  const statusColor = isLockedIn ? '#10b981' : '#ef4444';
  const statusText = isLockedIn ? 'LOCKED IN' : 'DISTRACTED';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: `linear-gradient(135deg, var(--bg-primary) 0%, rgba(139, 92, 246, 0.1) 100%)`,
        padding: '1rem',
      }}
    >
      <Card style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📱</div>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Phone Jail</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Focus Controller</p>
          {syncSuccess && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#10b981' }}>
              ✅ Connected to desktop session
            </div>
          )}
        </div>

        {/* Status Display */}
        <div
          style={{
            background: `rgba(${isLockedIn ? '16, 185, 129' : '239, 68, 68'}, 0.1)`,
            border: `2px solid ${statusColor}`,
            borderRadius: '12px',
            padding: '2rem 1rem',
            marginBottom: '2rem',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
            {isLockedIn ? '🔒' : '🔓'}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: statusColor, letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            {statusText}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            {isLockedIn
              ? 'You are focused — keep it up!'
              : 'Flip your phone face-down and stay in this app to lock in.'}
          </p>
        </div>

        {/* Permission Request */}
        {!permissionGranted && isSupported && (
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={requestPermission}
              style={{
                width: '100%', padding: '1rem',
                background: 'var(--accent-violet)', color: 'white',
                border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontSize: '1rem', fontWeight: 500,
              }}
            >
              Enable Motion Detection
            </button>
            {permissionError && (
              <p style={{ color: 'var(--status-warning)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {permissionError}
              </p>
            )}
          </div>
        )}

        {/* Status Indicators */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⬇️</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Phone Position</div>
            <div style={{ color: isFaceDown && permissionGranted ? '#10b981' : '#ef4444', fontSize: '0.9rem', fontWeight: 500 }}>
              {permissionGranted ? (isFaceDown ? 'Face Down ✓' : 'Not Down') : 'No Permission'}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👁️</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>App Visible</div>
            <div style={{ color: isAppVisible ? '#10b981' : '#ef4444', fontSize: '0.9rem', fontWeight: 500 }}>
              {isAppVisible ? 'Visible ✓' : 'Hidden'}
            </div>
          </div>
        </div>

        {/* App Switch Count */}
        {appSwitchCount > 0 && (
          <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: '#ef4444' }}>
            ⚠️ App switched {appSwitchCount} time{appSwitchCount !== 1 ? 's' : ''}
          </div>
        )}

        {/* Sync Error */}
        {syncError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '8px',
            padding: '0.75rem',
            color: '#ef4444',
            fontSize: '0.8rem',
            wordBreak: 'break-word',
            textAlign: 'left',
          }}>
            <strong>Sync Error:</strong> {syncError}
          </div>
        )}
      </Card>
    </div>
  );
}
