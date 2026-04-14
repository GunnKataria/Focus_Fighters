# Phone Jail Controller - Integration Guide

## Overview
The Phone Jail Controller feature enables real-time phone focus detection using device orientation (gyroscope) and visibility API to track whether users are focusing on their study session.

## New Files Created

### 1. Hooks
- **`src/hooks/useDeviceOrientation.js`** - Detects phone face-down position via gyroscope
- **`src/hooks/useVisibilityDetector.js`** - Detects app visibility/switching
- **`src/hooks/usePhoneJailSession.js`** - Manages phone session creation and QR code generation
- **`src/hooks/usePhoneStatusListener.js`** - Real-time listener for phone status updates

### 2. Components
- **`src/components/game/PhoneJailQRCode.jsx`** - QR code display component with session generation
- **`src/components/game/PhoneStatusBadge.jsx`** - Status badge components (multiple variants)
- **`src/screens/MobileControllerScreen.jsx`** - Full mobile phone controller interface

### 3. Utilities
- **`src/lib/phoneSessionUtils.js`** - Token generation, QR code creation, device detection

### 4. Database
- **Table**: `ff_phone_sessions` - Stores phone controller sessions
- **Columns added to `ff_room_members`**:
  - `phone_locked_in` (boolean)
  - `phone_app_switch_count` (integer)
  - `last_phone_update` (timestamp)

---

## Integration Steps

### Step 1: Add Route for Mobile Controller
Update your routing (likely in `App.jsx` or your router setup) to handle the mobile controller path:

```jsx
import MobileControllerScreen from './screens/MobileControllerScreen';

// In your router/route handler:
// When URL contains '/phone-controller', render MobileControllerScreen
```

### Step 2: Add QR Code to LobbyScreen
In `src/screens/LobbyScreen.jsx`, import and add the QR code component when a room is created:

```jsx
import PhoneJailQRCode from '../components/game/PhoneJailQRCode';
import { usePhoneJailSession } from '../hooks/usePhoneJailSession';

// Inside LobbyScreen component:
const phoneJail = usePhoneJailSession(liveRoom?.id);

// In the JSX, add this after the "Create Raid Room" section:
{liveRoom && (
  <>
    {/* Existing room code display */}
    
    {/* Add this for Phone Jail QR Code */}
    <PhoneJailQRCode roomId={liveRoom.id} />
  </>
)}
```

### Step 3: Add Phone Status Listener to GameScreen
In `src/screens/GameScreen/index.jsx`:

```jsx
import { usePhoneStatusListener } from '../../hooks/usePhoneStatusListener';

// Inside GameScreen component:
const { getPhoneStatus } = usePhoneStatusListener(liveRoom?.id);

// In your squad mapping, you can now check phone status:
const enrichedSquad = squad.map((member) => {
  const phoneStatus = getPhoneStatus(member.id);
  return {
    ...member,
    phoneStatus,
  };
});
```

### Step 4: Add Phone Badges to PlayerCard
In `src/components/game/PlayerCard.jsx` or wherever players are displayed:

```jsx
import { PhoneStatusBadge, PhoneStatusIndicator } from './PhoneStatusBadge';

// Inside PlayerCard component:
export default function PlayerCard({ member, phoneStatus }) {
  return (
    <Card>
      {/* Existing player info */}
      
      {/* Add phone status badge if available */}
      {phoneStatus?.isLockedIn !== null && (
        <PhoneStatusBadge 
          isLockedIn={phoneStatus.isLockedIn} 
          appSwitchCount={phoneStatus.appSwitchCount}
          compact={true}
        />
      )}
      
      {/* Or use compact indicator for tight spaces */}
      {phoneStatus?.isLockedIn !== null && (
        <PhoneStatusIndicator isLockedIn={phoneStatus.isLockedIn} size="md" />
      )}
    </Card>
  );
}
```

### Step 5: Display QR Code in Waiting Room
In the "Waiting Room" section of LobbyScreen, add:

```jsx
{liveRoom && (
  <div style={{ /* card styling */ }}>
    {/* Existing room info */}
    
    {/* QR Code for phone linking */}
    <PhoneJailQRCode roomId={liveRoom.id} />
  </div>
)}
```

---

## Feature Breakdown

