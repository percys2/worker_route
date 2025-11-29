import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';

export default function RoutesScreen() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (startedAt, endedAt) => {
    if (!endedAt) return 'In Progress';
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    const diff = Math.floor((end - start) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const renderSession = ({ item }) => (
    <TouchableOpacity style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.dateText}>{formatDate(item.started_at)}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.status === 'active' ? styles.activeBadge : styles.completedBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === 'active' ? styles.activeText : styles.completedText,
            ]}
          >
            {item.status === 'active' ? 'Active' : 'Completed'}
          </Text>
        </View>
      </View>

      <View style={styles.sessionDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={18} color="#4CAF50" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Start Time</Text>
            <Text style={styles.detailValue}>{formatTime(item.started_at)}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="flag-outline" size={18} color="#f44336" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>End Time</Text>
            <Text style={styles.detailValue}>
              {item.ended_at ? formatTime(item.ended_at) : '--:--'}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="hourglass-outline" size={18} color="#2196F3" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>
              {calculateDuration(item.started_at, item.ended_at)}
            </Text>
          </View>
        </View>

        {item.total_distance_km > 0 && (
          <View style={styles.detailRow}>
            <Ionicons name="navigate-outline" size={18} color="#FF9800" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Distance</Text>
              <Text style={styles.detailValue}>
                {item.total_distance_km.toFixed(2)} km
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="map-outline" size={64} color="#ddd" />
      <Text style={styles.emptyTitle}>No Routes Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start your work day to begin tracking your routes
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Routes</Text>
        <Text style={styles.headerSubtitle}>View your work history</Text>
      </View>

      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4CAF50"
          />
        }
        ListEmptyComponent={!isLoading && <EmptyState />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#e8f5e9',
  },
  completedBadge: {
    backgroundColor: '#f5f5f5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: '#4CAF50',
  },
  completedText: {
    color: '#666',
  },
  sessionDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailContent: {
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
