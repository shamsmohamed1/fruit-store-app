import { createClient } from '@supabase/supabase-js';
import type { CreateOrderInput, Order, OrderItem, OrderStatus, Product, ProductInput } from '../types';

const SUPABASE_URL = 'https://gtcliysjfgiylxkbmpiz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fAJVRXeDSdMIqp_LWr5oAw_37eX9glo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OLD_PRICE_TAG_REGEX = /\n?<!--old_price:(\d+(?:\.\d+)?)-->/gi;
const QUANTITY_TAG_REGEX = /\n?<!--quantity:(\d+)-->/gi;

function stripMetadataTags(description: string): string {
  return (description || '')
    .replace(OLD_PRICE_TAG_REGEX, '')
    .replace(QUANTITY_TAG_REGEX, '')
    .trim();
}

function extractOldPriceFromDescription(description: string): number | null {
  const match = (description || '').match(/<!--old_price:(\d+(?:\.\d+)?)-->/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function extractQuantityFromDescription(description: string): number | null {
  const match = (description || '').match(/<!--quantity:(\d+)-->/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function encodeDescriptionWithMetadata(
  description: string,
  oldPrice?: number | null,
  quantity?: number | null,
): string {
  const parts = [stripMetadataTags(description)].filter(Boolean);
  if (oldPrice && Number.isFinite(oldPrice) && oldPrice > 0) {
    parts.push(`<!--old_price:${oldPrice}-->`);
  }
  if (quantity !== undefined && quantity !== null && Number.isFinite(quantity) && quantity >= 0) {
    parts.push(`<!--quantity:${Math.floor(quantity)}-->`);
  }
  return parts.join('\n');
}

let detectedImageColumns: { hasImage: boolean; hasImageUrl: boolean } | null = null;
let detectedExtraColumns: { hasOldPrice: boolean; hasQuantity: boolean } | null = null;

function detectImageColumns(rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;
  const sample = rows[0];
  detectedImageColumns = {
    hasImage: Object.prototype.hasOwnProperty.call(sample, 'image'),
    hasImageUrl: Object.prototype.hasOwnProperty.call(sample, 'image_url'),
  };
  detectedExtraColumns = {
    hasOldPrice: Object.prototype.hasOwnProperty.call(sample, 'old_price'),
    hasQuantity: Object.prototype.hasOwnProperty.call(sample, 'quantity'),
  };
}

function normalizeProduct(row: Record<string, unknown>): Product {
  const rawDescription = typeof row.description === 'string' ? row.description : '';
  const columnOldPrice =
    row.old_price !== undefined && row.old_price !== null && Number(row.old_price) > 0
      ? Number(row.old_price)
      : null;
  const tagOldPrice = extractOldPriceFromDescription(rawDescription);

  const columnQuantity =
    row.quantity !== undefined && row.quantity !== null && Number.isFinite(Number(row.quantity))
      ? Number(row.quantity)
      : null;
  const tagQuantity = extractQuantityFromDescription(rawDescription);

  const rawImageUrl =
    typeof row.image_url === 'string' && row.image_url.trim()
      ? row.image_url
      : typeof row.image === 'string'
        ? row.image
        : '';

  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    price: Number(row.price ?? 0),
    old_price: columnOldPrice ?? tagOldPrice,
    quantity: columnQuantity ?? tagQuantity,
    image_url: rawImageUrl,
    description: stripMetadataTags(rawDescription),
    created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
  };
}

function parseOrderItems(rawItems: unknown): OrderItem[] {
  if (Array.isArray(rawItems)) {
    return rawItems.map((item) => {
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        return {
          product_id: obj.product_id ? String(obj.product_id) : undefined,
          name: String(obj.name ?? ''),
          price: Number(obj.price ?? 0),
          quantity: Number(obj.quantity ?? 1),
          notes: typeof obj.notes === 'string' ? obj.notes : undefined,
          type: obj.type === 'wholesale' ? 'wholesale' : 'retail',
        };
      }
      return { name: String(item), price: 0, quantity: 1 };
    });
  }

  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      if (Array.isArray(parsed)) {
        return parseOrderItems(parsed);
      }
    } catch {
      return rawItems.trim() ? [{ name: rawItems.trim(), price: 0, quantity: 1 }] : [];
    }
  }

  return [];
}

function normalizeOrder(row: Record<string, unknown>): Order {
  return {
    id: String(row.id ?? ''),
    customer_name: String(row.customer_name ?? ''),
    phone: String(row.phone ?? ''),
    address: String(row.address ?? ''),
    items: parseOrderItems(row.items),
    total: Number(row.total ?? 0),
    status: String(row.status ?? 'جديد'),
    created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
  };
}

function isMissingColumnError(error: { code?: string; message?: string } | null, column: string): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes(`'${column.toLowerCase()}'`) ||
    msg.includes(`column "${column.toLowerCase()}"`) ||
    msg.includes(`column ${column.toLowerCase()}`) ||
    (error.code === 'PGRST204' && msg.includes(column.toLowerCase()))
  );
}

