import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to detect phone orientation via gyroscope
 * Returns whether phone is face-down (beta > 150°)
 */
export function useDeviceOrientation() {
    const [isFaceDown, setIsFaceDown] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [permissionError, setPermissionError] = useState(null);
    const [isSupported, setIsSupported] = useState(true);

    const requestPermission = useCallback(async () => {
        // Check if DeviceOrientationEvent is supported
        if (!window.DeviceOrientationEvent) {
            setIsSupported(false);
            setPermissionError('Device orientation not supported on this device');
            return false;
        }

        // iOS 13+ requires user permission
        if (
            typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function'
        ) {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    setPermissionGranted(true);
                    setPermissionError(null);
                    return true;
                } else {
                    setPermissionError('Permission denied by user');
                    return false;
                }
            } catch (error) {
                console.error('[v0] Error requesting device orientation permission:', error);
                setPermissionError('Failed to request permission');
                return false;
            }
        } else {
            // Android and older iOS
            setPermissionGranted(true);
            setPermissionError(null);
            return true;
        }
    }, []);

    useEffect(() => {
        if (!permissionGranted) return;
        const handleDeviceOrientation = (event) => {
            const beta = event.beta || 0;
            const gamma = event.gamma || 0;

            // A phone is face down if tilted past 140 degrees vertically OR horizontally
            const faceDownState = Math.abs(beta) > 140 || Math.abs(gamma) > 140;
            setIsFaceDown(faceDownState);
        };

        window.addEventListener('deviceorientation', handleDeviceOrientation);

        return () => {
            window.removeEventListener('deviceorientation', handleDeviceOrientation);
        };
    }, [permissionGranted]);

    return {
        isFaceDown,
        permissionGranted,
        permissionError,
        isSupported,
        requestPermission,
    };
}
