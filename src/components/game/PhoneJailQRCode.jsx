import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { generateSessionToken, generateQRCode, generateDeviceId } from '../../lib/phoneSessionUtils';
import Card from '../ui/Card';

export default function PhoneJailQRCode({ roomId, onError }) {
  const { profile } = useAuth();
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!roomId || !profile) {
      setLoading(false);
      return;
    }

    const initializePhoneSession = async () => {
      try {
        const token = generateSessionToken();
        const deviceId = generateDeviceId();

        // 1. Build the full web URL that the phone will open when it scans the QR
        const fullWebUrl = `${window.location.origin}/phone-controller?session=${token}&roomId=${roomId}`;

        // 2. Generate QR code from the full URL (generateQRCode takes a single URL arg)
        const qrUrl = await generateQRCode(fullWebUrl);
        setQrCodeUrl(qrUrl);
        setSessionToken(token);

        // 3. Store in database — upsert so re-opening the lobby doesn't break on
        //    the unique constraint (room_id, user_id). A new token is written each time.
        const { error: upsertError } = await supabase
          .from('ff_phone_sessions')
          .upsert({
            room_id: roomId,
            user_id: profile.id,
            session_token: token,
            device_id: deviceId,
            qr_code_data: fullWebUrl,
            status: 'active',
            last_heartbeat: new Date().toISOString(),
          }, { onConflict: 'room_id,user_id' });

        if (upsertError) {
          console.error('[PhoneJail] Error upserting phone session:', upsertError);
          setError('Failed to generate phone session');
          onError?.('Failed to generate phone session');
        }

        setLoading(false);
      } catch (err) {
        console.error('[PhoneJail] Error initializing phone session:', err);
        setError('Failed to generate QR code');
        onError?.(err.message);
        setLoading(false);
      }
    };

    initializePhoneSession();
  }, [roomId, profile]);

  const generateControllerUrl = () => {
    if (!sessionToken || !roomId) return '';
    return `${window.location.origin}/phone-controller?session=${sessionToken}&roomId=${roomId}`;
  };

  const copyToClipboard = () => {
    const url = generateControllerUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Card style={{ padding: '2rem', textAlign: 'center', background: 'rgba(124,92,224,0.05)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Generating phone controller...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--status-warning)' }}>
        <div style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Error: {error}</div>
      </Card>
    );
  }

  return (
    <Card style={{ padding: '1.5rem', background: 'rgba(124,92,224,0.05)', textAlign: 'center' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 500 }}>
          📱 PHONE JAIL CONTROLLER
        </div>
        <div style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>🔗</div>
      </div>

      {qrCodeUrl && (
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              padding: '0.75rem',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <img
              src={qrCodeUrl}
              alt="Phone Jail QR Code"
              style={{ width: '180px', height: '180px', display: 'block', borderRadius: '8px' }}
            />
          </div>
        </div>
      )}

      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        Scan with your phone to enable focus detection
      </div>

      {sessionToken && (
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '0.75rem',
            marginTop: '1rem',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Or copy this link:
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            <code
              style={{
                flex: 1,
                fontSize: '0.65rem',
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'monospace',
              }}
            >
              {generateControllerUrl()}
            </code>
            <button
              onClick={copyToClipboard}
              style={{
                background: 'var(--accent-violet)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '0.3rem 0.6rem',
                cursor: 'pointer',
                fontSize: '0.7rem',
                whiteSpace: 'nowrap',
              }}
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
        </div>
      )}

      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
        Session expires in 1 hour
      </div>
    </Card>
  );
}
