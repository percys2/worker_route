import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const LOCATION_TASK_NAME = 'worker-background-location';
const LOCATION_QUEUE_KEY = 'location_queue';

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations[0];

    if (!location) return;

    const { latitude, longitude, speed, accuracy } = location.coords;
    const timestamp = new Date().toISOString();

    // Get user ID from storage
    const userId = await AsyncStorage.getItem('user_id');
    if (!userId) return;

    const locationData = {
      user_id: userId,
      latitude,
      longitude,
      speed,
      accuracy,
      timestamp,
      is_online: true,
    };

    // Try to send to Supabase, if offline, queue it
    try {
      const { error: insertError } = await supabase
        .from('worker_locations')
        .insert(locationData);

      if (insertError) {
        await queueLocation(locationData);
      } else {
        // Also try to sync any queued locations
        await syncQueuedLocations();
      }
    } catch (e) {
      await queueLocation(locationData);
    }

    console.log('Location tracked:', latitude, longitude);
  }
});

// Queue location for offline sync
async function queueLocation(locationData) {
  try {
    const queueStr = await AsyncStorage.getItem(LOCATION_QUEUE_KEY);
    const queue = queueStr ? JSON.parse(queueStr) : [];
    queue.push({
      ...locationData,
      recorded_at: locationData.timestamp,
      synced: false,
    });
    await AsyncStorage.setItem(LOCATION_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error queuing location:', e);
  }
}

// Sync queued locations when back online
export async function syncQueuedLocations() {
  try {
    const queueStr = await AsyncStorage.getItem(LOCATION_QUEUE_KEY);
    if (!queueStr) return;

    const queue = JSON.parse(queueStr);
    const unsyncedLocations = queue.filter((loc) => !loc.synced);

    if (unsyncedLocations.length === 0) return;

    for (const loc of unsyncedLocations) {
      const { error } = await supabase.from('worker_locations').insert({
        user_id: loc.user_id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        speed: loc.speed,
        accuracy: loc.accuracy,
        timestamp: loc.recorded_at,
        is_online: true,
      });

      if (!error) {
        loc.synced = true;
      }
    }

    // Update queue with synced status
    await AsyncStorage.setItem(LOCATION_QUEUE_KEY, JSON.stringify(queue));

    // Remove synced items
    const remainingQueue = queue.filter((loc) => !loc.synced);
    await AsyncStorage.setItem(LOCATION_QUEUE_KEY, JSON.stringify(remainingQueue));

    console.log(`Synced ${unsyncedLocations.length - remainingQueue.length} queued locations`);
  } catch (e) {
    console.error('Error syncing queued locations:', e);
  }
}

// Request location permissions
export async function requestLocationPermissions() {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    return { granted: false, message: 'Foreground location permission denied' };
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    return { granted: false, message: 'Background location permission denied' };
  }

  return { granted: true, message: 'All permissions granted' };
}

// Start location tracking
export async function startLocationTracking(userId) {
  try {
    // Store user ID for background task
    await AsyncStorage.setItem('user_id', userId);

    // Check if already tracking
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTracking) {
      console.log('Already tracking location');
      return { success: true };
    }

    // Start background location updates
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000, // Every 10 seconds
      distanceInterval: 10, // Or every 10 meters
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Location Tracking Active',
        notificationBody: 'Your location is being shared with your team.',
        notificationColor: '#4CAF50',
      },
    });

    // Create work session
    await supabase.from('work_sessions').insert({
      user_id: userId,
      status: 'active',
    });

    console.log('Location tracking started');
    return { success: true };
  } catch (error) {
    console.error('Error starting location tracking:', error);
    return { success: false, error: error.message };
  }
}

// Stop location tracking
export async function stopLocationTracking(userId) {
  try {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    // Update work session
    const { data: sessions } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0) {
      await supabase
        .from('work_sessions')
        .update({
          ended_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', sessions[0].id);
    }

    // Mark user as offline
    await supabase
      .from('worker_locations')
      .update({ is_online: false })
      .eq('user_id', userId);

    // Sync any remaining queued locations
    await syncQueuedLocations();

    console.log('Location tracking stopped');
    return { success: true };
  } catch (error) {
    console.error('Error stopping location tracking:', error);
    return { success: false, error: error.message };
  }
}

// Get current location
export async function getCurrentLocation() {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      speed: location.coords.speed,
      accuracy: location.coords.accuracy,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}

// Check if tracking is active
export async function isTrackingActive() {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch (error) {
    return false;
  }
}
