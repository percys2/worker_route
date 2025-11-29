import { useState, useEffect, useCallback } from 'react';
import {
  requestLocationPermissions,
  startLocationTracking,
  stopLocationTracking,
  getCurrentLocation,
  isTrackingActive,
  syncQueuedLocations,
} from '../services/locationService';

export function useLocationTracking(userId) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check tracking status on mount
  useEffect(() => {
    checkTrackingStatus();
  }, []);

  const checkTrackingStatus = async () => {
    const active = await isTrackingActive();
    setIsTracking(active);
  };

  const requestPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await requestLocationPermissions();
      setPermissionGranted(result.granted);
      if (!result.granted) {
        setError(result.message);
      }
      return result;
    } catch (e) {
      setError(e.message);
      return { granted: false, message: e.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startTracking = useCallback(async () => {
    if (!userId) {
      setError('User ID is required');
      return { success: false };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permissions first
      const permResult = await requestLocationPermissions();
      if (!permResult.granted) {
        setError(permResult.message);
        return { success: false };
      }
      setPermissionGranted(true);

      // Start tracking
      const result = await startLocationTracking(userId);
      if (result.success) {
        setIsTracking(true);
        // Get initial location
        const location = await getCurrentLocation();
        setCurrentLocation(location);
      } else {
        setError(result.error);
      }
      return result;
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const stopTracking = useCallback(async () => {
    if (!userId) {
      setError('User ID is required');
      return { success: false };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await stopLocationTracking(userId);
      if (result.success) {
        setIsTracking(false);
      } else {
        setError(result.error);
      }
      return result;
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const refreshLocation = useCallback(async () => {
    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);
      return location;
    } catch (e) {
      setError(e.message);
      return null;
    }
  }, []);

  const syncOfflineData = useCallback(async () => {
    try {
      await syncQueuedLocations();
    } catch (e) {
      console.error('Error syncing offline data:', e);
    }
  }, []);

  return {
    isTracking,
    currentLocation,
    permissionGranted,
    isLoading,
    error,
    requestPermissions,
    startTracking,
    stopTracking,
    refreshLocation,
    syncOfflineData,
  };
}

export default useLocationTracking;
