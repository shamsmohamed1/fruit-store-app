import { useCallback, useEffect, useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import type { AppView, CartItem, Order, Product } from './types';
import { fetchOrders, fetchProducts, subscribeToStoreChanges } from './lib/supabase';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductCard from './components/ProductCard';
import CartDrawer from './components/CartDrawer';
import CheckoutView from './components/CheckoutView';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';

const CART_STORAGE_KEY = 'ahmed_farah_store_cart_v1';

function loadInitialCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const normalizedPath = window.location.pathname.replace(/\/+$/, '');
  return normalizedPath === '/admin' || window.location.hash === '#/admin';
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [cart, setCart] = useState<CartItem[]>(loadInitialCart);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<AppView>(() => (isAdminRoute() ? 'admin' : 'store'));
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const refreshProducts = useCallback(async () => {
    try {
      const data = await fetchProducts();
      setProducts(data);
      setLoadError('');
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'تعذر الاتصال بقاعدة البيانات لتحميل المنتجات',
      );
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch {
      // Orders might only be needed in admin view; keep storefront resilient
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshProducts(), refreshOrders()]);
  }, [refreshProducts, refreshOrders]);

  useEffect(() => {
    const syncRoute = () => {
      const admin = isAdminRoute();
      setActiveView(admin ? 'admin' : 'store');
      if (!admin) {
        setIsAdminAuthenticated(false);
      }
    };
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  useEffect(() => {
    if (activeView === 'admin' && !isAdminAuthenticated) {
      return;
    }

    if (activeView === 'admin' && isAdminAuthenticated) {
      void refreshAll();
    } else {
      void refreshProducts();
    }

    const unsubscribe = subscribeToStoreChanges(
      () => {
        void refreshProducts();
      },
      () => {
        if (isAdminAuthenticated) {
          void refreshOrders();
        }
      },
    );

    return () => unsubscribe();
  }, [activeView, isAdminAuthenticated, refreshProducts, refreshOrders, refreshAll]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  // Keep cart product prices/titles synced with latest Supabase products
  useEffect(() => {
    if (products.length === 0) return;
    setCart((prev) =>
      prev.map((item) => {
        const latest = products.find((p) => p.id === item.product.id);
        return latest ? { ...item, product: latest } : item;
      }),
    );
  }, [products]);

  const scrollToSection = (sectionId: string) => {
    window.requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const handleNavigateView = (view: AppView, sectionId?: string) => {
    if (view === 'admin') {
      if (!isAdminRoute()) {
        window.history.pushState({}, '', '/admin');
      }
      setActiveView('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (isAdminRoute()) {
      window.history.pushState({}, '', '/');
      setIsAdminAuthenticated(false);
    }
    setActiveView(view);

    if (view === 'store' && sectionId) {
      window.setTimeout(() => scrollToSection(sectionId), 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddToCart = (product: Product, quantity = 1) => {
    const safeQty = Math.max(1, Math.floor(quantity));
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + safeQty }
            : item,
        );
      }
      return [...prev, { product, quantity: safeQty }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleOpenCheckout = () => {
    setIsCartOpen(false);
    setActiveView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderSuccess = () => {
    setCart([]);
    void refreshOrders();
  };

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [products, searchQuery]);

  const offerProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.old_price !== null &&
          Number.isFinite(p.old_price) &&
          p.old_price > p.price,
      ),
    [products],
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] pb-16 text-[#111111] sm:pb-20">
      <Navbar
        cartCount={cartCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCart={() => setIsCartOpen(true)}
        activeView={activeView}
        onNavigateView={handleNavigateView}
      />

      <div className="flex-1">
        {activeView === 'store' && (
          <main>
            <Hero
              totalProducts={products.length}
              offersCount={offerProducts.length}
              onShopNow={() => scrollToSection('products')}
              onViewOffers={() => scrollToSection('offers')}
            />

            {/* 1. Products Section */}
            <section id="products" className="mx-auto max-w-7xl px-3 py-10 sm:px-6 sm:py-16 lg:px-8">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-4 sm:mb-8">
                <div>
                  <h2 className="text-xl font-extrabold text-[#111111] sm:text-3xl">
                    جميع المنتجات
                  </h2>
                  <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
                    اختر الفواكه والكمية وأضفها للسلة أو اطلب مباشرة عبر واتساب
                  </p>
                </div>
                {searchQuery.trim() && (
                  <p className="text-sm font-semibold text-neutral-600 tabular-nums">
                    نتائج البحث: {filteredProducts.length} منتج
                  </p>
                )}
              </div>

              {loadingProducts ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 lg:gap-6">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className="h-[320px] animate-pulse rounded-xl border border-neutral-200 bg-white p-3 sm:h-[410px] sm:rounded-2xl sm:p-4"
                    >
                      <div className="aspect-[4/3] w-full rounded-lg bg-neutral-100 sm:rounded-xl" />
                      <div className="mt-3 h-4 w-2/3 rounded bg-neutral-100 sm:mt-4 sm:h-5" />
                      <div className="mt-2 h-3 w-full rounded bg-neutral-100 sm:h-4" />
                      <div className="mt-5 h-9 w-full rounded-lg bg-neutral-100 sm:mt-6 sm:h-10 sm:rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : loadError ? (
                <div className="rounded-2xl border border-red-200 bg-white p-10 text-center">
                  <p className="text-base font-bold text-red-700">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => void refreshProducts()}
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#111111] px-6 text-sm font-bold text-white hover:bg-[#EA580C]"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : products.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center">
                  <Package className="mx-auto mb-3 h-12 w-12 text-neutral-300" aria-hidden="true" />
                  <p className="text-lg font-extrabold text-[#111111]">
                    لا توجد منتجات حالياً
                  </p>
                  <p className="mt-1.5 text-sm text-neutral-500">
                    سيتم عرض المنتجات هنا فور توفرها.
                  </p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-14 text-center">
                  <p className="text-base font-bold text-[#111111]">
                    لا توجد منتجات مطابقة لعبارة "{searchQuery}"
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#111111] px-5 text-sm font-bold text-white hover:bg-[#EA580C]"
                  >
                    عرض كل المنتجات
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 lg:gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* 2. Shops Section ("المحلات") */}
            <section
              id="offers"
              className="border-t border-neutral-200 bg-white py-12 sm:py-16"
            >
              <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-4 sm:mb-8">
                  <div>
                    <p className="text-xs font-bold text-[#DC2626]">تخفيضات خاصة وتجهيزات</p>
                    <h2 className="mt-1 text-xl font-extrabold text-[#111111] sm:text-3xl">
                      المحلات
                    </h2>
                  </div>
                  <p className="text-xs font-semibold text-neutral-500 tabular-nums sm:text-sm">
                    {offerProducts.length} عروض متاحة
                  </p>
                </div>

                {offerProducts.length === 0 ? (
                  <div className="rounded-2xl border border-neutral-200 bg-[#FAFAFA] px-6 py-12 text-center">
                    <p className="text-base font-bold text-[#111111]">
                      لا توجد عروض للمحلات حالياً
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      سيتم عرض عروض المحلات هنا فور توفرها.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 lg:gap-6">
                    {offerProducts.map((product) => (
                      <ProductCard
                        key={`offer-${product.id}`}
                        product={product}
                        onAddToCart={handleAddToCart}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </main>
        )}

        {activeView === 'checkout' && (
          <CheckoutView
            items={cart}
            onBackToStore={() => handleNavigateView('store', 'products')}
            onOrderSuccess={handleOrderSuccess}
          />
        )}

        {activeView === 'admin' && (
          <AdminDashboard
            products={isAdminAuthenticated ? products : []}
            orders={isAdminAuthenticated ? orders : []}
            loading={isAdminAuthenticated ? loadingProducts || loadingOrders : false}
            isAuthenticated={isAdminAuthenticated}
            onAuthChange={setIsAdminAuthenticated}
            onRefresh={refreshAll}
            onExitAdmin={() => handleNavigateView('store', 'top')}
          />
        )}
      </div>

      <Footer />

      <CartDrawer
        isOpen={isCartOpen}
        items={cart}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={handleOpenCheckout}
      />
    </div>
  );
}
