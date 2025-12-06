// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL = "https://qioagzkwdnxcyqjxbmlz.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpb2Fnemt3ZG54Y3lxanhibWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODAwNzcsImV4cCI6MjA3OTc1NjA3N30.A1TZpfn2bR8be67MR5mxhSm6frFsEPz6UKPIxCTkVKk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
