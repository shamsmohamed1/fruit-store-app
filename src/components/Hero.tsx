interface HeroProps {
  onShopNow: () => void;
  onViewOffers: () => void;
  totalProducts: number;
  offersCount: number;
}

export default function Hero({
  onShopNow,
  onViewOffers,
  totalProducts,
  offersCount,
}: HeroProps) {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-neutral-200 bg-white"
    >
      <div className="mx-auto grid max-w-7xl items-stretch lg:grid-cols-12">
        {/* Right Column (RTL first): Editorial Copy & Primary CTA */}
        <div className="flex flex-col justify-center px-3 py-6 sm:px-6 sm:py-12 lg:col-span-6 lg:py-20 lg:pr-8 lg:pl-12">
          <p className="mb-2 text-xs font-bold text-[#EA580C] sm:mb-3 sm:text-sm">
            أجود انواع الفواكه · قطاعي ومحلات
          </p>

          <h1 className="max-w-xl text-2xl leading-[1.2] font-extrabold tracking-tight text-[#111111] [text-wrap:balance] sm:text-4xl lg:text-5xl">
            <span className="text-[#EA580C]">فواكه إسلام</span>
            <span className="mt-1.5 block text-base font-bold text-[#111111] sm:mt-2 sm:text-2xl lg:text-3xl">
              أجود انواع الفواكه الطازجة يومياً لباب بيتك
            </span>
          </h1>

          <p className="mt-2.5 max-w-lg text-xs leading-relaxed text-neutral-600 sm:mt-4 sm:text-base">
            تشكيلة مختارة من أفخم الفواكه الموسمية والمستوردة بأسعار تنافسية، مع توصيل سريع
            وتوريد خاص للمحلات.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:mt-7 sm:gap-3">
            <button
              type="button"
              onClick={onShopNow}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[#EA580C] px-5 text-xs font-bold text-white shadow-sm transition-all duration-150 hover:bg-[#C2410C] active:scale-[0.99] whitespace-nowrap shrink-0 sm:h-12 sm:rounded-xl sm:px-8 sm:text-base"
            >
              تسوق الآن
            </button>

            <button
              type="button"
              onClick={onViewOffers}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 text-xs font-bold text-[#111111] transition-colors hover:border-[#111111] hover:bg-neutral-50 whitespace-nowrap shrink-0 sm:h-12 sm:rounded-xl sm:px-6 sm:text-base"
            >
              عروض المحلات
            </button>
          </div>

          {/* Clean unboxed store metrics with typographic separators */}
          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-neutral-100 pt-4 text-[11px] text-neutral-600 sm:mt-8 sm:gap-6 sm:pt-5 sm:text-sm">
            <div>
              <span className="font-extrabold text-[#111111] tabular-nums">{totalProducts}</span>{' '}
              <span>صنف متوفر</span>
            </div>
            <span className="text-neutral-300" aria-hidden="true">
              |
            </span>
            <div>
              <span className="font-extrabold text-[#EA580C] tabular-nums">{offersCount}</span>{' '}
              <span>عرض للمحلات</span>
            </div>
            <span className="text-neutral-300" aria-hidden="true">
              |
            </span>
            <div>
              <span className="font-bold text-[#111111]">طازج يومياً</span>
            </div>
          </div>
        </div>

        {/* Left Column (RTL second): Full-bleed Campaign Photography */}
        <div className="relative min-h-[190px] bg-neutral-100 sm:min-h-[360px] lg:col-span-6 lg:min-h-[460px]">
          <img
            src="/src/assets/images/islam_fruits_hero_1795284067795.jpg"
            alt="فواكه إسلام — أجود انواع الفواكه"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-center"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent lg:bg-gradient-to-l lg:from-white/10 lg:via-transparent lg:to-transparent"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
