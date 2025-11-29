import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLocationTracking } from '../../src/hooks/useLocationTracking';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const {
    isTracking,
    currentLocation,
    isLoading,
    error,
    startTracking,
    stopTracking,
    refreshLocation,
  } = useLocationTracking(user?.id);

  const [workStartTime, setWorkStartTime] = useState(null);

  useEffect(() => {
    if (isTracking && !workStartTime) {
      setWorkStartTime(new Date());
    } else if (!isTracking) {
      setWorkStartTime(null);
    }
  }, [isTracking]);

  const handleToggleTracking = async () => {
    if (isTracking) {
      Alert.alert(
        'End Work Day',
        'Are you sure you want to end your work day?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'End Day',
            style: 'destructive',
            onPress: async () => {
              const result = await stopTracking();
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to stop tracking');
              }
            },
          },
        ]
      );
    } else {
      const result = await startTracking();
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to start tracking');
      }
    }
  };

  const formatDuration = () => {
    if (!workStartTime) return '00:00:00';
    const now = new Date();
    const diff = Math.floor((now - workStartTime) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const [duration, setDuration] = useState('00:00:00');

  useEffect(() => {
    let interval;
    if (isTracking && workStartTime) {
      interval = setInterval(() => {
        setDuration(formatDuration());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, workStartTime]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.userName}>{user?.full_name || 'Worker'}</Text>
          <Text style={styles.userRole}>{user?.role || 'Employee'}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusCard}>
        <View
          style={[
            styles.statusIndicator,
            isTracking ? styles.statusActive : styles.statusInactive,
          ]}
        />
        <Text style={styles.statusText}>
          {isTracking ? 'Currently Working' : 'Not Working'}
        </Text>
        {isTracking && <Text style={styles.durationText}>{duration}</Text>}
      </View>

      {currentLocation && (
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>Current Location</Text>
          <Text style={styles.locationText}>
            Lat: {currentLocation.latitude?.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            Lng: {currentLocation.longitude?.toFixed(6)}
          </Text>
          {currentLocation.speed !== null && (
            <Text style={styles.locationText}>
              Speed: {(currentLocation.speed * 3.6).toFixed(1)} km/h
            </Text>
          )}
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshLocation}
          >
            <Text style={styles.refreshText}>Refresh Location</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.mainButton,
            isTracking ? styles.stopButton : styles.startButton,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleToggleTracking}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <>
              <Text style={styles.mainButtonText}>
                {isTracking ? 'END WORK DAY' : 'START WORK DAY'}
              </Text>
              <Text style={styles.mainButtonSubtext}>
                {isTracking
                  ? 'Tap to stop location sharing'
                  : 'Tap to start location sharing'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  userRole: {
    fontSize: 14,
    color: '#4CAF50',
    textTransform: 'capitalize',
    marginTop: 4,
  },
  signOutButton: {
    padding: 8,
  },
  signOutText: {
    color: '#f44336',
    fontSize: 14,
  },
  statusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusActive: {
    backgroundColor: '#4CAF50',
  },
  statusInactive: {
    backgroundColor: '#9e9e9e',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  durationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    fontVariant: ['tabular-nums'],
  },
  locationCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  refreshButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  refreshText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  mainButton: {
    borderRadius: 100,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1,
    maxWidth: 250,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mainButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
});
