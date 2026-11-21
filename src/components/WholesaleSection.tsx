import { useState, type FormEvent } from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { createOrder } from '../lib/supabase';
import {
  buildWholesaleDirectWhatsAppUrl,
  buildWholesaleWhatsAppUrl,
  openExternalLink,
} from '../lib/whatsapp';

interface WholesaleSectionProps {
  onOrderCreated?: () => void;
}

export default function WholesaleSection({ onOrderCreated }: WholesaleSectionProps) {
  const [traderName, setTraderName] = useState('');
  const [phone, setPhone] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastWhatsappUrl, setLastWhatsappUrl] = useState('');

  const directWhatsappUrl = buildWholesaleDirectWhatsAppUrl();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLastWhatsappUrl('');

    if (!traderName.trim() || !phone.trim() || !productName.trim() || !quantity.trim()) {
      setErrorMsg('يرجى إدخال اسم التاجر ورقم التليفون واسم المنتج والكمية المطلوبة.');
      return;
    }

    const parsedQty = parseInt(quantity, 10);
    const safeQty = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 1;

    setSubmitting(true);
    try {
      await createOrder({
        customer_name: `${traderName.trim()} (طلب جملة)`,
        phone: phone.trim(),
        address: 'طلب جملة للتجار',
        items: [
          {
            name: `${productName.trim()} — الكمية: ${quantity.trim()}`,
            price: 0,
            quantity: safeQty,
            notes: notes.trim() || undefined,
            type: 'wholesale',
          },
        ],
        total: 0,
        status: 'جديد',
      });

      const waUrl = buildWholesaleWhatsAppUrl({
        traderName: traderName.trim(),
        phone: phone.trim(),
        productName: productName.trim(),
        quantity: quantity.trim(),
        notes: notes.trim(),
      });

      setLastWhatsappUrl(waUrl);
      onOrderCreated?.();
      openExternalLink(waUrl);

      setTraderName('');
      setPhone('');
      setProductName('');
      setQuantity('');
      setNotes('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل طلب الجملة');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="wholesale"
      className="border-t border-neutral-200 bg-[#111111] py-10 text-white sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-12">
          {/* Right Column: Wholesale Intro & Direct WhatsApp CTA */}
          <div className="lg:col-span-5">
            <p className="text-xs font-bold text-[#FB923C] sm:text-sm">توريد للتجار والمحلات</p>
            <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-white [text-wrap:balance] sm:mt-2 sm:text-3xl lg:text-4xl">
              قسم الجملة للتجار
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-neutral-300 sm:mt-4 sm:text-lg">
              عندك محل فواكه أو عايز كمية؟ اطلب بسعر الجملة
            </p>
            <p className="mt-2 text-xs leading-relaxed text-neutral-400 sm:mt-3 sm:text-sm">
              نوفر للتجار وأصحاب المحلات في فواكه إسلام أسعاراً خاصة للكميات مع فرز ممتاز
              وسرعة في التجهيز والتوصيل. سجل بيانات طلبك في النموذج أو تواصل معنا مباشرة عبر واتساب.
            </p>

            <div className="mt-5 border-t border-white/10 pt-4 sm:mt-8 sm:pt-6">
              <a
                href={directWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#FB923C]/50 bg-[#EA580C]/15 px-4 text-xs font-bold text-[#FDBA74] transition-colors hover:bg-[#EA580C] hover:text-white whitespace-nowrap sm:h-11 sm:rounded-xl sm:px-6 sm:text-sm"
              >
                <span>كلمينا واتساب للجملة</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Left Column: Wholesale Order Form */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:rounded-2xl sm:p-7 lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <label
                    htmlFor="wholesale-trader"
                    className="mb-1 block text-xs font-semibold text-neutral-200 sm:mb-1.5 sm:text-sm"
                  >
                    اسم التاجر
                  </label>
                  <input
                    id="wholesale-trader"
                    type="text"
                    required
                    value={traderName}
                    onChange={(e) => setTraderName(e.target.value)}
                    placeholder="مثال: شركة النور للتجارة"
                    className="h-9.5 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-xs text-white placeholder:text-neutral-500 focus:border-[#EA580C] focus:bg-white/10 focus:outline-none sm:h-11 sm:rounded-xl sm:px-4 sm:text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="wholesale-phone"
                    className="mb-1 block text-xs font-semibold text-neutral-200 sm:mb-1.5 sm:text-sm"
                  >
                    رقم التليفون
                  </label>
                  <input
                    id="wholesale-phone"
                    type="tel"
                    dir="ltr"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="h-9.5 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-right text-xs text-white placeholder:text-neutral-500 focus:border-[#EA580C] focus:bg-white/10 focus:outline-none sm:h-11 sm:rounded-xl sm:px-4 sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <label
                    htmlFor="wholesale-product"
                    className="mb-1 block text-xs font-semibold text-neutral-200 sm:mb-1.5 sm:text-sm"
                  >
                    اسم المنتج
                  </label>
                  <input
                    id="wholesale-product"
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="اكتب اسم الصنف المطلوب"
                    className="h-9.5 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-xs text-white placeholder:text-neutral-500 focus:border-[#EA580C] focus:bg-white/10 focus:outline-none sm:h-11 sm:rounded-xl sm:px-4 sm:text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="wholesale-quantity"
                    className="mb-1 block text-xs font-semibold text-neutral-200 sm:mb-1.5 sm:text-sm"
                  >
                    الكمية المطلوبة
                  </label>
                  <input
                    id="wholesale-quantity"
                    type="text"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="مثال: 50 كيلو أو 10 أقفاص"
                    className="h-9.5 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-xs text-white placeholder:text-neutral-500 focus:border-[#EA580C] focus:bg-white/10 focus:outline-none sm:h-11 sm:rounded-xl sm:px-4 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="wholesale-notes"
                  className="mb-1 block text-xs font-semibold text-neutral-200 sm:mb-1.5 sm:text-sm"
                >
                  ملاحظات
                </label>
                <textarea
                  id="wholesale-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="تفاصيل إضافية عن الفرز أو التوصيل..."
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:border-[#EA580C] focus:bg-white/10 focus:outline-none sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
                />
              </div>

              {errorMsg && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  {errorMsg}
                </p>
              )}

              {lastWhatsappUrl && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-200 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>تم تسجيل طلب الجملة بنجاح وإرساله للواتساب.</span>
                  </div>
                  <a
                    href={lastWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-white underline underline-offset-4 hover:text-[#FB923C]"
                  >
                    اضغط هنا لفتح واتساب مجدداً
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex h-10 w-full items-center justify-center rounded-xl bg-[#EA580C] px-5 text-sm font-bold text-white transition-colors hover:bg-[#C2410C] disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:px-6 sm:text-base"
              >
                {submitting ? 'جاري تسجيل وإرسال الطلب...' : 'اطلب بسعر الجملة'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
