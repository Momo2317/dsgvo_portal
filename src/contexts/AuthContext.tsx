
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const AuthContext = createContext<any>({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Email/Password Sign Up
  const signUp = async (email: string, password: string, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: (metadata as any)?.fullName || '',
          avatar_url: (metadata as any)?.avatarUrl || ''
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
    return data;
  };

  // Email/Password Sign In — rememberMe keeps session in localStorage
  const signIn = async (email: string, password: string, rememberMe = true) => {
    // Always persist the session so the user stays logged in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { persistSession: true }
    });
    if (error) throw error;

    // If rememberMe is true, also store the session tokens in localStorage
    // so they survive cookie restrictions (e.g. iframe / SameSite=None issues)
    if (rememberMe && data.session) {
      try {
        localStorage.setItem('sb_remember_me', 'true');
        localStorage.setItem('sb_access_token', data.session.access_token);
        localStorage.setItem('sb_refresh_token', data.session.refresh_token);
      } catch {
        // localStorage not available — session will rely on cookies
      }
    } else {
      try {
        localStorage.removeItem('sb_remember_me');
        localStorage.removeItem('sb_access_token');
        localStorage.removeItem('sb_refresh_token');
      } catch {}
    }

    return data;
  };

  // Sign Out
  const signOut = async () => {
    try {
      localStorage.removeItem('sb_remember_me');
      localStorage.removeItem('sb_access_token');
      localStorage.removeItem('sb_refresh_token');
    } catch {}
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Get Current User
  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  // Check if Email is Verified
  const isEmailVerified = () => {
    return user?.email_confirmed_at !== null;
  };

  // Get User Profile from Database
  const getUserProfile = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    isEmailVerified,
    getUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
