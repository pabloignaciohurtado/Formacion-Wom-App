export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      actividades: {
        Row: {
          id: string
          titulo: string
          descripcion: string
          enlace: string | null
          fecha_limite: string | null
          activa: boolean
          creada_por: string | null
          creada_en: string
        }
        Insert: {
          id?: string
          titulo: string
          descripcion?: string
          enlace?: string | null
          fecha_limite?: string | null
          activa?: boolean
          creada_por?: string | null
          creada_en?: string
        }
        Update: {
          id?: string
          titulo?: string
          descripcion?: string
          enlace?: string | null
          fecha_limite?: string | null
          activa?: boolean
          creada_por?: string | null
          creada_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "actividades_creada_por_fkey"
            columns: ["creada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      actividades_completadas: {
        Row: {
          actividad_id: string
          user_id: string
          completada_en: string
        }
        Insert: {
          actividad_id: string
          user_id: string
          completada_en?: string
        }
        Update: {
          actividad_id?: string
          user_id?: string
          completada_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "actividades_completadas_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_completadas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insignias_usuario: {
        Row: {
          user_id: string
          insignia_id: string
          obtenida_en: string
        }
        Insert: {
          user_id: string
          insignia_id: string
          obtenida_en?: string
        }
        Update: {
          user_id?: string
          insignia_id?: string
          obtenida_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "insignias_usuario_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_events: {
        Row: {
          detalle: string | null
          fecha: string
          id: string
          meta: Json | null
          tipo: string
          user_id: string
        }
        Insert: {
          detalle?: string | null
          fecha?: string
          id: string
          meta?: Json | null
          tipo: string
          user_id: string
        }
        Update: {
          detalle?: string | null
          fecha?: string
          id?: string
          meta?: Json | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          correcto: boolean
          domain_id: string
          exercise_id: string
          fecha: string
          id: string
          objetivo_id: string
          puntaje: number
          user_id: string
        }
        Insert: {
          correcto: boolean
          domain_id: string
          exercise_id: string
          fecha?: string
          id: string
          objetivo_id: string
          puntaje: number
          user_id: string
        }
        Update: {
          correcto?: boolean
          domain_id?: string
          exercise_id?: string
          fecha?: string
          id?: string
          objetivo_id?: string
          puntaje?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultas: {
        Row: {
          actualizada: string | null
          domain_id: string | null
          estado: string
          fecha: string
          id: string
          respuesta_admin: string | null
          texto: string
          user_id: string
          user_nombre: string
        }
        Insert: {
          actualizada?: string | null
          domain_id?: string | null
          estado?: string
          fecha?: string
          id: string
          respuesta_admin?: string | null
          texto: string
          user_id: string
          user_nombre: string
        }
        Update: {
          actualizada?: string | null
          domain_id?: string | null
          estado?: string
          fecha?: string
          id?: string
          respuesta_admin?: string | null
          texto?: string
          user_id?: string
          user_nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          asignada_por: string | null
          domain_id: string
          fecha_limite: string | null
          id: string
          maestria_objetivo: number
          user_id: string
        }
        Insert: {
          asignada_por?: string | null
          domain_id: string
          fecha_limite?: string | null
          id: string
          maestria_objetivo: number
          user_id: string
        }
        Update: {
          asignada_por?: string | null
          domain_id?: string
          fecha_limite?: string | null
          id?: string
          maestria_objetivo?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_asignada_por_fkey"
            columns: ["asignada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          alta_fecha: string | null
          alta_por: string | null
          baja_fecha: string | null
          creado_en: string
          email: string
          id: string
          liga: string
          nombre: string
          role: string
        }
        Insert: {
          activo?: boolean
          alta_fecha?: string | null
          alta_por?: string | null
          baja_fecha?: string | null
          creado_en?: string
          email: string
          id: string
          nombre: string
          role?: string
        }
        Update: {
          activo?: boolean
          alta_fecha?: string | null
          alta_por?: string | null
          baja_fecha?: string | null
          creado_en?: string
          email?: string
          id?: string
          nombre?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_alta_por_fkey"
            columns: ["alta_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      srs_cards: {
        Row: {
          actualizada: string
          caja: number
          domain_id: string
          exercise_id: string
          proximo_repaso: string
          repasos: number
          ultimo_resultado: boolean
          user_id: string
        }
        Insert: {
          actualizada?: string
          caja?: number
          domain_id: string
          exercise_id: string
          proximo_repaso?: string
          repasos?: number
          ultimo_resultado?: boolean
          user_id: string
        }
        Update: {
          actualizada?: string
          caja?: number
          domain_id?: string
          exercise_id?: string
          proximo_repaso?: string
          repasos?: number
          ultimo_resultado?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "srs_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      mi_racha: { Args: never; Returns: number }
      asegurar_corte_semanal: { Args: never; Returns: boolean }
      resumen_equipo: {
        Args: never
        Returns: {
          user_id: string
          nombre: string
          liga: string
          xp: number
          intentos: number
          correctas: number
          ultima_actividad: string | null
          obligatorias_pendientes: number
        }[]
      }
      precision_por_dominio: {
        Args: never
        Returns: {
          domain_id: string
          intentos: number
          correctas: number
          precision_pct: number
        }[]
      }
      ranking_semanal: {
        Args: never
        Returns: {
          user_id: string
          nombre: string
          liga: string
          xp: number
          intentos: number
          correctas: number
          posicion: number
        }[]
      }
      heroes_semana: {
        Args: never
        Returns: { nombre: string; xp: number; posicion: number }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
