import { useState } from 'react';
import { Minus, Package, Plus, ShoppingBag } from 'lucide-react';
import type { Product } from '../types';
import { buildProductWhatsAppUrl, formatEGP } from '../lib/whatsapp';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [qty, setQty] = useState(1);

  const hasDiscount =
    product.old_price !== null &&
    Number.isFinite(product.old_price) &&
    product.old_price > product.price;

  const discountPercent = hasDiscount
    ? Math.round(((product.old_price! - product.price) / product.old_price!) * 100)
    : 0;

  const maxStock =
    product.quantity !== null && Number.isFinite(product.quantity) && product.quantity > 0
      ? product.quantity
      : null;

  const whatsappUrl = buildProductWhatsAppUrl(product.name, product.price, qty);

  const handleIncrease = () => {
    setQty((prev) => (maxStock !== null ? Math.min(maxStock, prev + 1) : prev + 1));
  };

  const handleDecrease = () => {
    setQty((prev) => Math.max(1, prev - 1));
  };

  const handleAdd = () => {
    onAddToCart(product, qty);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:rounded-2xl">
      {/* Image Frame (4:3) */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        {product.image_url && !imgError ? (
          <img
            src={product.image_url}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-neutral-100 to-neutral-200/80 p-3 text-center text-neutral-500">
            <Package className="h-8 w-8 text-neutral-400 sm:h-10 sm:w-10" aria-hidden="true" />
            <span className="line-clamp-1 text-[11px] font-medium text-neutral-500 sm:text-xs">
              {product.name}
            </span>
          </div>
        )}

        {hasDiscount && (
          <span className="absolute top-2 right-2 rounded-md bg-[#DC2626] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm sm:top-3 sm:right-3 sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-xs">
            خصم{discountPercent > 0 ? ` ${discountPercent}%` : ''}
          </span>
        )}
      </div>

      {/* Content — compact on mobile for 2-column grid, generous on tablet/desktop */}
      <div className="flex flex-1 flex-col justify-between p-2 sm:p-4">
        <div>
          <h3 className="text-xs font-bold leading-snug text-[#111111] line-clamp-2 sm:text-base">
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1 text-[11px] leading-snug text-neutral-500 line-clamp-2 sm:text-sm sm:leading-relaxed">
              {product.description}
            </p>
          )}
          {product.quantity !== null && (
            <p className="mt-0.5 text-[10px] font-medium text-neutral-500 tabular-nums sm:mt-1 sm:text-xs">
              المتوفر: {product.quantity}
            </p>
          )}
        </div>

        <div className="mt-2 sm:mt-3.5">
          {/* Price Row */}
          <div className="mb-2 flex flex-wrap items-baseline gap-1 sm:mb-3 sm:gap-2">
            <span className="text-sm font-extrabold text-[#111111] tabular-nums sm:text-lg">
              {formatEGP(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] font-medium text-neutral-400 line-through tabular-nums sm:text-xs">
                {formatEGP(product.old_price!)}
              </span>
            )}
          </div>

          {/* Quantity Stepper (+ / -) */}
          <div className="mb-2 flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-1 py-0.5 sm:mb-2.5 sm:rounded-xl sm:px-2 sm:py-1">
            <button
              type="button"
              onClick={handleIncrease}
              aria-label="زيادة الكمية"
              className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-[#111111] shadow-xs transition-colors hover:bg-[#EA580C] hover:text-white sm:h-7 sm:w-7 sm:rounded-lg"
            >
              <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
            </button>

            <span className="text-[11px] font-extrabold text-[#111111] whitespace-nowrap tabular-nums sm:text-sm">
              {qty} كيلو
            </span>

            <button
              type="button"
              onClick={handleDecrease}
              disabled={qty <= 1}
              aria-label="نقص الكمية"
              className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-[#111111] shadow-xs transition-colors hover:bg-neutral-200 disabled:opacity-40 sm:h-7 sm:w-7 sm:rounded-lg"
            >
              <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className={`flex h-8 items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-bold whitespace-nowrap transition-colors sm:h-10 sm:gap-1.5 sm:rounded-xl sm:px-3 sm:text-xs ${
                justAdded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#111111] text-white hover:bg-neutral-800'
              }`}
            >
              <ShoppingBag className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
              <span>{justAdded ? 'تمت الإضافة' : 'أضف للسلة'}</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 items-center justify-center rounded-lg bg-[#EA580C] px-2 text-[11px] font-bold text-white whitespace-nowrap transition-colors hover:bg-[#C2410C] sm:h-10 sm:rounded-xl sm:px-3 sm:text-xs"
            >
              اطلب دلوقتي
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
