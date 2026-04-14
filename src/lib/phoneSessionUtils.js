import QRCode from 'qrcode';

/**
 * Generate a unique session token for phone-web linking
 */
export function generateSessionToken() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique device ID for the phone
 */
export function generateDeviceId() {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substr(2, 9);
  const userAgent = navigator.userAgent.substring(0, 20);
  return `${timestamp}-${randomStr}-${userAgent}`;
}

/**
 * Generate QR code data URL for phone linking
 * Now accepts a full web URL instead of hardcoding a custom protocol
 */
export async function generateQRCode(fullUrl) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(fullUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('[v0] Error generating QR code:', error);
    throw error;
  }
}

/**
 * Validate session token format
 */
export function isValidSessionToken(token) {
  return typeof token === 'string' && token.length > 0 && token.includes('-');
}

/**
 * Get device type (iOS, Android, Other)
 */
export function getDeviceType() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) {
    return 'iOS';
  } else if (/Android/.test(ua)) {
    return 'Android';
  } else {
    return 'Other';
  }
}
