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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          id: string
          note: string | null
          occurred_at: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          occurred_at?: string
          type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          occurred_at?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_transactions_account_id_user_id_fkey"
            columns: ["account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id", "user_id"]
          },
          {
            foreignKeyName: "account_transactions_account_id_user_id_fkey"
            columns: ["account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          input_tokens: number | null
          output_tokens: number | null
          report_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          report_id: string
          role: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          report_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_report_id_user_id_fkey"
            columns: ["report_id", "user_id"]
            isOneToOne: false
            referencedRelation: "ai_reports"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      ai_reports: {
        Row: {
          account_id: string | null
          created_at: string
          id: string
          input_tokens: number | null
          model: string
          output_tokens: number | null
          period_from: string | null
          period_to: string | null
          report: Json
          stats: Json
          trade_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          model: string
          output_tokens?: number | null
          period_from?: string | null
          period_to?: string | null
          report: Json
          stats: Json
          trade_count: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          period_from?: string | null
          period_to?: string | null
          report?: Json
          stats?: Json
          trade_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_reports_account_id_user_id_fkey"
            columns: ["account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id", "user_id"]
          },
          {
            foreignKeyName: "ai_reports_account_id_user_id_fkey"
            columns: ["account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          created_at: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_messages: {
        Row: {
          content: Json
          conversation_id: string
          created_at: string
          display_text: string | null
          id: string
          input_tokens: number | null
          output_tokens: number | null
          proposals: Json
          role: string
          user_id: string
        }
        Insert: {
          content: Json
          conversation_id: string
          created_at?: string
          display_text?: string | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          proposals?: Json
          role: string
          user_id?: string
        }
        Update: {
          content?: Json
          conversation_id?: string
          created_at?: string
          display_text?: string | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          proposals?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_messages_conversation_id_user_id_fkey"
            columns: ["conversation_id", "user_id"]
            isOneToOne: false
            referencedRelation: "coach_conversations"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_consent_at: string | null
          created_at: string
          default_currency: string
          display_name: string | null
          id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          ai_consent_at?: string | null
          created_at?: string
          default_currency?: string
          display_name?: string | null
          id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          ai_consent_at?: string | null
          created_at?: string
          default_currency?: string
          display_name?: string | null
          id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          account_id: string
          created_at: string
          direction: string
          entry_price: number
          entry_time: string
          exit_price: number | null
          exit_time: string | null
          id: string
          net_pnl: number | null
          notes: string | null
          r_multiple: number | null
          rating: number | null
          status: string | null
          stop_loss: number | null
          strategy: string | null
          symbol: string
          tags: string[]
          take_profit: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          direction: string
          entry_price: number
          entry_time: string
          exit_price?: number | null
          exit_time?: string | null
          id?: string
          net_pnl?: number | null
          notes?: string | null
          r_multiple?: number | null
          rating?: number | null
          status?: string | null
          stop_loss?: number | null
          strategy?: string | null
          symbol: string
          tags?: string[]
          take_profit?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          direction?: string
          entry_price?: number
          entry_time?: string
          exit_price?: number | null
          exit_time?: string | null
          id?: string
          net_pnl?: number | null
          notes?: string | null
          r_multiple?: number | null
          rating?: number | null
          status?: string | null
          stop_loss?: number | null
          strategy?: string | null
          symbol?: string
          tags?: string[]
          take_profit?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_user_id_fkey"
            columns: ["account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id", "user_id"]
          },
          {
            foreignKeyName: "trades_account_id_user_id_fkey"
            columns: ["account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      trading_accounts: {
        Row: {
          account_type: string
          broker: string | null
          created_at: string
          currency: string
          external_account_id: string | null
          external_provider: string | null
          id: string
          is_archived: boolean
          name: string
          start_date: string
          starting_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type: string
          broker?: string | null
          created_at?: string
          currency?: string
          external_account_id?: string | null
          external_provider?: string | null
          id?: string
          is_archived?: boolean
          name: string
          start_date: string
          starting_balance: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_type?: string
          broker?: string | null
          created_at?: string
          currency?: string
          external_account_id?: string | null
          external_provider?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          start_date?: string
          starting_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_rules: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          position: number
          source: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          position?: number
          source?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          position?: number
          source?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      account_balances: {
        Row: {
          account_id: string | null
          currency: string | null
          current_balance: number | null
          realized_pnl: number | null
          starting_balance: number | null
          total_deposits: number | null
          total_withdrawals: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ai_try_consume: { Args: { p_kind: string }; Returns: boolean }
      can_add_trade_screenshot: {
        Args: { p_trade_id: string }
        Returns: boolean
      }
      delete_my_account: { Args: never; Returns: undefined }
      mfa_satisfied: { Args: never; Returns: boolean }
      session_is_active: { Args: never; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
