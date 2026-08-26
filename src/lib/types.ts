export type UserRole = "carpenter" | "supplier" | "admin";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type ReturnStatus = "requested" | "approved" | "rejected" | "completed";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  company_name: string | null;
  business_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  profile_id: string;
  company_name: string;
  business_id: string;
  description: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  is_verified: boolean;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  supplier_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  price: number;
  currency: string;
  stock_quantity: number;
  min_order_quantity: number;
  unit: string;
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VolumePricing {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  price_per_unit: number;
  created_at: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  currency: string;
  shipping_address: string;
  billing_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubOrder {
  id: string;
  order_id: string;
  supplier_id: string;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  sub_order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Return {
  id: string;
  order_item_id: string;
  buyer_id: string;
  reason: string;
  status: ReturnStatus;
  quantity: number;
  refund_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  buyer_id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}