export async function uploadProductImage(compressedFile: File): Promise<string> {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filePath = `products/${uniqueSuffix}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(filePath, compressedFile, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'تعذر رفع الصورة إلى Supabase Storage');
  }

  const { data } = supabase.storage.from('images').getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new Error('تعذر الحصول على رابط الصورة بعد الرفع');
  }

  return data.publicUrl;
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'تعذر تحميل المنتجات من قاعدة البيانات');
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  detectImageColumns(rows);
  return rows.map((row) => normalizeProduct(row));
}

function buildImageFieldVariants(imageValue: string): Array<Record<string, string>> {
  if (detectedImageColumns?.hasImage && detectedImageColumns?.hasImageUrl) {
    return [{ image_url: imageValue, image: imageValue }, { image_url: imageValue }, { image: imageValue }];
  }
  if (detectedImageColumns?.hasImage && !detectedImageColumns?.hasImageUrl) {
    return [{ image: imageValue }, { image_url: imageValue }];
  }
  return [{ image_url: imageValue }, { image: imageValue }];
}

async function mutateProductWithSchemaFallbacks(
  mode: 'insert' | 'update',
  input: ProductInput,
  id?: string,
): Promise<Product> {
  const cleanOldPrice =
    input.old_price && Number.isFinite(input.old_price) && input.old_price > 0
      ? Number(input.old_price)
      : null;

  const cleanQuantity =
    input.quantity !== undefined &&
    input.quantity !== null &&
    Number.isFinite(input.quantity) &&
    input.quantity >= 0
      ? Math.floor(Number(input.quantity))
      : null;

  const cleanDescription = stripMetadataTags(input.description);
  const imageValue = input.image_url.trim();
  const imageVariants = buildImageFieldVariants(imageValue);

  const runMutation = async (payload: Record<string, unknown>) => {
    if (mode === 'insert') {
      return supabase.from('products').insert([payload]).select().single();
    }
    return supabase.from('products').update(payload).eq('id', id!).select().single();
  };

  let lastError: { code?: string; message?: string } | null = null;

  for (const imageFields of imageVariants) {
    let tryOldPriceColumn = detectedExtraColumns ? detectedExtraColumns.hasOldPrice : true;
    let tryQuantityColumn = detectedExtraColumns ? detectedExtraColumns.hasQuantity : true;

    for (let attempt = 0; attempt < 4; attempt++) {
      const payload: Record<string, unknown> = {
        name: input.name.trim(),
        price: Number(input.price),
        description: encodeDescriptionWithMetadata(
          cleanDescription,
          tryOldPriceColumn ? null : cleanOldPrice,
          tryQuantityColumn ? null : cleanQuantity,
        ),
        ...imageFields,
      };

      if (tryOldPriceColumn && (cleanOldPrice !== null || mode === 'update')) {
        payload.old_price = cleanOldPrice;
      }
      if (tryQuantityColumn && (cleanQuantity !== null || mode === 'update')) {
        payload.quantity = cleanQuantity;
      }

      const res = await runMutation(payload);
      if (!res.error && res.data) {
        return normalizeProduct(res.data as Record<string, unknown>);
      }

      if (
        isMissingColumnError(res.error, 'image_url') ||
        isMissingColumnError(res.error, 'image')
      ) {
        lastError = res.error;
        break;
      }

      let retriedWithFallback = false;
      if (tryOldPriceColumn && isMissingColumnError(res.error, 'old_price')) {
        tryOldPriceColumn = false;
        retriedWithFallback = true;
      }
      if (tryQuantityColumn && isMissingColumnError(res.error, 'quantity')) {
        tryQuantityColumn = false;
        retriedWithFallback = true;
      }

      if (retriedWithFallback) {
        lastError = res.error;
        continue;
      }

      throw new Error(res.error?.message || 'تعذر حفظ بيانات المنتج');
    }
  }

  throw new Error(lastError?.message || 'تعذر حفظ بيانات المنتج');
}

export async function createProduct(input: ProductInput): Promise<Product> {
  return mutateProductWithSchemaFallbacks('insert', input);
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  return mutateProductWithSchemaFallbacks('update', input, id);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    throw new Error(error.message || 'تعذر حذف المنتج');
  }
}

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'تعذر تحميل الطلبات من قاعدة البيانات');
  }

  return (data ?? []).map((row) => normalizeOrder(row as Record<string, unknown>));
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const payload = {
    customer_name: input.customer_name.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    items: input.items,
    total: Number(input.total),
    status: input.status ?? 'جديد',
  };

  const res = await supabase.from('orders').insert([payload]).select().single();

  if (!res.error && res.data) {
    return normalizeOrder(res.data as Record<string, unknown>);
  }

  // Fallback in case `items` column in Supabase is TEXT rather than JSONB
  const fallbackRes = await supabase
    .from('orders')
    .insert([{ ...payload, items: JSON.stringify(input.items) }])
    .select()
    .single();

  if (fallbackRes.error || !fallbackRes.data) {
    throw new Error(fallbackRes.error?.message || res.error?.message || 'تعذر تسجيل الطلب');
  }

  return normalizeOrder(fallbackRes.data as Record<string, unknown>);
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'تعذر تحديث حالة الطلب');
  }

  return normalizeOrder(data as Record<string, unknown>);
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) {
    throw new Error(error.message || 'تعذر حذف الطلب');
  }
}

export function subscribeToStoreChanges(
  onProductsChange: () => void,
  onOrdersChange: () => void,
): () => void {
  const channel = supabase
    .channel('ahmed-farah-store-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      () => onProductsChange(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      () => onOrdersChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
