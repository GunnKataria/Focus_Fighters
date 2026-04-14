import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { generateSessionToken, generateQRCode, generateDeviceId } from '../lib/phoneSessionUtils';

/**
 * Custom hook to manage Phone Jail session creation and QR code generation.
 * NOTE: This hook is kept for backward compatibility but PhoneJailQRCode
 * component handles its own session creation directly. If you use this hook,
 * make sure not to also render PhoneJailQRCode for the same user+room to
 * avoid duplicate sessions.
 */
export function usePhoneJailSession(roomId) {
  const { user } = useAuth();
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionCreated, setSessionCreated] = useState(false);

  const createPhoneSession = async () => {
    if (!roomId || !user || sessionCreated) return;

    setLoading(true);
    setError(null);

    try {
      const token = generateSessionToken();
      const deviceId = generateDeviceId();

      // Build the full web URL that the phone will open
      const fullWebUrl = `${window.location.origin}/phone-controller?session=${token}&roomId=${roomId}`;

      // FIX: generateQRCode expects a single fullUrl argument, not (token, roomId)
      const qrUrl = await generateQRCode(fullWebUrl);
      setQrCodeUrl(qrUrl);
      setSessionToken(token);

      // FIX: Use upsert to avoid duplicate-key errors if session already exists
      const { error: upsertError } = await supabase
        .from('ff_phone_sessions')
        .upsert({
          room_id: roomId,
          user_id: user.id,
          session_token: token,
          device_id: deviceId,
          qr_code_data: fullWebUrl,
          status: 'active',
        }, { onConflict: 'room_id,user_id' });

      if (upsertError) {
        console.error('[PhoneJail] Error upserting phone session:', upsertError);
        setError('Failed to create phone session');
      } else {
        setSessionCreated(true);
      }

      setLoading(false);
    } catch (err) {
      console.error('[PhoneJail] Error creating phone session:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roomId && user && !sessionCreated && !qrCodeUrl) {
      createPhoneSession();
    }
  }, [roomId, user]);

  const generateControllerUrl = () => {
    if (!sessionToken || !roomId) return '';
    return `${window.location.origin}/phone-controller?session=${sessionToken}&roomId=${roomId}`;
  };

  return {
    qrCodeUrl,
    sessionToken,
    controllerUrl: generateControllerUrl(),
    loading,
    error,
    sessionCreated,
  };
}
