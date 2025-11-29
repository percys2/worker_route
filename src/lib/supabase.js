import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://yucevwxwzdueglrumpfi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1Y2V2d3h3emR1ZWdscnVtcGZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNjE3NjEsImV4cCI6MjA3OTkzNzc2MX0.R3eb_sy7Bw6dECzmal2_61uwi7GuU6MX7AT1iWPcOAQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
