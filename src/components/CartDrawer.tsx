import { Minus, Package, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type { CartItem } from '../types';
import { formatEGP } from '../lib/whatsapp';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

export default function CartDrawer({
  isOpen,
  items,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  if (!isOpen) return null;

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-start"
      role="dialog"
      aria-modal="true"
      aria-label="سلة التسوق"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel pinned strictly to the right side */}
      <aside className="fixed top-0 right-0 z-10 flex h-full w-[86vw] max-w-sm flex-col bg-white shadow-2xl sm:w-full sm:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-[#EA580C] sm:h-5 sm:w-5" aria-hidden="true" />
            <h2 className="text-base font-extrabold text-[#111111] sm:text-lg">
              سلة التسوق{' '}
              <span className="text-xs font-semibold text-neutral-500 tabular-nums sm:text-sm">
                ({totalCount})
              </span>
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق السلة"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-[#111111] sm:h-9 sm:w-9 sm:rounded-xl"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 sm:px-6 sm:py-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 sm:mb-4 sm:h-16 sm:w-16 sm:rounded-2xl">
                <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <p className="text-sm font-bold text-[#111111] sm:text-base">سلة التسوق فارغة حالياً</p>
              <p className="mt-1 max-w-xs text-xs text-neutral-500 sm:mt-1.5 sm:text-sm">
                أضف المنتجات التي تعجبك من المتجر وسنقوم بحساب الإجمالي وتجهيز طلبك فوراً.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex gap-3 py-3 first:pt-0 last:pb-0 sm:gap-4 sm:py-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 sm:h-20 sm:w-20 sm:rounded-xl">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-400">
                        <Package className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-[#111111] line-clamp-2 sm:text-sm">
                        {product.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(product.id)}
                        aria-label={`حذف ${product.name}`}
                        className="shrink-0 rounded-md p-1 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 sm:rounded-lg sm:p-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-2 sm:mt-2 sm:gap-3">
                      {/* Quantity Stepper */}
                      <div className="inline-flex items-center rounded-lg border border-neutral-200 bg-neutral-50 sm:rounded-xl">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, 1)}
                          aria-label="زيادة الكمية"
                          className="flex h-7 w-7 items-center justify-center text-neutral-700 transition-colors hover:text-[#EA580C] sm:h-8 sm:w-8"
                        >
                          <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </button>
                        <span className="min-w-[46px] px-1 text-center text-xs font-bold text-[#111111] whitespace-nowrap tabular-nums sm:min-w-[56px] sm:text-sm">
                          {quantity} كيلو
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, -1)}
                          aria-label="تقليل الكمية"
                          className="flex h-7 w-7 items-center justify-center text-neutral-700 transition-colors hover:text-[#EA580C] sm:h-8 sm:w-8"
                        >
                          <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </button>
                      </div>

                      <span className="text-xs font-extrabold text-[#111111] tabular-nums sm:text-sm">
                        {formatEGP(product.price * quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3.5 sm:px-6 sm:py-5">
            <div className="mb-3 flex items-center justify-between sm:mb-4">
              <span className="text-xs font-semibold text-neutral-600 sm:text-sm">الإجمالي الكلي</span>
              <span className="text-lg font-extrabold text-[#111111] tabular-nums sm:text-xl">
                {formatEGP(total)}
              </span>
            </div>

            <button
              type="button"
              onClick={onCheckout}
              className="flex h-10 w-full items-center justify-center rounded-xl bg-[#EA580C] px-5 text-sm font-bold text-white transition-colors hover:bg-[#C2410C] sm:h-11 sm:px-6 sm:text-base"
            >
              إتمام الطلب
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
