import { useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, MessageCircle, Package } from 'lucide-react';
import type { CartItem, Order } from '../types';
import { createOrder } from '../lib/supabase';
import { buildCheckoutWhatsAppUrl, formatEGP, openExternalLink } from '../lib/whatsapp';

interface CheckoutViewProps {
  items: CartItem[];
  onBackToStore: () => void;
  onOrderSuccess: () => void;
}

export default function CheckoutView({
  items,
  onBackToStore,
  onOrderSuccess,
}: CheckoutViewProps) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState('');

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (items.length === 0) {
      setErrorMsg('السلة فارغة، يرجى إضافة منتجات قبل إتمام الطلب.');
      return;
    }

    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      setErrorMsg('يرجى إدخال الاسم ورقم التليفون والعنوان بالتفصيل.');
      return;
    }

    setSubmitting(true);
    try {
      const orderItems = items.map(({ product, quantity }) => ({
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity,
        notes: notes.trim() || undefined,
        type: 'retail' as const,
      }));

      const fullAddress = notes.trim()
        ? `${address.trim()} — ملاحظات: ${notes.trim()}`
        : address.trim();

      const created = await createOrder({
        customer_name: customerName.trim(),
        phone: phone.trim(),
        address: fullAddress,
        items: orderItems,
        total,
        status: 'جديد',
      });

      const waUrl = buildCheckoutWhatsAppUrl({
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        items: orderItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        total,
        notes: notes.trim(),
      });

      setWhatsappUrl(waUrl);
      setConfirmedOrder(created);
      onOrderSuccess();
      openExternalLink(waUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر تسجيل الطلب، حاول مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedOrder) {
    return (
      <main className="mx-auto max-w-xl px-3 py-8 sm:px-6 sm:py-14">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-center shadow-sm sm:p-8">
          <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 sm:mb-5 sm:h-16 sm:w-16 sm:rounded-2xl">
            <CheckCircle2 className="h-7 w-7 sm:h-9 sm:w-9" />
          </div>

          <h1 className="text-xl font-extrabold text-[#111111] sm:text-3xl">
            تم استلام طلبك بنجاح
          </h1>
          <p className="mt-2 text-xs text-neutral-600 sm:mt-3 sm:text-base">
            تم حفظ طلبك وتوجيهك إلى واتساب لتأكيد التفاصيل. سيتواصل معك فريقنا قريباً على الرقم{' '}
            <span dir="ltr" className="font-bold text-[#111111] tabular-nums">
              {confirmedOrder.phone}
            </span>
            .
          </p>

          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-right text-xs sm:mt-8 sm:p-5 sm:text-sm">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5 sm:pb-3">
              <span className="text-neutral-500">اسم العميل</span>
              <span className="font-bold text-[#111111]">{confirmedOrder.customer_name}</span>
            </div>
            <div className="flex items-center justify-between border-b border-neutral-200 py-2.5 sm:py-3">
              <span className="text-neutral-500">العنوان</span>
              <span className="max-w-[65%] text-left font-semibold text-[#111111]">
                {confirmedOrder.address}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2.5 sm:pt-3">
              <span className="text-neutral-500">الإجمالي المطلوب</span>
              <span className="text-base font-extrabold text-[#EA580C] tabular-nums sm:text-lg">
                {formatEGP(confirmedOrder.total)}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col justify-center gap-2.5 sm:mt-8 sm:flex-row sm:gap-3">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-5 text-sm font-bold text-white transition-colors hover:bg-[#15803D] sm:h-11 sm:px-7 sm:text-base"
              >
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                <span>إرسال الطلب عبر واتساب</span>
              </a>
            )}

            <button
              type="button"
              onClick={onBackToStore}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#111111] px-6 text-sm font-bold text-white transition-colors hover:bg-[#EA580C] sm:h-11 sm:px-8 sm:text-base"
            >
              العودة إلى المتجر
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-10 lg:px-8">
      <button
        type="button"
        onClick={onBackToStore}
        className="mb-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 transition-colors hover:text-[#111111] sm:mb-5 sm:text-sm"
      >
        <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
        <span>العودة للتسوق</span>
      </button>

      <h1 className="mb-4 text-xl font-extrabold text-[#111111] sm:mb-7 sm:text-3xl">
        إتمام الطلب
      </h1>

      <div className="grid gap-4 sm:gap-7 lg:grid-cols-12">
        {/* Customer Form */}
        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-7 lg:col-span-7">
          <h2 className="mb-4 text-base font-bold text-[#111111] sm:mb-5 sm:text-lg">بيانات التوصيل</h2>

          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
            <div>
              <label
                htmlFor="checkout-name"
                className="mb-1 block text-xs font-semibold text-[#111111] sm:mb-1.5 sm:text-sm"
              >
                الاسم بالكامل
              </label>
              <input
                id="checkout-name"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="أدخل اسمك الثلاثي"
                className="h-9.5 w-full rounded-lg border border-neutral-300 bg-white px-3 text-xs text-[#111111] placeholder:text-neutral-400 focus:border-[#EA580C] focus:outline-none sm:h-11 sm:rounded-xl sm:px-4 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="checkout-phone"
                className="mb-1 block text-xs font-semibold text-[#111111] sm:mb-1.5 sm:text-sm"
              >
                رقم التليفون
              </label>
              <input
                id="checkout-phone"
                type="tel"
                dir="ltr"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="h-9.5 w-full rounded-lg border border-neutral-300 bg-white px-3 text-right text-xs text-[#111111] placeholder:text-neutral-400 focus:border-[#EA580C] focus:outline-none sm:h-11 sm:rounded-xl sm:px-4 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="checkout-address"
                className="mb-1 block text-xs font-semibold text-[#111111] sm:mb-1.5 sm:text-sm"
              >
                العنوان بالتفصيل
              </label>
              <textarea
                id="checkout-address"
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="المحافظة، المدينة، اسم الشارع، رقم العقار والدور..."
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-[#111111] placeholder:text-neutral-400 focus:border-[#EA580C] focus:outline-none sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="checkout-notes"
                className="mb-1 block text-xs font-semibold text-[#111111] sm:mb-1.5 sm:text-sm"
              >
                ملاحظات (اختياري)
              </label>
              <textarea
                id="checkout-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي تعليمات إضافية للمندوب أو مواعيد التوصيل المناسبة"
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-[#111111] placeholder:text-neutral-400 focus:border-[#EA580C] focus:outline-none sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
              />
            </div>

            {errorMsg && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
              >
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-5 text-sm font-bold text-white transition-colors hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:px-6 sm:text-base"
            >
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              <span>{submitting ? 'جاري تسجيل الطلب والتحويل لواتساب...' : 'اطلب واتساب'}</span>
            </button>
          </form>
        </section>

        {/* Order Summary */}
        <aside className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-7 lg:col-span-5">
          <h2 className="mb-3.5 text-base font-bold text-[#111111] sm:mb-5 sm:text-lg">ملخص الطلب</h2>

          {items.length === 0 ? (
            <p className="py-4 text-xs text-neutral-500 sm:py-6 sm:text-sm">لا توجد منتجات في السلة حالياً.</p>
          ) : (
            <>
              <ul className="divide-y divide-neutral-100">
                {items.map(({ product, quantity }) => (
                  <li key={product.id} className="flex items-center gap-2.5 py-2.5 first:pt-0 sm:gap-3 sm:py-3.5">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 sm:h-14 sm:w-14 sm:rounded-xl">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-400">
                          <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[#111111] sm:text-sm">{product.name}</p>
                      <p className="text-[11px] text-neutral-500 tabular-nums sm:text-xs">
                        الكمية: {quantity} × {formatEGP(product.price)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-extrabold text-[#111111] tabular-nums sm:text-sm">
                      {formatEGP(product.price * quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 border-t border-neutral-200 pt-3 sm:mt-5 sm:pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-neutral-700 sm:text-base">الإجمالي النهائي</span>
                  <span className="text-lg font-extrabold text-[#EA580C] tabular-nums sm:text-2xl">
                    {formatEGP(total)}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-500 sm:mt-2 sm:text-xs">
                  الدفع عند الاستلام بعد معاينة الطلب.
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
