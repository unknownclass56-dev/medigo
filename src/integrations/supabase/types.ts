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
      addresses: {
        Row: {
          city: string
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          lat: number
          line1: string
          line2: string | null
          lng: number
          pincode: string | null
          state: string | null
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          lat: number
          line1: string
          line2?: string | null
          lng: number
          pincode?: string | null
          state?: string | null
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          lat?: number
          line1?: string
          line2?: string | null
          lng?: number
          pincode?: string | null
          state?: string | null
          user_id?: string
        }
        Relationships: []
      }
      complaints: {
        Row: {
          admin_response: string | null
          created_at: string
          id: string
          message: string
          order_id: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          id?: string
          message: string
          order_id?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          id?: string
          message?: string
          order_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_partners: {
        Row: {
          aadhaar_no: string | null
          aadhaar_path: string | null
          approved: boolean
          created_at: string
          current_lat: number | null
          current_lng: number | null
          dl_path: string | null
          driving_license_no: string | null
          id: string
          is_online: boolean
          kyc_status: string
          kyc_submitted_at: string | null
          pan_no: string | null
          pan_path: string | null
          rating: number | null
          rc_path: string | null
          selfie_path: string | null
          total_deliveries: number
          updated_at: string
          user_id: string
          vehicle_no: string | null
          vehicle_rc_no: string | null
          vehicle_type: string | null
        }
        Insert: {
          aadhaar_no?: string | null
          aadhaar_path?: string | null
          approved?: boolean
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          dl_path?: string | null
          driving_license_no?: string | null
          id?: string
          is_online?: boolean
          kyc_status?: string
          kyc_submitted_at?: string | null
          pan_no?: string | null
          pan_path?: string | null
          rating?: number | null
          rc_path?: string | null
          selfie_path?: string | null
          total_deliveries?: number
          updated_at?: string
          user_id: string
          vehicle_no?: string | null
          vehicle_rc_no?: string | null
          vehicle_type?: string | null
        }
        Update: {
          aadhaar_no?: string | null
          aadhaar_path?: string | null
          approved?: boolean
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          dl_path?: string | null
          driving_license_no?: string | null
          id?: string
          is_online?: boolean
          kyc_status?: string
          kyc_submitted_at?: string | null
          pan_no?: string | null
          pan_path?: string | null
          rating?: number | null
          rc_path?: string | null
          selfie_path?: string | null
          total_deliveries?: number
          updated_at?: string
          user_id?: string
          vehicle_no?: string | null
          vehicle_rc_no?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      delivery_tracking: {
        Row: {
          delivery_partner_id: string | null
          id: string
          lat: number
          lng: number
          order_id: string
          recorded_at: string
        }
        Insert: {
          delivery_partner_id?: string | null
          id?: string
          lat: number
          lng: number
          order_id: string
          recorded_at?: string
        }
        Update: {
          delivery_partner_id?: string | null
          id?: string
          lat?: number
          lng?: number
          order_id?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_delivery_partner_id_fkey"
            columns: ["delivery_partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          generic_name: string | null
          id: string
          image_url: string | null
          manufacturer: string | null
          name: string
          requires_prescription: boolean
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          manufacturer?: string | null
          name: string
          requires_prescription?: boolean
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          manufacturer?: string | null
          name?: string
          requires_prescription?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          medicine_id: string
          medicine_name: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          medicine_id: string
          medicine_name: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          id?: string
          medicine_id?: string
          medicine_name?: string
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_routing_log: {
        Row: {
          attempt_no: number
          created_at: string
          id: string
          order_id: string
          outcome: string
          pharmacy_id: string | null
          reason: string | null
        }
        Insert: {
          attempt_no: number
          created_at?: string
          id?: string
          order_id: string
          outcome: string
          pharmacy_id?: string | null
          reason?: string | null
        }
        Update: {
          attempt_no?: number
          created_at?: string
          id?: string
          order_id?: string
          outcome?: string
          pharmacy_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_routing_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_routing_log_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string
          delivery_address: Json
          delivery_charge: number
          delivery_lat: number
          delivery_lng: number
          delivery_otp: string | null
          delivery_partner_id: string | null
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          pharmacy_id: string | null
          pharmacy_offer_expires_at: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          delivery_address: Json
          delivery_charge?: number
          delivery_lat: number
          delivery_lng: number
          delivery_otp?: string | null
          delivery_partner_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pharmacy_id?: string | null
          pharmacy_offer_expires_at?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          delivery_address?: Json
          delivery_charge?: number
          delivery_lat?: number
          delivery_lng?: number
          delivery_otp?: string | null
          delivery_partner_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pharmacy_id?: string | null
          pharmacy_offer_expires_at?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_delivery_partner_id_fkey"
            columns: ["delivery_partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacies: {
        Row: {
          address: string
          city: string | null
          close_time: string | null
          created_at: string
          gst_no: string | null
          id: string
          is_open: boolean
          kyc_status: string
          kyc_submitted_at: string | null
          lat: number
          license_no: string | null
          lng: number
          name: string
          open_time: string | null
          owner_aadhaar: string | null
          owner_id: string
          phone: string | null
          pincode: string | null
          shop_photo_path: string | null
          status: Database["public"]["Enums"]["pharmacy_status"]
          updated_at: string
        }
        Insert: {
          address: string
          city?: string | null
          close_time?: string | null
          created_at?: string
          gst_no?: string | null
          id?: string
          is_open?: boolean
          kyc_status?: string
          kyc_submitted_at?: string | null
          lat: number
          license_no?: string | null
          lng: number
          name: string
          open_time?: string | null
          owner_aadhaar?: string | null
          owner_id: string
          phone?: string | null
          pincode?: string | null
          shop_photo_path?: string | null
          status?: Database["public"]["Enums"]["pharmacy_status"]
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string | null
          close_time?: string | null
          created_at?: string
          gst_no?: string | null
          id?: string
          is_open?: boolean
          kyc_status?: string
          kyc_submitted_at?: string | null
          lat?: number
          license_no?: string | null
          lng?: number
          name?: string
          open_time?: string | null
          owner_aadhaar?: string | null
          owner_id?: string
          phone?: string | null
          pincode?: string | null
          shop_photo_path?: string | null
          status?: Database["public"]["Enums"]["pharmacy_status"]
          updated_at?: string
        }
        Relationships: []
      }
      pharmacy_inventory: {
        Row: {
          expiry_date: string | null
          id: string
          medicine_id: string
          pharmacy_id: string
          price: number
          stock: number
          updated_at: string
        }
        Insert: {
          expiry_date?: string | null
          id?: string
          medicine_id: string
          pharmacy_id: string
          price: number
          stock?: number
          updated_at?: string
        }
        Update: {
          expiry_date?: string | null
          id?: string
          medicine_id?: string
          pharmacy_id?: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_inventory_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_inventory_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          commission_pct: number
          delivery_base_charge: number
          delivery_per_km: number
          free_delivery_threshold: number
          id: number
          max_delivery_radius_km: number
          pharmacy_accept_window_seconds: number
        }
        Insert: {
          commission_pct?: number
          delivery_base_charge?: number
          delivery_per_km?: number
          free_delivery_threshold?: number
          id?: number
          max_delivery_radius_km?: number
          pharmacy_accept_window_seconds?: number
        }
        Update: {
          commission_pct?: number
          delivery_base_charge?: number
          delivery_per_km?: number
          free_delivery_threshold?: number
          id?: number
          max_delivery_radius_km?: number
          pharmacy_accept_window_seconds?: number
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          created_at: string
          customer_id: string
          file_path: string
          id: string
          order_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          file_path: string
          id?: string
          order_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          file_path?: string
          id?: string
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
    }
    Enums: {
      app_role: "customer" | "pharmacy_owner" | "delivery_partner" | "admin"
      order_status:
        | "pending_pharmacy"
        | "pharmacy_accepted"
        | "pharmacy_rejected"
        | "preparing"
        | "awaiting_pickup"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "no_pharmacy_available"
      payment_method: "cod" | "razorpay" | "pay_on_delivery"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      pharmacy_status: "pending" | "approved" | "rejected" | "suspended"
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
      app_role: ["customer", "pharmacy_owner", "delivery_partner", "admin"],
      order_status: [
        "pending_pharmacy",
        "pharmacy_accepted",
        "pharmacy_rejected",
        "preparing",
        "awaiting_pickup",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "no_pharmacy_available",
      ],
      payment_method: ["cod", "razorpay", "pay_on_delivery"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      pharmacy_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
