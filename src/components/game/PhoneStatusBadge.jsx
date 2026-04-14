/**
 * Phone Status Badge Component
 * Displays the phone focus status with visual indicators
 * Can be used in PlayerCard, squad displays, or anywhere phone status is relevant
 */

export function PhoneStatusBadge({ isLockedIn, appSwitchCount, showLabel = true, compact = false }) {
  if (isLockedIn === null || isLockedIn === undefined) {
    return null; // No phone connected
  }

  if (compact) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          background: isLockedIn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${isLockedIn ? '#10b981' : '#ef4444'}`,
        }}
        title={isLockedIn ? 'Phone: Locked In' : 'Phone: Distracted'}
      >
        <span style={{ fontSize: '0.8rem' }}>{isLockedIn ? '📱🔒' : '📱📢'}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        borderRadius: '6px',
        background: isLockedIn ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        border: `1px solid ${isLockedIn ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
      }}
    >
      <span style={{ fontSize: '1rem' }}>{isLockedIn ? '🔒' : '📢'}</span>
      {showLabel && (
        <div style={{ fontSize: '0.8rem', color: isLockedIn ? '#10b981' : '#ef4444', fontWeight: 500 }}>
          {isLockedIn ? 'LOCKED IN' : 'DISTRACTED'}
        </div>
      )}
      {appSwitchCount > 0 && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>
          ({appSwitchCount} switch{appSwitchCount !== 1 ? 'es' : ''})
        </span>
      )}
    </div>
  );
}

/**
 * Phone Status Indicator (minimal icon only)
 * Useful for badges or tight spaces
 */
export function PhoneStatusIndicator({ isLockedIn, size = 'md' }) {
  if (isLockedIn === null || isLockedIn === undefined) {
    return null;
  }

  const sizeMap = {
    sm: { fontSize: '0.8rem', width: '20px', height: '20px' },
    md: { fontSize: '1rem', width: '24px', height: '24px' },
    lg: { fontSize: '1.2rem', width: '28px', height: '28px' },
  };

  const dimensions = sizeMap[size] || sizeMap.md;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: '50%',
        background: isLockedIn ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
        border: `2px solid ${isLockedIn ? '#10b981' : '#ef4444'}`,
        animation: !isLockedIn ? 'pulse 2s infinite' : 'none',
      }}
      title={isLockedIn ? 'Phone: Locked In' : 'Phone: Distracted'}
    >
      <span style={{ fontSize: dimensions.fontSize }}>{isLockedIn ? '🔒' : '📢'}</span>
    </div>
  );
}

/**
 * Phone Status Overlay (large, attention-grabbing)
 * Used in large player cards or focus displays
 */
export function PhoneStatusOverlay({ isLockedIn, appSwitchCount = 0 }) {
  if (isLockedIn === null || isLockedIn === undefined) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.3rem',
      }}
    >
      {/* Status Badge */}
      <div
        style={{
          background: isLockedIn ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          padding: '0.35rem 0.6rem',
          borderRadius: '4px',
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
        }}
      >
        {isLockedIn ? 'LOCKED IN' : 'DISTRACTED'}
      </div>

      {/* App Switches Badge */}
      {appSwitchCount > 0 && (
        <div
          style={{
            background: 'rgba(245, 200, 66, 0.9)',
            color: '#1a1a1a',
            padding: '0.2rem 0.4rem',
            borderRadius: '3px',
            fontSize: '0.65rem',
            fontWeight: 500,
          }}
        >
          {appSwitchCount} app switch{appSwitchCount !== 1 ? 'es' : ''}
        </div>
      )}
    </div>
  );
}
