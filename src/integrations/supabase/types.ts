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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      favorite_orders: {
        Row: {
          created_at: string
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          phone: string
          shipping_address: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone: string
          shipping_address: string
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string
          shipping_address?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          images: string[] | null
          is_active: boolean
          name: string
          price: number
          stock: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean
          name: string
          price: number
          stock?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean
          name?: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          email: string
          first_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          middle_name: string | null
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          last_name?: string | null
          middle_name?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      squid_admins: {
        Row: {
          created_at: string | null
          id: string
          telegram_id: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          telegram_id: number
        }
        Update: {
          created_at?: string | null
          id?: string
          telegram_id?: number
        }
        Relationships: []
      }
      squid_bot_chats: {
        Row: {
          chat_id: number
          chat_title: string | null
          chat_type: string
          chat_username: string | null
          created_at: string | null
          id: string
          last_activity: string | null
          member_count: number | null
        }
        Insert: {
          chat_id: number
          chat_title?: string | null
          chat_type: string
          chat_username?: string | null
          created_at?: string | null
          id?: string
          last_activity?: string | null
          member_count?: number | null
        }
        Update: {
          chat_id?: number
          chat_title?: string | null
          chat_type?: string
          chat_username?: string | null
          created_at?: string | null
          id?: string
          last_activity?: string | null
          member_count?: number | null
        }
        Relationships: []
      }
      squid_bot_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      squid_casino_history: {
        Row: {
          bet_amount: number
          created_at: string | null
          game_type: string
          id: string
          player_id: string | null
          result: Json | null
          win_amount: number | null
        }
        Insert: {
          bet_amount: number
          created_at?: string | null
          game_type: string
          id?: string
          player_id?: string | null
          result?: Json | null
          win_amount?: number | null
        }
        Update: {
          bet_amount?: number
          created_at?: string | null
          game_type?: string
          id?: string
          player_id?: string | null
          result?: Json | null
          win_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "squid_casino_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "squid_players"
            referencedColumns: ["id"]
          },
        ]
      }
      squid_clan_members: {
        Row: {
          clan_id: string
          id: string
          joined_at: string | null
          player_id: string
          role: string
        }
        Insert: {
          clan_id: string
          id?: string
          joined_at?: string | null
          player_id: string
          role?: string
        }
        Update: {
          clan_id?: string
          id?: string
          joined_at?: string | null
          player_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "squid_clan_members_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "squid_clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squid_clan_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "squid_players"
            referencedColumns: ["id"]
          },
        ]
      }
      squid_clans: {
        Row: {
          balance: number
          created_at: string | null
          id: string
          member_count: number
          name: string
          owner_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          member_count?: number
          name: string
          owner_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          member_count?: number
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squid_clans_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "squid_players"
            referencedColumns: ["id"]
          },
        ]
      }
      squid_game_sessions: {
        Row: {
          bet_amount: number
          created_at: string | null
          finished_at: string | null
          game_data: Json | null
          game_type: string
          id: string
          player1_id: string | null
          player2_id: string | null
          status: string | null
          winner_id: string | null
        }
        Insert: {
          bet_amount: number
          created_at?: string | null
          finished_at?: string | null
          game_data?: Json | null
          game_type: string
          id?: string
          player1_id?: string | null
          player2_id?: string | null
          status?: string | null
          winner_id?: string | null
        }
        Update: {
          bet_amount?: number
          created_at?: string | null
          finished_at?: string | null
          game_data?: Json | null
          game_type?: string
          id?: string
          player1_id?: string | null
          player2_id?: string | null
          status?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "squid_game_sessions_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "squid_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squid_game_sessions_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "squid_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squid_game_sessions_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "squid_players"
            referencedColumns: ["id"]
          },
        ]
      }
      squid_jackpot_bets: {
        Row: {
          bet_amount: number
          color: string
          created_at: string | null
          id: string
          player_id: string
          session_id: string
        }
        Insert: {
          bet_amount: number
          color: string
          created_at?: string | null
          id?: string
          player_id: string
          session_id: string
        }
        Update: {
          bet_amount?: number
          color?: string
          created_at?: string | null
          id?: string
          player_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squid_jackpot_bets_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "squid_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squid_jackpot_bets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "squid_jackpot_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      squid_jackpot_sessions: {
        Row: {
          created_at: string | null
          finished_at: string | null
          id: string
          pool_amount: number
          status: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          finished_at?: string | null
          id?: string
          pool_amount?: number
          status?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          finished_at?: string | null
          id?: string
          pool_amount?: number
          status?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "squid_jackpot_sessions_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "squid_players"
            referencedColumns: ["id"]
          },
        ]
      }
      squid_player_businesses: {
        Row: {
          business_type: string
          created_at: string | null
          id: string
          last_collection: string | null
          player_id: string
          upgrade_level: number
        }
        Insert: {
          business_type: string
          created_at?: string | null
          id?: string
          last_collection?: string | null
          player_id: string
          upgrade_level?: number
        }
        Update: {
          business_type?: string
          created_at?: string | null
          id?: string
          last_collection?: string | null
          player_id?: string
          upgrade_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "squid_player_businesses_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "squid_players"
            referencedColumns: ["id"]
          },
        ]
      }
      squid_player_chats: {
        Row: {
          chat_id: number
          created_at: string | null
          id: string
          last_message_at: string | null
          player_id: string
        }
        Insert: {
          chat_id: number
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          player_id: string
        }
        Update: {
          chat_id?: number
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squid_player_chats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "squid_players"
            referencedColumns: ["id"]
          },
        ]
      }
      squid_player_items: {
        Row: {
          created_at: string | null
          id: string
          item_name: string
          item_rarity: string
          player_id: string
          sell_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_name: string
          item_rarity: string
          player_id: string
          sell_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          item_name?: string
          item_rarity?: string
          player_id?: string
          sell_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "squid_player_items_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "squid_players"
            referencedColumns: ["id"]
          },
        ]
      }
      squid_players: {
        Row: {
          balance: number | null
          casino_admin_mode: boolean | null
          created_at: string | null
          first_name: string | null
          gift_count: number
          id: string
          is_premium: boolean | null
          last_bp_claim: string | null
          last_daily_claim: string | null
          last_rob_time: string | null
          last_si_claim: string | null
          owned_prefixes: string[] | null
          prefix: string | null
          premium_expires_at: string | null
          referral_count: number
          referrer_id: string | null
          telegram_id: number
          total_losses: number | null
          total_wins: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          balance?: number | null
          casino_admin_mode?: boolean | null
          created_at?: string | null
          first_name?: string | null
          gift_count?: number
          id?: string
          is_premium?: boolean | null
          last_bp_claim?: string | null
          last_daily_claim?: string | null
          last_rob_time?: string | null
          last_si_claim?: string | null
          owned_prefixes?: string[] | null
          prefix?: string | null
          premium_expires_at?: string | null
          referral_count?: number
          referrer_id?: string | null
          telegram_id: number
          total_losses?: number | null
          total_wins?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          balance?: number | null
          casino_admin_mode?: boolean | null
          created_at?: string | null
          first_name?: string | null
          gift_count?: number
          id?: string
          is_premium?: boolean | null
          last_bp_claim?: string | null
          last_daily_claim?: string | null
          last_rob_time?: string | null
          last_si_claim?: string | null
          owned_prefixes?: string[] | null
          prefix?: string | null
          premium_expires_at?: string | null
          referral_count?: number
          referrer_id?: string | null
          telegram_id?: number
          total_losses?: number | null
          total_wins?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "squid_players_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "squid_players"
            referencedColumns: ["id"]
          },
        ]
      }
      squid_prefixes: {
        Row: {
          created_at: string | null
          id: string
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      squid_promo_codes: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          expires_at: string | null
          id: string
          max_uses: number | null
          reward_amount: number
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          reward_amount: number
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          reward_amount?: number
        }
        Relationships: []
      }
      squid_promo_redemptions: {
        Row: {
          id: string
          player_id: string | null
          promo_code_id: string | null
          redeemed_at: string | null
        }
        Insert: {
          id?: string
          player_id?: string | null
          promo_code_id?: string | null
          redeemed_at?: string | null
        }
        Update: {
          id?: string
          player_id?: string | null
          promo_code_id?: string | null
          redeemed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "squid_promo_redemptions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "squid_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squid_promo_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "squid_promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      support_chats: {
        Row: {
          created_at: string
          id: string
          status: string
          telegram_chat_id: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          telegram_chat_id?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          telegram_chat_id?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          message: string
          sender_type: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          message: string
          sender_type: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "support_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment: {
        Args: { current_value: number; value: number }
        Returns: number
      }
      increment_balance: {
        Args: {
          amount: number
          player_row: Database["public"]["Tables"]["squid_players"]["Row"]
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