### Mobile Controller Screen (`/phone-controller`)
- **URL Parameters**: `?session=TOKEN&roomId=ROOM_ID`
- **Features**:
  - Real-time gyroscope detection (face-down = locked in)
  - App visibility detection (app hidden = distracted)
  - Motion permission request prompt
  - Status indicators showing phone position, app visibility, app switches
  - Syncs status to database every 2 seconds

### QR Code Display
- Generated in LobbyScreen when a room is created
- Links to `/phone-controller?session=...&roomId=...`
- Includes fallback text link for manual entry
- Session expires after 1 hour

### Status Badges
Three badge variants available:

1. **PhoneStatusBadge** - Full text badge showing status and app switches
   ```jsx
   <PhoneStatusBadge isLockedIn={true} appSwitchCount={2} showLabel={true} />
   ```

2. **PhoneStatusIndicator** - Icon-only circular indicator
   ```jsx
   <PhoneStatusIndicator isLockedIn={true} size="md" />
   ```

3. **PhoneStatusOverlay** - Large overlay for player cards
   ```jsx
   <PhoneStatusOverlay isLockedIn={true} appSwitchCount={2} />
   ```

---

## Real-Time Sync Flow

```
Phone Device
    ↓
[useDeviceOrientation] detects face-down
[useVisibilityDetector] detects app visibility
    ↓
[MobileControllerScreen] computes locked-in status
    ↓
Syncs every 2 seconds to Supabase:
ff_phone_sessions.phone_locked_in
ff_room_members.phone_locked_in + phone_app_switch_count
    ↓
[usePhoneStatusListener] in GameScreen receives real-time updates
    ↓
[PhoneStatusBadge] displays updated status in UI
```

---

## Environment Variables

No new environment variables needed. Uses existing Supabase configuration.

---

## Browser Support

- **iOS 13+**: Requires explicit permission via `DeviceOrientationEvent.requestPermission()`
- **Android**: Direct access to DeviceOrientationEvent
- **Fallback**: If device doesn't support orientation events, shows warning but allows session creation

---

## Security Considerations

1. **Session Tokens**: 
   - Generated uniquely per room + user combo
   - Stored in database with expiry (1 hour)
   - Validated before updating status

2. **RLS Policies**:
   - Users can only view/update their own phone sessions
   - Queries filtered by `user_id = auth.uid()`

3. **Database Constraints**:
   - UNIQUE constraint on (room_id, user_id) in ff_phone_sessions
   - Cascading deletes when room/user deleted

---

## API Integration Summary

### Hooks Usage
```jsx
// Get QR code for a room
const { qrCodeUrl, sessionToken } = usePhoneJailSession(roomId);

// Listen for phone status updates
const { getPhoneStatus } = usePhoneStatusListener(roomId);
const status = getPhoneStatus(userId);

// On the phone side - detect orientation
const { isFaceDown, permissionGranted } = useDeviceOrientation();

// On the phone side - detect app visibility
const { isAppVisible, appSwitchCount } = useVisibilityDetector();
```

---

## Testing the Feature

### Desktop (Host) Testing
1. Create a room in LobbyScreen
2. Look for QR code in the waiting room
3. Copy the controller URL

### Mobile Testing
1. Visit the controller URL on your phone
2. Grant motion detection permission (iOS)
3. Place phone face-down (beta angle > 150°)
4. Status should show "LOCKED IN" in green
5. Switch apps → status becomes "DISTRACTED" in red
6. Return to app → status back to green

---

## Troubleshooting

### QR Code Not Generating
- Check Supabase is connected
- Verify user is authenticated
- Check browser console for errors

### Phone Session Not Syncing
- Ensure motion permission granted on iOS
- Check that `/phone-controller` route is configured
- Verify Supabase realtime subscriptions are enabled

### Status Not Updating in GameScreen
- Confirm `usePhoneStatusListener` is called with correct roomId
- Check Supabase RLS policies allow reading ff_room_members
- Verify phone is actively updating (check mobile controller screen)

---

## Future Enhancements

- [ ] Phone battery level monitoring
- [ ] Location verification (optional)
- [ ] Extended analytics (focus duration, distraction patterns)
- [ ] Penalty system for app switches
- [ ] Reward system for maintaining focus
- [ ] Admin dashboard for viewing phone analytics
