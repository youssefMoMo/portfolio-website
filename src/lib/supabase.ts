// src/lib/supabase.ts
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (import.meta.env.DEV && (!supabaseUrl || !supabaseAnonKey)) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing — running with Supabase disabled.",
  );
}

export const supabase: SupabaseClient | null = 
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
          storageKey: 'youssef-portfolio-auth',
        },
        global: {
          headers: { 'x-application-name': 'youssef-portfolio' },
        },
        realtime: {
          params: { eventsPerSecond: 10 },
        },
      })
    : null;

export const isSupabaseEnabled = !!supabase;

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string;
          discord_id: string;
          discord_username: string | null;
          discord_avatar: string | null;
          is_active: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          discord_id: string;
          discord_username?: string | null;
          discord_avatar?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          discord_id?: string;
          discord_username?: string | null;
          discord_avatar?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      site_content: {
        Row: {
          id: string;
          content_type: 'home' | 'portfolio' | 'pricing' | 'reviews' | 'policies';
          content_key: string;
          content_value: any;
          is_published: boolean;
          version: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content_type: 'home' | 'portfolio' | 'pricing' | 'reviews' | 'policies';
          content_key: string;
          content_value: any;
          is_published?: boolean;
          version?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content_type?: 'home' | 'portfolio' | 'pricing' | 'reviews' | 'policies';
          content_key?: string;
          content_value?: any;
          is_published?: boolean;
          version?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};