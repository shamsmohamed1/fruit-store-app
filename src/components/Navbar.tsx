import { ArrowRight, Search, ShoppingCart, X } from 'lucide-react';
import type { AppView } from '../types';

interface NavbarProps {
  cartCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenCart: () => void;
  activeView: AppView;
  onNavigateView: (view: AppView, sectionId?: string) => void;
}

export default function Navbar({
  cartCount,
  searchQuery,
  onSearchChange,
  onOpenCart,
  activeView,
  onNavigateView,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-md">
      {/* Row 1: Brand + Desktop Nav + Black Cart Icon */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-6 sm:py-2.5 lg:px-8">
        {/* Brand Zone */}
        <button
          type="button"
          onClick={() => onNavigateView('store', 'top')}
          className="flex shrink-0 items-center gap-2 text-right whitespace-nowrap transition-opacity hover:opacity-80"
        >
          <span className="inline-block h-7 w-1 rounded-full bg-[#EA580C] sm:h-8 sm:w-1.5" aria-hidden="true" />
          <div className="flex flex-col leading-tight">
            <span className="text-base font-extrabold tracking-tight text-[#111111] sm:text-xl">
              فواكه إسلام
            </span>
            <span className="text-[10px] font-semibold text-[#EA580C] sm:text-[11px]">
              أجود انواع الفواكه
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden items-center gap-6 text-sm font-semibold text-neutral-600 md:flex"
        >
          <button
            type="button"
            onClick={() => onNavigateView('store', 'products')}
            className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-[#111111]"
          >
            المنتجات
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('store', 'offers')}
            className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-[#EA580C]"
          >
            المحلات
          </button>
        </nav>

        {/* Show "عرض المتجر" when inside Admin view; otherwise show Black Cart Icon */}
        {activeView === 'admin' ? (
          <button
            type="button"
            onClick={() => onNavigateView('store', 'top')}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-bold text-[#111111] whitespace-nowrap transition-colors hover:border-[#EA580C] hover:text-[#EA580C] sm:h-10 sm:px-4 sm:text-sm"
          >
            <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
            <span>عرض المتجر</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`سلة التسوق${cartCount > 0 ? `، عدد الطلبات ${cartCount}` : ''}`}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-[#111111] transition-colors hover:border-[#111111] hover:bg-neutral-100 sm:h-10 sm:w-10"
          >
            <ShoppingCart className="h-5 w-5 text-[#111111]" strokeWidth={2.2} aria-hidden="true" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#EA580C] px-1 text-[10px] font-extrabold leading-none text-white tabular-nums ring-2 ring-white sm:h-5 sm:min-w-[20px] sm:text-[11px]">
                {cartCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Row 2: Long Full-Width Search Bar directly underneath store name */}
      {activeView === 'store' && (
        <div className="mx-auto max-w-7xl px-3 pb-2 sm:px-6 sm:pb-2.5 lg:px-8">
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث عن الفواكه أو المنتجات..."
              aria-label="البحث عن منتج"
              className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50 pr-9 pl-8 text-xs text-[#111111] placeholder:text-neutral-400 transition-colors focus:border-[#EA580C] focus:bg-white focus:outline-none sm:h-10 sm:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="مسح البحث"
                className="absolute top-1/2 left-2.5 -translate-y-1/2 rounded-full p-0.5 text-neutral-400 hover:text-[#111111]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Row 3: Compact Mobile Navigation Row */}
      <div className="flex items-center justify-around border-t border-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-600 md:hidden">
        <button
          type="button"
          onClick={() => onNavigateView('store', 'products')}
          className="whitespace-nowrap px-3 py-0.5 hover:text-[#111111]"
        >
          المنتجات
        </button>
        <button
          type="button"
          onClick={() => onNavigateView('store', 'offers')}
          className="whitespace-nowrap px-3 py-0.5 hover:text-[#EA580C]"
        >
          المحلات
        </button>
      </div>
    </header>
  );
}
