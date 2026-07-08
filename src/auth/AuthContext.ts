import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Tables } from '../lib/database.types'

export type Perfil = Tables<'profiles'>

export interface AuthContextValue {
  session: Session | null
  user: User | null
  perfil: Perfil | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (
    nombre: string,
    email: string,
    password: string
  ) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
