export interface Product {
  id: string;
  name: string;
  price: number;
  old_price: number | null;
  quantity: number | null;
  image_url: string;
  description: string;
  created_at?: string;
}

export interface ProductInput {
  name: string;
  price: number;
  old_price?: number | null;
  quantity?: number | null;
  image_url: string;
  description: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  product_id?: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  type?: 'retail' | 'wholesale';
}

export type OrderStatus = 'جديد' | 'تم التوصيل';

export interface Order {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  items: OrderItem[];
  total: number;
  status: string;
  created_at?: string;
}

export interface CreateOrderInput {
  customer_name: string;
  phone: string;
  address: string;
  items: OrderItem[];
  total: number;
  status?: OrderStatus;
}

export type AppView = 'store' | 'checkout' | 'admin';
export type AdminTab = 'products' | 'orders' | 'add-product';
