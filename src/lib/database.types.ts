/**
 * Types for the `public` schema of Supabase project ihburmhtcfhwlairyfyf.
 *
 * Written by hand on 2026-09-06 from a live introspection of the database,
 * because `supabase gen types` needs a login the repo does not carry. Once the
 * project is linked (see README), regenerate instead of editing:
 *
 *   npm run db:types
 *
 * Kept deliberately close to what the generator emits so the switch is a
 * drop-in replacement.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'carpenter' | 'supplier' | 'admin'

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name_he: string
          name_en: string | null
          name_ar: string | null
          parent_category_id: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name_he: string
          name_en?: string | null
          name_ar?: string | null
          parent_category_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
        Relationships: []
      }

      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          company_name: string | null
          phone: string | null
          role: UserRole
          is_approved: boolean | null
          lang: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          company_name?: string | null
          phone?: string | null
          role: UserRole
          is_approved?: boolean | null
          lang?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }

      user_profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          role: UserRole
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          role: UserRole
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
        Relationships: []
      }

      suppliers: {
        Row: {
          id: string
          company_name: string
          business_id: string
          contact_name: string | null
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          zip_code: string | null
          is_verified: boolean | null
          rating: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_name: string
          business_id: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          zip_code?: string | null
          is_verified?: boolean | null
          rating?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>
        Relationships: []
      }

      products: {
        Row: {
          id: string
          supplier_id: string | null
          category_id: string | null
          name_he: string
          name_en: string | null
          name_ar: string | null
          description_he: string | null
          description_en: string | null
          image_url: string | null
          base_price_excl_vat: number
          stock_qty: number | null
          is_active: boolean | null
          rating: number | null
          return_rate: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          supplier_id?: string | null
          category_id?: string | null
          name_he: string
          name_en?: string | null
          name_ar?: string | null
          description_he?: string | null
          description_en?: string | null
          image_url?: string | null
          base_price_excl_vat: number
          stock_qty?: number | null
          is_active?: boolean | null
          rating?: number | null
          return_rate?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
        Relationships: []
      }

      supplier_products: {
        Row: {
          id: string
          supplier_id: string
          product_id: string
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          supplier_id: string
          product_id: string
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['supplier_products']['Insert']>
        Relationships: []
      }

      volume_pricing: {
        Row: {
          id: string
          product_id: string
          min_qty: number
          max_qty: number
          unit_price_excl_vat: number
          created_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          min_qty: number
          max_qty: number
          unit_price_excl_vat: number
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['volume_pricing']['Insert']>
        Relationships: []
      }

      orders: {
        Row: {
          id: string
          order_number: string
          customer_name: string
          customer_email: string
          customer_phone: string
          business_name: string | null
          address: string | null
          city: string | null
          zip_code: string | null
          payment_method: string | null
          total_amount: number
          items_json: Json
          status: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          order_number: string
          customer_name: string
          customer_email: string
          customer_phone: string
          business_name?: string | null
          address?: string | null
          city?: string | null
          zip_code?: string | null
          payment_method?: string | null
          total_amount: number
          items_json: Json
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
        Relationships: []
      }

      sub_orders: {
        Row: {
          id: string
          order_id: string
          supplier_id: string
          subtotal_excl_vat: number
          vat_18: number
          subtotal_incl_vat: number
          shipping_fee: number | null
          supplier_commission: number
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          order_id: string
          supplier_id: string
          subtotal_excl_vat: number
          vat_18: number
          subtotal_incl_vat: number
          shipping_fee?: number | null
          supplier_commission: number
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['sub_orders']['Insert']>
        Relationships: []
      }

      order_items: {
        Row: {
          id: string
          sub_order_id: string
          product_id: string
          quantity: number
          unit_price_excl_vat: number
          line_total_excl_vat: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          sub_order_id: string
          product_id: string
          quantity: number
          unit_price_excl_vat: number
          line_total_excl_vat?: number | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
        Relationships: []
      }

      returns: {
        Row: {
          id: string
          sub_order_id: string
          product_id: string
          carpenter_id: string
          quantity: number
          reason: string | null
          reason_detail: string | null
          refund_amount_excl_vat: number
          status: string | null
          approved_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          sub_order_id: string
          product_id: string
          carpenter_id: string
          quantity: number
          reason?: string | null
          reason_detail?: string | null
          refund_amount_excl_vat: number
          status?: string | null
          approved_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['returns']['Insert']>
        Relationships: []
      }

      reviews: {
        Row: {
          id: string
          product_id: string
          carpenter_id: string
          rating: number
          comment: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          carpenter_id: string
          rating: number
          comment?: string | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

/** Convenience aliases for the rows the app reads most. */
export type ProductRow = Database['public']['Tables']['products']['Row']
export type SupplierRow = Database['public']['Tables']['suppliers']['Row']
export type OrderRow = Database['public']['Tables']['orders']['Row']
export type CategoryRow = Database['public']['Tables']['categories']['Row']
export type UserProfileRow = Database['public']['Tables']['user_profiles']['Row']
