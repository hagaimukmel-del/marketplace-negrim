'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  userRole: 'admin' | 'supplier' | 'carpenter' | null
  loading: boolean
  signUp: (email: string, password: string, role: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userRole, setUserRole] = useState<'admin' | 'supplier' | 'carpenter' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('[Auth] Initializing auth...')
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[Auth] Error getting session:', error)
      } else {
        console.log('[Auth] Session loaded:', session?.user?.email)
        setSession(session)
        setUser(session?.user || null)
        if (session?.user) {
          fetchUserRole(session.user.id)
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[Auth] Auth state changed:', _event)
        setSession(session)
        setUser(session?.user || null)
        if (session?.user) {
          await fetchUserRole(session.user.id)
        } else {
          setUserRole(null)
        }
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', userId)
        .single()

      if (!error && data) {
        setUserRole(data.role)
      }
    } catch (err) {
      console.error('Error fetching user role:', err)
    }
  }

  const signUp = async (email: string, password: string, role: string) => {
    console.log('[Auth] SignUp attempt:', email, role)
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      console.error('[Auth] SignUp error:', error)
      throw new Error(`Signup failed: ${error.message}`)
    }

    console.log('[Auth] User created:', data.user?.id)

    if (data.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{ user_id: data.user.id, role, email }])

      if (profileError) {
        console.error('[Auth] Profile creation error:', profileError)
        throw new Error(`Profile creation failed: ${profileError.message}`)
      }
      console.log('[Auth] Profile created successfully')
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUserRole(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, userRole, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
