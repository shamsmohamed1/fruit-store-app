export const WHATSAPP_NUMBER = '201130533404';
export const WHATSAPP_BASE_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export const WHATSAPP_PHONE_DISPLAY = '+20 11 30533404';
export const WHATSAPP_TEL_URL = 'tel:+201130533404';
export const FACEBOOK_URL = 'https://www.facebook.com/share/151cosDYMDW/';

export function formatEGP(amount: number): string {
  const numeric = Number.isFinite(amount) ? amount : 0;
  return `${numeric.toLocaleString('ar-EG')} ج.م`;
}

export function buildProductWhatsAppUrl(
  productName: string,
  price: number,
  quantity = 1,
): string {
  const total = price * quantity;
  const message =
    quantity > 1
      ? `السلام عليكم، أريد طلب المنتج التالي من فواكه إسلام:\n• المنتج: ${productName}\n• الكمية: ${quantity}\n• السعر للوحدة: ${price} ج.م\n• الإجمالي: ${total} ج.م\nيرجى تأكيد التوافر وتفاصيل التوصيل.`
      : `السلام عليكم، أريد طلب المنتج التالي من فواكه إسلام:\n• المنتج: ${productName}\n• السعر: ${price} ج.م\nيرجى تأكيد التوافر وتفاصيل التوصيل.`;
  return `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(message)}`;
}

export interface WholesaleFormDetails {
  traderName: string;
  phone: string;
  productName: string;
  quantity: string;
  notes: string;
}

export function buildWholesaleWhatsAppUrl(details: WholesaleFormDetails): string {
  const lines = [
    'السلام عليكم، طلب تسعير وشراء بسعر الجملة من فواكه إسلام:',
    `• اسم التاجر: ${details.traderName}`,
    `• رقم التليفون: ${details.phone}`,
    `• اسم المنتج: ${details.productName}`,
    `• الكمية المطلوبة: ${details.quantity}`,
  ];
  if (details.notes.trim()) {
    lines.push(`• ملاحظات: ${details.notes.trim()}`);
  }
  return `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function buildWholesaleDirectWhatsAppUrl(): string {
  const message = 'السلام عليكم، أود الاستفسار عن أسعار الجملة للتجار في فواكه إسلام.';
  return `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(message)}`;
}

export interface CheckoutWhatsAppDetails {
  customerName: string;
  phone: string;
  address: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  notes?: string;
}

export function buildCheckoutWhatsAppUrl(details: CheckoutWhatsAppDetails): string {
  const itemsText = details.items
    .map(
      (item, index) =>
        `${index + 1}. ${item.name} × ${item.quantity} (${item.price * item.quantity} ج.م)`,
    )
    .join('\n');

  const lines = [
    'السلام عليكم، طلب جديد من فواكه إسلام:',
    `• اسم العميل: ${details.customerName}`,
    `• رقم التليفون: ${details.phone}`,
    `• العنوان: ${details.address}`,
    '• قائمة المنتجات:',
    itemsText,
    `• الإجمالي: ${details.total} ج.م`,
  ];

  if (details.notes && details.notes.trim()) {
    lines.push(`• ملاحظات: ${details.notes.trim()}`);
  }

  return `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function openExternalLink(url: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
