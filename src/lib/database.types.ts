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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          supplier_id: string | null
          target_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          supplier_id?: string | null
          target_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          supplier_id?: string | null
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_login_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip: string
          succeeded: boolean
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip: string
          succeeded: boolean
        }
        Update: {
          attempted_at?: string
          id?: string
          ip?: string
          succeeded?: boolean
        }
        Relationships: []
      }
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
          active_before_delete: boolean | null
          address: string | null
          business_name: string
          city: string | null
          contact_name: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          email_verified_at: string | null
          first_seen_at: string | null
          id: string
          is_active: boolean
          last_seen_at: string | null
          marketing_consent: boolean
          notes: string | null
          phone: string | null
          source: string
          terms_accepted_at: string | null
          terms_version: string | null
          token: string
          updated_at: string
        }
        Insert: {
          active_before_delete?: boolean | null
          address?: string | null
          business_name: string
          city?: string | null
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          email_verified_at?: string | null
          first_seen_at?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          marketing_consent?: boolean
          notes?: string | null
          phone?: string | null
          source?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          active_before_delete?: boolean | null
          address?: string | null
          business_name?: string
          city?: string | null
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          email_verified_at?: string | null
          first_seen_at?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          marketing_consent?: boolean
          notes?: string | null
          phone?: string | null
          source?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name_ar: string | null
          name_en: string | null
          name_he: string
          parent_category_id: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en?: string | null
          name_he: string
          parent_category_id?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string | null
          name_en?: string | null
          name_he?: string
          parent_category_id?: string | null
          sort_order?: number
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
      contact_clicks: {
        Row: {
          carpenter_id: string
          channel: string
          created_at: string
          id: string
          order_id: string | null
          quote_request_id: string | null
          supplier_id: string | null
        }
        Insert: {
          carpenter_id: string
          channel: string
          created_at?: string
          id?: string
          order_id?: string | null
          quote_request_id?: string | null
          supplier_id?: string | null
        }
        Update: {
          carpenter_id?: string
          channel?: string
          created_at?: string
          id?: string
          order_id?: string | null
          quote_request_id?: string | null
          supplier_id?: string | null
        }
        Relationships: []
      }
      email_outbox: {
        Row: {
          attempts: number
          created_at: string
          dedupe_key: string | null
          delivery_updated_at: string | null
          html: string
          id: string
          is_test: boolean
          kind: string
          last_error: string | null
          locked_at: string | null
          next_attempt_at: string
          notification_id: string | null
          provider_id: string | null
          reply_to: string | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          delivery_updated_at?: string | null
          html: string
          id?: string
          is_test?: boolean
          kind: string
          last_error?: string | null
          locked_at?: string | null
          next_attempt_at?: string
          notification_id?: string | null
          provider_id?: string | null
          reply_to?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
        }
        Update: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          delivery_updated_at?: string | null
          html?: string
          id?: string
          is_test?: boolean
          kind?: string
          last_error?: string | null
          locked_at?: string | null
          next_attempt_at?: string
          notification_id?: string | null
          provider_id?: string | null
          reply_to?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      email_suppressions: {
        Row: {
          created_at: string
          detail: string | null
          email: string
          reason: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          email: string
          reason: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          email?: string
          reason?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          changes: Json
          created_at: string
          created_by: string
          file_name: string | null
          id: string
          summary: Json
          supplier_id: string
          undone_at: string | null
        }
        Insert: {
          changes?: Json
          created_at?: string
          created_by: string
          file_name?: string | null
          id?: string
          summary?: Json
          supplier_id: string
          undone_at?: string | null
        }
        Update: {
          changes?: Json
          created_at?: string
          created_by?: string
          file_name?: string | null
          id?: string
          summary?: Json
          supplier_id?: string
          undone_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      login_codes: {
        Row: {
          attempts: number
          carpenter_id: string
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          carpenter_id: string
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          carpenter_id?: string
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_codes_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          carpenter_id: string
          carpenter_last_read_at: string | null
          contact_request_id: string | null
          created_at: string
          id: string
          last_message_at: string
          last_sender: string
          order_id: string | null
          product_id: string | null
          quote_request_id: string | null
          status: string
          subject: string
          supplier_id: string
          supplier_last_read_at: string | null
        }
        Insert: {
          carpenter_id: string
          carpenter_last_read_at?: string | null
          contact_request_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          last_sender: string
          order_id?: string | null
          product_id?: string | null
          quote_request_id?: string | null
          status?: string
          subject: string
          supplier_id: string
          supplier_last_read_at?: string | null
        }
        Update: {
          carpenter_id?: string
          carpenter_last_read_at?: string | null
          contact_request_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          last_sender?: string
          order_id?: string | null
          product_id?: string | null
          quote_request_id?: string | null
          status?: string
          subject?: string
          supplier_id?: string
          supplier_last_read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_contact_request_id_fkey"
            columns: ["contact_request_id"]
            isOneToOne: true
            referencedRelation: "supplier_contact_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          client_id: string | null
          created_at: string
          id: string
          sender: string
          thread_id: string
        }
        Insert: {
          body: string
          client_id?: string | null
          created_at?: string
          id?: string
          sender: string
          thread_id: string
        }
        Update: {
          body?: string
          client_id?: string | null
          created_at?: string
          id?: string
          sender?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      metzion_listings: {
        Row: {
          carpenter_id: string
          category: string
          city: string
          condition: string
          contact_name: string
          contact_phone: string
          created_at: string
          deal_type: string
          description: string | null
          expires_at: string
          id: string
          images: string[]
          price_per_unit: number | null
          quantity: number
          regions: string[]
          removed_reason: string | null
          sold_at: string | null
          status: string
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          carpenter_id: string
          category: string
          city: string
          condition: string
          contact_name: string
          contact_phone: string
          created_at?: string
          deal_type: string
          description?: string | null
          expires_at?: string
          id?: string
          images: string[]
          price_per_unit?: number | null
          quantity: number
          regions?: string[]
          removed_reason?: string | null
          sold_at?: string | null
          status?: string
          title: string
          unit?: string
          updated_at?: string
        }
        Update: {
          carpenter_id?: string
          category?: string
          city?: string
          condition?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          deal_type?: string
          description?: string | null
          expires_at?: string
          id?: string
          images?: string[]
          price_per_unit?: number | null
          quantity?: number
          regions?: string[]
          removed_reason?: string | null
          sold_at?: string | null
          status?: string
          title?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metzion_listings_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
        ]
      }
      metzion_reports: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          note: string | null
          reason: string
          reporter_id: string | null
          resolved_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          note?: string | null
          reason: string
          reporter_id?: string | null
          resolved_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          note?: string | null
          reason?: string
          reporter_id?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metzion_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "metzion_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metzion_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          carpenter_id: string | null
          created_at: string
          id: string
          kind: string
          link: string
          order_id: string | null
          quote_request_id: string | null
          read_at: string | null
          recipient_side: string
          supplier_id: string | null
          thread_id: string | null
          title: string
        }
        Insert: {
          body?: string | null
          carpenter_id?: string | null
          created_at?: string
          id?: string
          kind: string
          link: string
          order_id?: string | null
          quote_request_id?: string | null
          read_at?: string | null
          recipient_side: string
          supplier_id?: string | null
          thread_id?: string | null
          title: string
        }
        Update: {
          body?: string | null
          carpenter_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string
          order_id?: string | null
          quote_request_id?: string | null
          read_at?: string | null
          recipient_side?: string
          supplier_id?: string | null
          thread_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
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
          supplier_id: string | null
          unavailable: boolean
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
          supplier_id?: string | null
          unavailable?: boolean
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
          supplier_id?: string | null
          unavailable?: boolean
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
          {
            foreignKeyName: "order_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
          carpenter_seen_at: string | null
          checkout_id: string | null
          city: string | null
          confirmed_at: string | null
          confirmed_subtotal_excl_vat: number | null
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          delivered_by: string | null
          expected_delivery_on: string | null
          id: string
          notes: string | null
          order_number: string
          payment_method: string | null
          processing_at: string | null
          shipped_at: string | null
          short_number: number
          status: string | null
          subtotal_excl_vat: number
          supplier_id: string | null
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
          carpenter_seen_at?: string | null
          checkout_id?: string | null
          city?: string | null
          confirmed_at?: string | null
          confirmed_subtotal_excl_vat?: number | null
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          delivered_by?: string | null
          expected_delivery_on?: string | null
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string | null
          processing_at?: string | null
          shipped_at?: string | null
          short_number?: number
          status?: string | null
          subtotal_excl_vat?: number
          supplier_id?: string | null
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
          carpenter_seen_at?: string | null
          checkout_id?: string | null
          city?: string | null
          confirmed_at?: string | null
          confirmed_subtotal_excl_vat?: number | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          delivered_by?: string | null
          expected_delivery_on?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          processing_at?: string | null
          shipped_at?: string | null
          short_number?: number
          status?: string | null
          subtotal_excl_vat?: number
          supplier_id?: string | null
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
          {
            foreignKeyName: "orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_documents: {
        Row: {
          content_type: string | null
          created_at: string | null
          doc_type: string
          extracted_text: string | null
          file_name: string
          file_size_kb: number | null
          file_url: string
          id: string
          product_id: string
          supplier_id: string
          title_he: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          doc_type: string
          extracted_text?: string | null
          file_name: string
          file_size_kb?: number | null
          file_url: string
          id?: string
          product_id: string
          supplier_id: string
          title_he: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          doc_type?: string
          extracted_text?: string | null
          file_name?: string
          file_size_kb?: number | null
          file_url?: string
          id?: string
          product_id?: string
          supplier_id?: string
          title_he?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_documents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_specifications: {
        Row: {
          created_at: string
          id: string
          is_verified: boolean
          product_id: string
          source_document_id: string | null
          source_page_or_section: string | null
          spec_key: string
          spec_unit: string | null
          spec_value: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified?: boolean
          product_id: string
          source_document_id?: string | null
          source_page_or_section?: string | null
          spec_key: string
          spec_unit?: string | null
          spec_value: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_verified?: boolean
          product_id?: string
          source_document_id?: string | null
          source_page_or_section?: string | null
          spec_key?: string
          spec_unit?: string | null
          spec_value?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_specifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_specifications_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "supplier_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      product_view_counts: {
        Row: {
          last_viewed_at: string
          product_id: string
          views: number
        }
        Insert: {
          last_viewed_at?: string
          product_id: string
          views?: number
        }
        Update: {
          last_viewed_at?: string
          product_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_view_counts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json
          base_unit: string
          brand: string | null
          category_id: string | null
          created_at: string | null
          created_by_supplier_id: string | null
          description_en: string | null
          description_he: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          mpn: string | null
          name_ar: string | null
          name_en: string | null
          name_he: string
          updated_at: string | null
        }
        Insert: {
          attributes?: Json
          base_unit?: string
          brand?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by_supplier_id?: string | null
          description_en?: string | null
          description_he?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          mpn?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_he: string
          updated_at?: string | null
        }
        Update: {
          attributes?: Json
          base_unit?: string
          brand?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by_supplier_id?: string | null
          description_en?: string | null
          description_he?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          mpn?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_he?: string
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
            foreignKeyName: "products_created_by_supplier_id_fkey"
            columns: ["created_by_supplier_id"]
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
      promo_events: {
        Row: {
          carpenter_id: string | null
          created_at: string
          id: number
          kind: string
          placement: string
          promo_week_id: string
        }
        Insert: {
          carpenter_id?: string | null
          created_at?: string
          id?: never
          kind: string
          placement: string
          promo_week_id: string
        }
        Update: {
          carpenter_id?: string | null
          created_at?: string
          id?: never
          kind?: string
          placement?: string
          promo_week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_events_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_events_promo_week_id_fkey"
            columns: ["promo_week_id"]
            isOneToOne: false
            referencedRelation: "promo_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_weeks: {
        Row: {
          created_at: string
          decided_at: string | null
          id: string
          note: string | null
          price_excl_vat: number
          product_id: string
          show_price: boolean
          status: string
          supplier_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          id?: string
          note?: string | null
          price_excl_vat: number
          product_id: string
          show_price?: boolean
          status?: string
          supplier_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          id?: string
          note?: string | null
          price_excl_vat?: number
          product_id?: string
          show_price?: boolean
          status?: string
          supplier_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_weeks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_weeks_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          answered_at: string | null
          carpenter_id: string
          client_request_id: string | null
          created_at: string
          decided_at: string | null
          id: string
          kind: string | null
          note: string | null
          order_id: string | null
          product_id: string
          quantity: number
          quoted_unit_price_excl_vat: number | null
          status: string
          supplier_id: string
          supplier_note: string | null
          valid_until: string | null
        }
        Insert: {
          answered_at?: string | null
          carpenter_id: string
          client_request_id?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          kind?: string | null
          note?: string | null
          order_id?: string | null
          product_id: string
          quantity: number
          quoted_unit_price_excl_vat?: number | null
          status?: string
          supplier_id: string
          supplier_note?: string | null
          valid_until?: string | null
        }
        Update: {
          answered_at?: string | null
          carpenter_id?: string
          client_request_id?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          kind?: string | null
          note?: string | null
          order_id?: string | null
          product_id?: string
          quantity?: number
          quoted_unit_price_excl_vat?: number | null
          status?: string
          supplier_id?: string
          supplier_note?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_log: {
        Row: {
          created_at: string
          key: string
        }
        Insert: {
          created_at?: string
          key: string
        }
        Update: {
          created_at?: string
          key?: string
        }
        Relationships: []
      }
      raffle_draws: {
        Row: {
          carpenter_id: string | null
          drawn_at: string
          id: string
          included_test: boolean
          notified_at: string | null
          pool_size: number
          prize: string | null
          winner_email: string | null
          winner_name: string
        }
        Insert: {
          carpenter_id?: string | null
          drawn_at?: string
          id?: string
          included_test?: boolean
          notified_at?: string | null
          pool_size: number
          prize?: string | null
          winner_email?: string | null
          winner_name: string
        }
        Update: {
          carpenter_id?: string | null
          drawn_at?: string
          id?: string
          included_test?: boolean
          notified_at?: string | null
          pool_size?: number
          prize?: string | null
          winner_email?: string | null
          winner_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_draws_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
        ]
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
      supplier_contact_requests: {
        Row: {
          action_type: string
          carpenter_id: string
          created_at: string
          id: string
          message: string
          product_id: string | null
          supplier_id: string
        }
        Insert: {
          action_type: string
          carpenter_id: string
          created_at?: string
          id?: string
          message: string
          product_id?: string | null
          supplier_id: string
        }
        Update: {
          action_type?: string
          carpenter_id?: string
          created_at?: string
          id?: string
          message?: string
          product_id?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contact_requests_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_contact_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_contact_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_documents: {
        Row: {
          categories: string[] | null
          description: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          indexed_at: string | null
          is_active: boolean
          language: string
          supplier_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          categories?: string[] | null
          description?: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          indexed_at?: string | null
          is_active?: boolean
          language?: string
          supplier_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          categories?: string[] | null
          description?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          indexed_at?: string | null
          is_active?: boolean
          language?: string
          supplier_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_documents_products: {
        Row: {
          created_at: string
          document_id: string
          id: string
          product_id: string
          section_reference: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          product_id: string
          section_reference?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          product_id?: string
          section_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_products_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "supplier_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_documents_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_offers: {
        Row: {
          active_before_delete: boolean | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          lead_time_days: number | null
          min_order_qty: number
          pack_label: string | null
          pack_qty: number | null
          price_excl_vat: number
          product_id: string
          source: string
          special_price_excl_vat: number | null
          special_price_min_qty: number | null
          special_price_pack_qty: number | null
          stock_qty: number
          supplier_id: string
          supplier_sku: string | null
          updated_at: string
        }
        Insert: {
          active_before_delete?: boolean | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          min_order_qty?: number
          pack_label?: string | null
          pack_qty?: number | null
          price_excl_vat: number
          product_id: string
          source?: string
          special_price_excl_vat?: number | null
          special_price_min_qty?: number | null
          special_price_pack_qty?: number | null
          stock_qty?: number
          supplier_id: string
          supplier_sku?: string | null
          updated_at?: string
        }
        Update: {
          active_before_delete?: boolean | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          min_order_qty?: number
          pack_label?: string | null
          pack_qty?: number | null
          price_excl_vat?: number
          product_id?: string
          source?: string
          special_price_excl_vat?: number | null
          special_price_min_qty?: number | null
          special_price_pack_qty?: number | null
          stock_qty?: number
          supplier_id?: string
          supplier_sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_offers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
          decided_at: string | null
          default_lead_time_days: number | null
          delivery_fee_excl_vat: number | null
          delivery_regions: string[]
          email: string | null
          free_delivery_from_excl_vat: number | null
          id: string
          is_verified: boolean | null
          logo_url: string | null
          min_order_value_excl_vat: number | null
          order_cc_emails: string[]
          payment_terms: string[]
          phone: string | null
          phone_key: string | null
          pickup_address: string | null
          price_mode: string
          rating: number | null
          sells_note: string | null
          source: string
          status: string
          terms_accepted_at: string | null
          terms_version: string | null
          token: string
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
          decided_at?: string | null
          default_lead_time_days?: number | null
          delivery_fee_excl_vat?: number | null
          delivery_regions?: string[]
          email?: string | null
          free_delivery_from_excl_vat?: number | null
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          min_order_value_excl_vat?: number | null
          order_cc_emails?: string[]
          payment_terms?: string[]
          phone?: string | null
          phone_key?: string | null
          pickup_address?: string | null
          price_mode?: string
          rating?: number | null
          sells_note?: string | null
          source?: string
          status?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          token?: string
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
          decided_at?: string | null
          default_lead_time_days?: number | null
          delivery_fee_excl_vat?: number | null
          delivery_regions?: string[]
          email?: string | null
          free_delivery_from_excl_vat?: number | null
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          min_order_value_excl_vat?: number | null
          order_cc_emails?: string[]
          payment_terms?: string[]
          phone?: string | null
          phone_key?: string | null
          pickup_address?: string | null
          price_mode?: string
          rating?: number | null
          sells_note?: string | null
          source?: string
          status?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          token?: string
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
      work_conversations: {
        Row: {
          applicant_id: string
          applicant_last_read_at: string | null
          blocked_by: string | null
          created_at: string
          id: string
          job_id: string
          last_message_at: string
          last_sender: string
          poster_id: string
          poster_last_read_at: string | null
        }
        Insert: {
          applicant_id: string
          applicant_last_read_at?: string | null
          blocked_by?: string | null
          created_at?: string
          id?: string
          job_id: string
          last_message_at?: string
          last_sender: string
          poster_id: string
          poster_last_read_at?: string | null
        }
        Update: {
          applicant_id?: string
          applicant_last_read_at?: string | null
          blocked_by?: string | null
          created_at?: string
          id?: string
          job_id?: string
          last_message_at?: string
          last_sender?: string
          poster_id?: string
          poster_last_read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_conversations_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "work_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_conversations_poster_id_fkey"
            columns: ["poster_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
        ]
      }
      work_job_reports: {
        Row: {
          created_at: string
          id: string
          job_id: string
          note: string | null
          reason: string
          reporter_id: string | null
          resolved_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          note?: string | null
          reason: string
          reporter_id?: string | null
          resolved_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          note?: string | null
          reason?: string
          reporter_id?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_job_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "work_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_job_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
        ]
      }
      work_jobs: {
        Row: {
          carpenter_id: string
          close_outcome: string | null
          closed_at: string | null
          closed_with_carpenter_id: string | null
          created_at: string
          description: string
          due_date: string
          expires_at: string
          id: string
          image_url: string | null
          job_type: string
          material: string | null
          quantity: string
          region: string
          removed_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          carpenter_id: string
          close_outcome?: string | null
          closed_at?: string | null
          closed_with_carpenter_id?: string | null
          created_at?: string
          description: string
          due_date: string
          expires_at: string
          id?: string
          image_url?: string | null
          job_type: string
          material?: string | null
          quantity: string
          region: string
          removed_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          carpenter_id?: string
          close_outcome?: string | null
          closed_at?: string | null
          closed_with_carpenter_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          job_type?: string
          material?: string | null
          quantity?: string
          region?: string
          removed_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_jobs_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_jobs_closed_with_carpenter_id_fkey"
            columns: ["closed_with_carpenter_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
        ]
      }
      work_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          sender: string
        }
        Insert: {
          body?: string
          conversation_id: string
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          sender: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "work_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_notifications: {
        Row: {
          carpenter_id: string
          conversation_id: string | null
          created_at: string
          id: string
          job_id: string | null
          kind: string
          status: string
        }
        Insert: {
          carpenter_id: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          kind: string
          status: string
        }
        Update: {
          carpenter_id?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_notifications_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: false
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "work_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "work_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      work_profiles: {
        Row: {
          carpenter_id: string
          created_at: string
          job_types: string[]
          machines: string | null
          notify_email: boolean
          regions: string[]
          updated_at: string
        }
        Insert: {
          carpenter_id: string
          created_at?: string
          job_types?: string[]
          machines?: string | null
          notify_email?: boolean
          regions?: string[]
          updated_at?: string
        }
        Update: {
          carpenter_id?: string
          created_at?: string
          job_types?: string[]
          machines?: string | null
          notify_email?: boolean
          regions?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_profiles_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: true
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
        ]
      }
      work_subscriptions: {
        Row: {
          cancel_fee_excl_vat: number | null
          cancelled_at: string | null
          carpenter_id: string
          created_at: string
          ends_at: string | null
          installments: number | null
          payment_ref: string | null
          plan: string | null
          price_excl_vat: number | null
          refund_excl_vat: number | null
          starts_at: string | null
          status: string
          updated_at: string
          vat_rate: number | null
        }
        Insert: {
          cancel_fee_excl_vat?: number | null
          cancelled_at?: string | null
          carpenter_id: string
          created_at?: string
          ends_at?: string | null
          installments?: number | null
          payment_ref?: string | null
          plan?: string | null
          price_excl_vat?: number | null
          refund_excl_vat?: number | null
          starts_at?: string | null
          status: string
          updated_at?: string
          vat_rate?: number | null
        }
        Update: {
          cancel_fee_excl_vat?: number | null
          cancelled_at?: string | null
          carpenter_id?: string
          created_at?: string
          ends_at?: string | null
          installments?: number | null
          payment_ref?: string | null
          plan?: string | null
          price_excl_vat?: number | null
          refund_excl_vat?: number | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_subscriptions_carpenter_id_fkey"
            columns: ["carpenter_id"]
            isOneToOne: true
            referencedRelation: "carpenters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      post_message: {
        Args: { p_body: string; p_client_id?: string; p_sender: string; p_thread: string }
        Returns: Database["public"]["Tables"]["messages"]["Row"]
      }
      claim_email_outbox: {
        Args: { p_ids?: string[]; p_limit?: number }
        Returns: Database["public"]["Tables"]["email_outbox"]["Row"][]
      }
      bump_product_view: {
        Args: { p_product_id: string }
        Returns: undefined
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
