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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      campaigns: {
        Row: {
          body_he: string | null
          created_at: string
          ends_at: string | null
          headline_he: string | null
          id: string
          is_active: boolean
          kind: string
          name: string
          offer_price_excl_vat: number | null
          product_id: string
          starts_at: string
        }
        Insert: {
          body_he?: string | null
          created_at?: string
          ends_at?: string | null
          headline_he?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          offer_price_excl_vat?: number | null
          product_id: string
          starts_at?: string
        }
        Update: {
          body_he?: string | null
          created_at?: string
          ends_at?: string | null
          headline_he?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          offer_price_excl_vat?: number | null
          product_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carpenters: {
        Row: {
          business_name: string
          city: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          first_seen_at: string | null
          id: string
          is_active: boolean
          last_seen_at: string | null
          notes: string | null
          phone: string | null
          token: string
          updated_at: string
        }
        Insert: {
          business_name: string
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          first_seen_at?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          notes?: string | null
          phone?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          business_name?: string
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          first_seen_at?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          notes?: string | null
          phone?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name_ar: string | null
          name_en: string | null
          name_he: string
          parent_category_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en?: string | null
          name_he: string
          parent_category_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en?: string | null
          name_he?: string
          parent_category_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_events: {
        Row: {
          campaign_id: string | null
          carpenter_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          product_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          carpenter_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          carpenter_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_events_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_intents: {
        Row: {
          campaign_id: string | null
          carpenter_id: string
          created_at: string
          id: string
          note: string | null
          product_id: string
          quantity: number
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          carpenter_id: string
          created_at?: string
          id?: string
          note?: string | null
          product_id: string
          quantity: number
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          carpenter_id?: string
          created_at?: string
          id?: string
          note?: string | null
          product_id?: string
          quantity?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_intents_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_intents_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_intents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total_excl_vat: number
          order_id: string
          product_id: string | null
          product_name_en: string | null
          product_name_he: string
          quantity: number
          unit_price_excl_vat: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total_excl_vat: number
          order_id: string
          product_id?: string | null
          product_name_en?: string | null
          product_name_he: string
          quantity: number
          unit_price_excl_vat: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total_excl_vat?: number
          order_id?: string
          product_id?: string | null
          product_name_en?: string | null
          product_name_he?: string
          quantity?: number
          unit_price_excl_vat?: number
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
          address: string | null
          business_name: string | null
          campaign_id: string | null
          carpenter_id: string | null
          city: string | null
          confirmed_at: string | null
          confirmed_subtotal_excl_vat: number | null
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          order_number: string
          payment_method: string | null
          status: string | null
          subtotal_excl_vat: number
          supplier_note: string | null
          total_amount: number
          updated_at: string | null
          vat_rate: number
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          campaign_id?: string | null
          carpenter_id?: string | null
          city?: string | null
          confirmed_at?: string | null
          confirmed_subtotal_excl_vat?: number | null
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string | null
          status?: string | null
          subtotal_excl_vat?: number
          supplier_note?: string | null
          total_amount: number
          updated_at?: string | null
          vat_rate?: number
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          campaign_id?: string | null
          carpenter_id?: string | null
          city?: string | null
          confirmed_at?: string | null
          confirmed_subtotal_excl_vat?: number | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          status?: string | null
          subtotal_excl_vat?: number
          supplier_note?: string | null
          total_amount?: number
          updated_at?: string | null
          vat_rate?: number
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price_excl_vat: number
          category_id: string | null
          created_at: string | null
          description_en: string | null
          description_he: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name_ar: string | null
          name_en: string | null
          name_he: string
          rating: number | null
          return_rate: number | null
          sku: string | null
          stock_qty: number | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          base_price_excl_vat: number
          category_id?: string | null
          created_at?: string | null
          description_en?: string | null
          description_he?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name_ar?: string | null
          name_en?: string | null
          name_he: string
          rating?: number | null
          return_rate?: number | null
          sku?: string | null
          stock_qty?: number | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          base_price_excl_vat?: number
          category_id?: string | null
          created_at?: string | null
          description_en?: string | null
          description_he?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name_ar?: string | null
          name_en?: string | null
          name_he?: string
          rating?: number | null
          return_rate?: number | null
          sku?: string | null
          stock_qty?: number | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_approved: boolean | null
          lang: string | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_approved?: boolean | null
          lang?: string | null
          phone?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_approved?: boolean | null
          lang?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      returns: {
        Row: {
          approved_by: string | null
          carpenter_id: string
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          reason: string | null
          reason_detail: string | null
          refund_amount_excl_vat: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          carpenter_id: string
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity: number
          reason?: string | null
          reason_detail?: string | null
          refund_amount_excl_vat: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          carpenter_id?: string
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          reason_detail?: string | null
          refund_amount_excl_vat?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          carpenter_id: string
          comment: string | null
          created_at: string | null
          id: string
          product_id: string
          rating: number
        }
        Insert: {
          carpenter_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          product_id: string
          rating: number
        }
        Update: {
          carpenter_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          product_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_products: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          product_id: string
          supplier_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id: string
          supplier_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          business_id: string
          city: string | null
          company_name: string
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          is_verified: boolean | null
          phone: string | null
          rating: number | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          city?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          phone?: string | null
          rating?: number | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          city?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          phone?: string | null
          rating?: number | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      volume_pricing: {
        Row: {
          created_at: string | null
          id: string
          max_qty: number
          min_qty: number
          product_id: string
          unit_price_excl_vat: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_qty: number
          min_qty: number
          product_id: string
          unit_price_excl_vat: number
        }
        Update: {
          created_at?: string | null
          id?: string
          max_qty?: number
          min_qty?: number
          product_id?: string
          unit_price_excl_vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "volume_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
