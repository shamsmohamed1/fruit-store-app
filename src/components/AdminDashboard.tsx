import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type RefObject,
} from 'react';
import {
  ArrowDownLeft,
  Eye,
  ImagePlus,
  KeyRound,
  Lock,
  LogOut,
  Package,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import type { AdminTab, Order, OrderStatus, Product } from '../types';
import {
  createProduct,
  deleteOrder,
  deleteProduct,
  updateOrderStatus,
  updateProduct,
  uploadProductImage,
} from '../lib/supabase';
import { compressImageClientSide, type CompressedImageResult } from '../lib/imageCompression';
import { formatEGP } from '../lib/whatsapp';

interface AdminDashboardProps {
  products: Product[];
  orders: Order[];
  loading: boolean;
  isAuthenticated: boolean;
  onAuthChange: (authenticated: boolean) => void;
  onRefresh: () => Promise<void>;
  onExitAdmin: () => void;
}

// كلمة سر لوحة التحكم الافتراضية — يمكن تعديلها بسهولة من هنا
const DEFAULT_ADMIN_PASSCODE = '123456';
const ADMIN_PASSCODE_STORAGE_KEY = 'islam_fruits_admin_passcode_v1';

function loadSavedPasscode(): string {
  try {
    const saved = localStorage.getItem(ADMIN_PASSCODE_STORAGE_KEY);
    return saved && saved.trim().length > 0 ? saved.trim() : DEFAULT_ADMIN_PASSCODE;
  } catch {
    return DEFAULT_ADMIN_PASSCODE;
  }
}

export default function AdminDashboard({
  products,
  orders,
  loading,
  isAuthenticated,
  onAuthChange,
  onRefresh,
  onExitAdmin,
}: AdminDashboardProps) {
  const [adminPasscode, setAdminPasscode] = useState<string>(loadSavedPasscode);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Reset Password Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [resetPassError, setResetPassError] = useState('');

  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [orderFilter, setOrderFilter] = useState<'all' | 'delivered' | 'new'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );
  const productsSectionRef = useRef<HTMLElement | null>(null);
  const ordersSectionRef = useRef<HTMLElement | null>(null);

  // Add Product Form State
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newOldPrice, setNewOldPrice] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCompressedImage, setNewCompressedImage] = useState<CompressedImageResult | null>(null);
  const [compressingNew, setCompressingNew] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editOldPrice, setEditOldPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCompressedImage, setEditCompressedImage] = useState<CompressedImageResult | null>(null);
  const [compressingEdit, setCompressingEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  // Preview & Inline Delete Confirmation State
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (newCompressedImage?.previewUrl) {
        URL.revokeObjectURL(newCompressedImage.previewUrl);
      }
    };
  }, [newCompressedImage]);

  useEffect(() => {
    return () => {
      if (editCompressedImage?.previewUrl) {
        URL.revokeObjectURL(editCompressedImage.previewUrl);
      }
    };
  }, [editCompressedImage]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === adminPasscode) {
      onAuthChange(true);
      setAuthError('');
      setPasswordInput('');
    } else {
      setAuthError('كلمة السر غير صحيحة');
    }
  };

  const handleOpenResetModal = () => {
    setCurrentPassInput('');
    setNewPassInput('');
    setConfirmPassInput('');
    setResetPassError('');
    setIsResetModalOpen(true);
  };

  const handleResetPassword = (e: FormEvent) => {
    e.preventDefault();
    if (currentPassInput.trim() !== adminPasscode) {
      setResetPassError('كلمة السر الحالية غير صحيحة');
      return;
    }
    const nextPass = newPassInput.trim();
    if (nextPass.length < 4) {
      setResetPassError('كلمة السر الجديدة يجب أن تكون 4 أحرف أو أرقام على الأقل');
      return;
    }
    if (nextPass !== confirmPassInput.trim()) {
      setResetPassError('كلمة السر الجديدة وتأكيدها غير متطابقين');
      return;
    }
    try {
      localStorage.setItem(ADMIN_PASSCODE_STORAGE_KEY, nextPass);
    } catch {
      // Keep updated in memory if storage fails
    }
    setAdminPasscode(nextPass);
    setIsResetModalOpen(false);
    showFeedback('success', 'تمت إعادة تعيين كلمة السر بنجاح.');
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    window.setTimeout(() => {
      setFeedbackMsg((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const handleSelectAddImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setCompressingNew(true);
    try {
      const compressed = await compressImageClientSide(file);
      setNewCompressedImage(compressed);
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'تعذر معالجة الصورة المختارة');
    } finally {
      setCompressingNew(false);
    }
  };

  const handleSelectEditImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setCompressingEdit(true);
    try {
      const compressed = await compressImageClientSide(file);
      setEditCompressedImage(compressed);
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'تعذر معالجة الصورة المختارة');
    } finally {
      setCompressingEdit(false);
    }
  };

  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice.trim()) {
      showFeedback('error', 'يرجى إدخال اسم المنتج والسعر على الأقل.');
      return;
    }

    const priceNum = Number(newPrice);
    const oldPriceNum = newOldPrice.trim() ? Number(newOldPrice) : null;
    const quantityNum = newQuantity.trim() ? Number(newQuantity) : null;

    if (!Number.isFinite(priceNum) || priceNum < 0) {
      showFeedback('error', 'يرجى إدخال سعر صحيح.');
      return;
    }

    if (oldPriceNum !== null && (!Number.isFinite(oldPriceNum) || oldPriceNum <= priceNum)) {
      showFeedback('error', 'السعر القديم يجب أن يكون أكبر من السعر الجديد ليظهر في قسم المحلات.');
      return;
    }

    if (quantityNum !== null && (!Number.isFinite(quantityNum) || quantityNum < 0)) {
      showFeedback('error', 'يرجى إدخال كمية صحيحة.');
      return;
    }

    setSavingNew(true);
    try {
      let uploadedImageUrl = '';
      if (newCompressedImage) {
        uploadedImageUrl = await uploadProductImage(newCompressedImage.file);
      }

      await createProduct({
        name: newName,
        price: priceNum,
        old_price: oldPriceNum,
        quantity: quantityNum !== null ? Math.floor(quantityNum) : null,
        image_url: uploadedImageUrl,
        description: newDescription,
      });
      await onRefresh();
      setNewName('');
      setNewPrice('');
      setNewOldPrice('');
      setNewQuantity('');
      setNewCompressedImage(null);
      setNewDescription('');
      setActiveTab('products');
      showFeedback('success', 'تمت إضافة المنتج وحفظه في قاعدة البيانات بنجاح.');
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'تعذر إضافة المنتج');
    } finally {
      setSavingNew(false);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditPrice(String(product.price));
    setEditOldPrice(product.old_price ? String(product.old_price) : '');
    setEditQuantity(product.quantity !== null && product.quantity !== undefined ? String(product.quantity) : '');
    setEditCompressedImage(null);
    setEditDescription(product.description);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const priceNum = Number(editPrice);
    const oldPriceNum = editOldPrice.trim() ? Number(editOldPrice) : null;
    const quantityNum = editQuantity.trim() ? Number(editQuantity) : null;

    if (!editName.trim() || !Number.isFinite(priceNum) || priceNum < 0) {
      showFeedback('error', 'يرجى إدخال اسم وسعر صحيحين.');
      return;
    }

    if (oldPriceNum !== null && (!Number.isFinite(oldPriceNum) || oldPriceNum <= priceNum)) {
      showFeedback('error', 'السعر القديم يجب أن يكون أكبر من السعر الجديد.');
      return;
    }

    if (quantityNum !== null && (!Number.isFinite(quantityNum) || quantityNum < 0)) {
      showFeedback('error', 'يرجى إدخال كمية صحيحة.');
      return;
    }

    setSavingEdit(true);
    try {
      let finalImageUrl = editingProduct.image_url;
      if (editCompressedImage) {
        finalImageUrl = await uploadProductImage(editCompressedImage.file);
      }

      await updateProduct(editingProduct.id, {
        name: editName,
        price: priceNum,
        old_price: oldPriceNum,
        quantity: quantityNum !== null ? Math.floor(quantityNum) : null,
        image_url: finalImageUrl,
        description: editDescription,
      });
      await onRefresh();
      setEditingProduct(null);
      setEditCompressedImage(null);
      showFeedback('success', 'تم تحديث بيانات المنتج بنجاح.');
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'تعذر تحديث المنتج');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDeleteProduct = async (target: Product) => {
    setBusyId(target.id);
    try {
      await deleteProduct(target.id);
      await onRefresh();
      setConfirmDeleteId(null);
      showFeedback('success', `تم حذف "${target.name}" بنجاح.`);
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'تعذر حذف المنتج');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleOrderStatus = async (order: Order) => {
    const nextStatus: OrderStatus = order.status === 'تم التوصيل' ? 'جديد' : 'تم التوصيل';
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, nextStatus);
      await onRefresh();
      showFeedback('success', `تم تغيير حالة الطلب إلى "${nextStatus}".`);
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'تعذر تحديث حالة الطلب');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setBusyId(orderId);
    try {
      await deleteOrder(orderId);
      await onRefresh();
      showFeedback('success', 'تم حذف الطلب بنجاح.');
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'تعذر حذف الطلب');
    } finally {
      setBusyId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-[75vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#111111] text-white">
            <Lock className="h-5 w-5" />
          </div>

          <h1 className="text-center text-xl font-extrabold text-[#111111]">
            تسجيل الدخول
          </h1>
          <p className="mt-1.5 text-center text-sm text-neutral-500">
            فواكه إسلام — أدخل كلمة السر للمتابعة
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-sm font-semibold text-[#111111]"
              >
                كلمة السر
              </label>
              <input
                id="admin-password"
                type="password"
                dir="ltr"
                required
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (authError) setAuthError('');
                }}
                placeholder="••••••"
                className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 text-center text-base tracking-widest text-[#111111] focus:border-[#EA580C] focus:outline-none"
              />
            </div>

            {authError && (
              <p role="alert" className="text-center text-sm font-bold text-red-600">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center rounded-xl bg-[#EA580C] text-sm font-bold text-white transition-colors hover:bg-[#C2410C]"
            >
              دخول
            </button>

            <button
              type="button"
              onClick={onExitAdmin}
              className="flex h-11 w-full items-center justify-center rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-[#111111]"
            >
              العودة للمتجر
            </button>
          </form>
        </div>
      </main>
    );
  }

  const totalSales = orders.reduce((sum, ord) => sum + (Number(ord.total) || 0), 0);
  const deliveredOrders = orders.filter((ord) => ord.status === 'تم التوصيل').length;
  const pendingOrders = orders.length - deliveredOrders;
  const offersCount = products.filter(
    (p) => p.old_price !== null && Number.isFinite(p.old_price) && p.old_price > p.price,
  ).length;

  const filteredOrders = orders.filter((ord) => {
    if (orderFilter === 'delivered') return ord.status === 'تم التوصيل';
    if (orderFilter === 'new') return ord.status !== 'تم التوصيل';
    return true;
  });

  const scrollToSection = (sectionRef: RefObject<HTMLElement | null>) => {
    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }, 60);
  };

  const handleSelectProductsCard = () => {
    setActiveTab('products');
    scrollToSection(productsSectionRef);
  };

  const handleSelectOrdersCard = () => {
    setOrderFilter('all');
    setActiveTab('orders');
    scrollToSection(ordersSectionRef);
  };

  const handleSelectSalesCard = () => {
    setOrderFilter('delivered');
    setActiveTab('orders');
    scrollToSection(ordersSectionRef);
  };

  return (
    <div className="min-h-[82vh] bg-[#F5F5F5]">
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        {/* Right-Side Sidebar (first child in RTL = Right side) */}
        <aside className="w-full shrink-0 border-b border-neutral-200 bg-white lg:min-h-[82vh] lg:w-64 lg:border-b-0 lg:border-l">
          <div className="p-3 sm:p-5">
            <nav className="flex items-center gap-1 overflow-x-auto sm:gap-2 lg:flex-col lg:items-stretch">
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold whitespace-nowrap transition-colors sm:justify-start sm:gap-3 sm:px-4 sm:py-2.5 sm:text-sm ${
                  activeTab === 'products'
                    ? 'bg-[#111111] text-white'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <Package className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                <span>المنتجات</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrderFilter('all');
                  setActiveTab('orders');
                }}
                className={`flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold whitespace-nowrap transition-colors sm:justify-start sm:gap-3 sm:px-4 sm:py-2.5 sm:text-sm ${
                  activeTab === 'orders'
                    ? 'bg-[#111111] text-white'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <ShoppingCart className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                <span>الطلبات</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('add-product')}
                className={`flex items-center justify-center gap-1 rounded-xl bg-[#EA580C] px-2 py-2 text-[11px] font-bold text-white whitespace-nowrap transition-colors hover:bg-[#C2410C] sm:justify-start sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm ${
                  activeTab === 'add-product' ? 'ring-2 ring-[#EA580C] ring-offset-2' : ''
                }`}
              >
                <Plus className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                <span>إضافة صنف</span>
              </button>

              <button
                type="button"
                onClick={handleOpenResetModal}
                aria-label="إعادة تعيين كلمة السر"
                title="إعادة تعيين كلمة السر"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-[#111111] transition-colors hover:border-[#EA580C] hover:text-[#EA580C] sm:h-10 sm:w-10 lg:mt-2 lg:w-full"
              >
                <KeyRound className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onAuthChange(false)}
                aria-label="تسجيل الخروج"
                title="تسجيل الخروج"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-600 hover:text-white sm:h-10 sm:w-10 lg:w-full"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Top KPI Stat Cards: Row 1 (Products & Orders) + Row 2 (Total Sales & Statistics) */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleSelectProductsCard}
              className={`group flex cursor-pointer flex-col justify-between rounded-2xl border p-3.5 text-right transition-all duration-200 hover:-translate-y-1 hover:border-[#EA580C]/70 hover:bg-orange-50/40 hover:shadow-md active:translate-y-0 active:scale-[0.98] active:bg-orange-50 sm:p-5 ${
                activeTab === 'products'
                  ? 'border-[#111111]/30 bg-white shadow-sm'
                  : 'border-neutral-200 bg-white'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <p className="text-xs font-semibold text-neutral-500 group-hover:text-[#111111]">
                  عدد المنتجات
                </p>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 transition-colors group-hover:bg-[#EA580C] group-hover:text-white">
                  <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-1.5 text-2xl font-extrabold text-[#111111] tabular-nums sm:mt-2 sm:text-3xl">
                {products.length}
              </p>
              <p className="mt-1.5 text-[11px] font-semibold text-neutral-400 transition-colors group-hover:text-[#EA580C]">
                اضغط لعرض كل المنتجات
              </p>
            </button>

            <button
              type="button"
              onClick={handleSelectOrdersCard}
              className={`group flex cursor-pointer flex-col justify-between rounded-2xl border p-3.5 text-right transition-all duration-200 hover:-translate-y-1 hover:border-[#EA580C]/70 hover:bg-orange-50/40 hover:shadow-md active:translate-y-0 active:scale-[0.98] active:bg-orange-50 sm:p-5 ${
                activeTab === 'orders' && orderFilter === 'all'
                  ? 'border-[#111111]/30 bg-white shadow-sm'
                  : 'border-neutral-200 bg-white'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <p className="text-xs font-semibold text-neutral-500 group-hover:text-[#111111]">
                  عدد الطلبات
                </p>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 transition-colors group-hover:bg-[#EA580C] group-hover:text-white">
                  <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-1.5 text-2xl font-extrabold text-[#111111] tabular-nums sm:mt-2 sm:text-3xl">
                {orders.length}
              </p>
              <p className="mt-1.5 text-[11px] font-semibold text-neutral-400 transition-colors group-hover:text-[#EA580C]">
                اضغط لعرض كل الطلبات
              </p>
            </button>

            <button
              type="button"
              onClick={handleSelectSalesCard}
              className={`group flex cursor-pointer flex-col justify-between rounded-2xl border p-3.5 text-right transition-all duration-200 hover:-translate-y-1 hover:border-[#EA580C] hover:bg-orange-50/50 hover:shadow-md active:translate-y-0 active:scale-[0.98] active:bg-orange-100/70 sm:p-5 ${
                activeTab === 'orders' && orderFilter === 'delivered'
                  ? 'border-[#EA580C] bg-orange-50/40 shadow-sm'
                  : 'border-neutral-200 bg-white'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <p className="text-xs font-semibold text-neutral-500 group-hover:text-[#111111]">
                  إجمالي المبيعات
                </p>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-orange-50 text-[#EA580C] transition-colors group-hover:bg-[#EA580C] group-hover:text-white">
                  <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-1.5 text-xl font-extrabold text-[#EA580C] tabular-nums sm:mt-2 sm:text-3xl">
                {formatEGP(totalSales)}
              </p>
              <p className="mt-1.5 text-[11px] font-semibold text-neutral-400 transition-colors group-hover:text-[#EA580C]">
                اضغط لعرض طلبات تم التوصيل
              </p>
            </button>

            <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-3.5 sm:p-5">
              <p className="text-xs font-semibold text-neutral-500">الإحصائيات</p>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs font-bold text-[#111111] tabular-nums sm:mt-2 sm:text-sm">
                <span>تم التوصيل: {deliveredOrders}</span>
                <span className="text-amber-700">جديد: {pendingOrders}</span>
                <span className="text-[#EA580C]">عروض: {offersCount}</span>
              </div>
            </div>
          </div>

          {feedbackMsg && (
            <div
              role="status"
              className={`mb-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
                feedbackMsg.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {feedbackMsg.text}
            </div>
          )}

          {/* Tab 1: Products Table */}
          {activeTab === 'products' && (
            <section
              ref={productsSectionRef}
              className="scroll-mt-28 rounded-2xl border border-neutral-200 bg-white sm:scroll-mt-24"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-4 py-3.5 sm:px-6 sm:py-4">
                <h2 className="text-base font-extrabold text-[#111111] sm:text-lg">إدارة المنتجات</h2>
                <span className="text-xs font-bold text-neutral-500 tabular-nums">
                  الإجمالي: {products.length} منتج
                </span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-neutral-500">
                  جاري تحميل المنتجات...
                </div>
              ) : products.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-base font-bold text-[#111111]">لا توجد منتجات حالياً</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('add-product')}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#111111] px-5 text-sm font-bold text-white hover:bg-[#EA580C]"
                  >
                    إضافة أول منتج
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-bold text-neutral-500">
                      <tr>
                        <th className="px-5 py-3.5">الصورة</th>
                        <th className="px-5 py-3.5">اسم المنتج</th>
                        <th className="px-5 py-3.5">السعر</th>
                        <th className="px-5 py-3.5">السعر القديم</th>
                        <th className="px-5 py-3.5">الكمية</th>
                        <th className="px-5 py-3.5 text-left">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {products.map((product) => (
                        <tr key={product.id} className="transition-colors hover:bg-neutral-50/70">
                          <td className="px-5 py-3">
                            <div className="h-12 w-12 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  referrerPolicy="no-referrer"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-neutral-400">
                                  <Package className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 font-bold text-[#111111]">{product.name}</td>
                          <td className="px-5 py-3 font-bold text-[#111111] tabular-nums">
                            {formatEGP(product.price)}
                          </td>
                          <td className="px-5 py-3 text-neutral-500 tabular-nums">
                            {product.old_price && product.old_price > product.price ? (
                              <span className="line-through">{formatEGP(product.old_price)}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-5 py-3 font-semibold text-neutral-700 tabular-nums">
                            {product.quantity !== null && product.quantity !== undefined
                              ? product.quantity
                              : '—'}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setPreviewProduct(product)}
                                aria-label={`معاينة ${product.name}`}
                                title="معاينة"
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-bold text-[#111111] transition-colors hover:border-[#EA580C] hover:text-[#EA580C]"
                              >
                                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>معاينة</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(product)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-bold text-[#111111] transition-colors hover:border-[#111111]"
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>تعديل</span>
                              </button>
                              {confirmDeleteId === product.id ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={busyId === product.id}
                                    onClick={() => void handleConfirmDeleteProduct(product)}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 whitespace-nowrap transition-colors hover:bg-red-600 hover:text-white disabled:opacity-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>{busyId === product.id ? 'جاري الحذف...' : 'تأكيد الحذف'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busyId === product.id}
                                    onClick={() => setConfirmDeleteId(null)}
                                    aria-label="إلغاء الحذف"
                                    title="إلغاء"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition-colors hover:text-[#111111] disabled:opacity-50"
                                  >
                                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={busyId === product.id}
                                  onClick={() => setConfirmDeleteId(product.id)}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>حذف</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Tab 2: Add Product Form */}
          {activeTab === 'add-product' && (
            <section className="mx-auto max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label
                    htmlFor="new-name"
                    className="mb-1.5 block text-sm font-semibold text-[#111111]"
                  >
                    اسم المنتج
                  </label>
                  <input
                    id="new-name"
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="مثال: مانجو عويس طازجة"
                    className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm text-[#111111] focus:border-[#EA580C] focus:outline-none"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="new-price"
                      className="mb-1.5 block text-sm font-semibold text-[#111111]"
                    >
                      السعر الحالي (ج.م)
                    </label>
                    <input
                      id="new-price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="65"
                      className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm text-[#111111] tabular-nums focus:border-[#EA580C] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="new-old-price"
                      className="mb-1.5 block text-sm font-semibold text-[#111111]"
                    >
                      السعر القديم (للمحلات)
                    </label>
                    <input
                      id="new-old-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newOldPrice}
                      onChange={(e) => setNewOldPrice(e.target.value)}
                      placeholder="85"
                      className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm text-[#111111] tabular-nums focus:border-[#EA580C] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="new-quantity"
                      className="mb-1.5 block text-sm font-semibold text-[#111111]"
                    >
                      الكمية
                    </label>
                    <input
                      id="new-quantity"
                      type="number"
                      step="1"
                      min="0"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      placeholder="50"
                      className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm text-[#111111] tabular-nums focus:border-[#EA580C] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <span className="mb-1.5 block text-sm font-semibold text-[#111111]">
                    صورة المنتج
                  </span>

                  <input
                    ref={addFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSelectAddImage}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      disabled={compressingNew}
                      onClick={() => addFileInputRef.current?.click()}
                      className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-300 bg-neutral-50 px-5 text-sm font-bold text-[#111111] transition-colors hover:border-[#EA580C] hover:bg-white disabled:opacity-60"
                    >
                      <ImagePlus className="h-4 w-4 text-[#EA580C]" aria-hidden="true" />
                      <span>{compressingNew ? 'جاري ضغط الصورة...' : 'اختر صورة'}</span>
                    </button>

                    {newCompressedImage && (
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
                          <img
                            src={newCompressedImage.previewUrl}
                            alt="معاينة صورة المنتج"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewCompressedImage(null)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          إزالة
                        </button>
                      </div>
                    )}
                  </div>

                  {newCompressedImage && (
                    <p className="mt-2 text-xs font-semibold text-emerald-700 tabular-nums">
                      {newCompressedImage.summaryText}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="new-desc"
                    className="mb-1.5 block text-sm font-semibold text-[#111111]"
                  >
                    الوصف
                  </label>
                  <textarea
                    id="new-desc"
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="اكتب مواصفات ومميزات المنتج للعملاء..."
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-[#111111] focus:border-[#EA580C] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingNew || compressingNew}
                    className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#EA580C] px-6 text-sm font-bold text-white transition-colors hover:bg-[#C2410C] disabled:opacity-60"
                  >
                    {savingNew ? 'جاري الحفظ...' : 'حفظ ونشر المنتج'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className="flex h-11 items-center justify-center rounded-xl border border-neutral-200 px-5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Tab 3: Orders Table */}
          {activeTab === 'orders' && (
            <section
              ref={ordersSectionRef}
              className="scroll-mt-28 rounded-2xl border border-neutral-200 bg-white sm:scroll-mt-24"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3.5 sm:px-6 sm:py-4">
                <h2 className="text-base font-extrabold text-[#111111] sm:text-lg">إدارة الطلبات</h2>

                {/* Orders Status Filters */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderFilter('all')}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors tabular-nums sm:px-3 ${
                      orderFilter === 'all'
                        ? 'bg-[#111111] text-white'
                        : 'border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    الكل ({orders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderFilter('delivered')}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors tabular-nums sm:px-3 ${
                      orderFilter === 'delivered'
                        ? 'bg-emerald-600 text-white'
                        : 'border border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-emerald-300 hover:text-emerald-700'
                    }`}
                  >
                    تم التوصيل ({deliveredOrders})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderFilter('new')}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors tabular-nums sm:px-3 ${
                      orderFilter === 'new'
                        ? 'bg-[#EA580C] text-white'
                        : 'border border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-amber-300 hover:text-[#EA580C]'
                    }`}
                  >
                    جديد ({pendingOrders})
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-neutral-500">
                  جاري تحميل الطلبات...
                </div>
              ) : orders.length === 0 ? (
                <div className="p-10 text-center text-sm font-semibold text-neutral-500">
                  لا توجد طلبات مسجلة حتى الآن.
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm font-bold text-[#111111]">
                    {orderFilter === 'delivered'
                      ? 'لا توجد طلبات بحالة "تم التوصيل" حالياً.'
                      : 'لا توجد طلبات جديدة حالياً.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOrderFilter('all')}
                    className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-[#111111] px-4 text-xs font-bold text-white hover:bg-[#EA580C]"
                  >
                    عرض كل الطلبات
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-bold text-neutral-500">
                      <tr>
                        <th className="px-4 py-3.5">العميل</th>
                        <th className="px-4 py-3.5">التليفون</th>
                        <th className="px-4 py-3.5">العنوان</th>
                        <th className="px-4 py-3.5">المنتجات المطلوبة</th>
                        <th className="px-4 py-3.5">الإجمالي</th>
                        <th className="px-4 py-3.5">الحالة</th>
                        <th className="px-4 py-3.5 text-left">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredOrders.map((order) => {
                        const isDelivered = order.status === 'تم التوصيل';
                        return (
                          <tr key={order.id} className="align-top hover:bg-neutral-50/70">
                            <td className="px-4 py-3.5 font-bold text-[#111111]">
                              {order.customer_name}
                            </td>
                            <td className="px-4 py-3.5 font-medium text-neutral-700 tabular-nums">
                              <span dir="ltr">{order.phone}</span>
                            </td>
                            <td className="max-w-[200px] px-4 py-3.5 text-neutral-600">
                              {order.address}
                            </td>
                            <td className="min-w-[200px] px-4 py-3.5 text-neutral-700">
                              <ul className="space-y-1">
                                {order.items.map((item, idx) => (
                                  <li key={idx} className="text-xs">
                                    <span className="font-semibold text-[#111111]">
                                      {item.name}
                                    </span>{' '}
                                    <span className="text-neutral-500 tabular-nums">
                                      (×{item.quantity})
                                    </span>
                                    {item.notes && (
                                      <span className="block text-neutral-400">
                                        ملاحظة: {item.notes}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td className="px-4 py-3.5 font-extrabold text-[#111111] tabular-nums">
                              {order.total > 0 ? formatEGP(order.total) : 'تسعير جملة'}
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap ${
                                  isDelivered
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-amber-50 text-amber-800'
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={busyId === order.id}
                                  onClick={() => handleToggleOrderStatus(order)}
                                  className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-bold text-[#111111] whitespace-nowrap transition-colors hover:border-[#EA580C] hover:text-[#EA580C] disabled:opacity-50"
                                >
                                  {isDelivered ? 'تعيين كـ جديد' : 'تم التوصيل'}
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === order.id}
                                  onClick={() => handleDeleteOrder(order.id)}
                                  aria-label="حذف الطلب"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="تعديل المنتج"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b border-neutral-100 pb-4">
              <h3 className="text-lg font-extrabold text-[#111111]">تعديل المنتج</h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                aria-label="إغلاق"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 hover:text-[#111111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label
                  htmlFor="edit-name"
                  className="mb-1.5 block text-sm font-semibold text-[#111111]"
                >
                  اسم المنتج
                </label>
                <input
                  id="edit-name"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-neutral-300 px-4 text-sm text-[#111111] focus:border-[#EA580C] focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="edit-price"
                    className="mb-1.5 block text-sm font-semibold text-[#111111]"
                  >
                    السعر (ج.م)
                  </label>
                  <input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-300 px-4 text-sm text-[#111111] tabular-nums focus:border-[#EA580C] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-old-price"
                    className="mb-1.5 block text-sm font-semibold text-[#111111]"
                  >
                    السعر القديم
                  </label>
                  <input
                    id="edit-old-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editOldPrice}
                    onChange={(e) => setEditOldPrice(e.target.value)}
                    placeholder="اختياري"
                    className="h-11 w-full rounded-xl border border-neutral-300 px-4 text-sm text-[#111111] tabular-nums focus:border-[#EA580C] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-quantity"
                    className="mb-1.5 block text-sm font-semibold text-[#111111]"
                  >
                    الكمية
                  </label>
                  <input
                    id="edit-quantity"
                    type="number"
                    step="1"
                    min="0"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    placeholder="مثال: 50"
                    className="h-11 w-full rounded-xl border border-neutral-300 px-4 text-sm text-[#111111] tabular-nums focus:border-[#EA580C] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-semibold text-[#111111]">
                  صورة المنتج
                </span>

                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSelectEditImage}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    disabled={compressingEdit}
                    onClick={() => editFileInputRef.current?.click()}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-300 bg-neutral-50 px-5 text-sm font-bold text-[#111111] transition-colors hover:border-[#EA580C] hover:bg-white disabled:opacity-60"
                  >
                    <ImagePlus className="h-4 w-4 text-[#EA580C]" aria-hidden="true" />
                    <span>{compressingEdit ? 'جاري ضغط الصورة...' : 'اختر صورة'}</span>
                  </button>

                  {(editCompressedImage?.previewUrl || editingProduct.image_url) && (
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
                        <img
                          src={editCompressedImage?.previewUrl || editingProduct.image_url}
                          alt="معاينة صورة المنتج"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      {editCompressedImage && (
                        <button
                          type="button"
                          onClick={() => setEditCompressedImage(null)}
                          className="text-xs font-semibold text-neutral-600 hover:text-red-600 hover:underline"
                        >
                          الإبقاء على القديمة
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {editCompressedImage ? (
                  <p className="mt-2 text-xs font-semibold text-emerald-700 tabular-nums">
                    {editCompressedImage.summaryText}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-neutral-500">
                    إذا لم تختر صورة جديدة سيتم الاحتفاظ بالصورة الحالية.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="edit-desc"
                  className="mb-1.5 block text-sm font-semibold text-[#111111]"
                >
                  الوصف
                </label>
                <textarea
                  id="edit-desc"
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm text-[#111111] focus:border-[#EA580C] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingEdit || compressingEdit}
                  className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#EA580C] text-sm font-bold text-white transition-colors hover:bg-[#C2410C] disabled:opacity-60"
                >
                  {savingEdit ? 'جاري التحديث...' : 'حفظ التعديلات'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex h-11 items-center justify-center rounded-xl border border-neutral-200 px-5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Eye Preview Modal */}
      {previewProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="معاينة المنتج"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#EA580C]" aria-hidden="true" />
                <h3 className="text-base font-extrabold text-[#111111]">معاينة المنتج</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProduct(null)}
                aria-label="إغلاق المعاينة"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:text-[#111111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="aspect-[4/3] w-full bg-neutral-100">
              {previewProduct.image_url ? (
                <img
                  src={previewProduct.image_url}
                  alt={previewProduct.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-neutral-400">
                  <Package className="h-12 w-12" />
                </div>
              )}
            </div>

            <div className="space-y-3 p-5">
              <h4 className="text-lg font-extrabold text-[#111111]">{previewProduct.name}</h4>

              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-xl font-extrabold text-[#EA580C] tabular-nums">
                  {formatEGP(previewProduct.price)}
                </span>
                {previewProduct.old_price && previewProduct.old_price > previewProduct.price && (
                  <span className="text-sm text-neutral-400 line-through tabular-nums">
                    {formatEGP(previewProduct.old_price)}
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold text-neutral-700 tabular-nums">
                الكمية المتوفرة:{' '}
                <span className="font-extrabold text-[#111111]">
                  {previewProduct.quantity !== null && previewProduct.quantity !== undefined
                    ? previewProduct.quantity
                    : 'غير محددة'}
                </span>
              </p>

              {previewProduct.description && (
                <p className="text-sm leading-relaxed text-neutral-600">
                  {previewProduct.description}
                </p>
              )}

              <button
                type="button"
                onClick={() => setPreviewProduct(null)}
                className="mt-2 flex h-10 w-full items-center justify-center rounded-xl bg-[#111111] text-sm font-bold text-white transition-colors hover:bg-[#EA580C]"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Admin Password Modal */}
      {isResetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="إعادة تعيين كلمة السر"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#EA580C]" aria-hidden="true" />
                <h3 className="text-lg font-extrabold text-[#111111]">إعادة تعيين كلمة السر</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                aria-label="إغلاق"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 hover:text-[#111111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="current-admin-pass"
                  className="mb-1.5 block text-sm font-semibold text-[#111111]"
                >
                  كلمة السر الحالية
                </label>
                <input
                  id="current-admin-pass"
                  type="password"
                  dir="ltr"
                  required
                  value={currentPassInput}
                  onChange={(e) => {
                    setCurrentPassInput(e.target.value);
                    if (resetPassError) setResetPassError('');
                  }}
                  placeholder="••••••"
                  className="h-11 w-full rounded-xl border border-neutral-300 px-4 text-center text-sm tracking-widest text-[#111111] focus:border-[#EA580C] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="new-admin-pass"
                  className="mb-1.5 block text-sm font-semibold text-[#111111]"
                >
                  كلمة السر الجديدة
                </label>
                <input
                  id="new-admin-pass"
                  type="password"
                  dir="ltr"
                  required
                  value={newPassInput}
                  onChange={(e) => {
                    setNewPassInput(e.target.value);
                    if (resetPassError) setResetPassError('');
                  }}
                  placeholder="••••••"
                  className="h-11 w-full rounded-xl border border-neutral-300 px-4 text-center text-sm tracking-widest text-[#111111] focus:border-[#EA580C] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-admin-pass"
                  className="mb-1.5 block text-sm font-semibold text-[#111111]"
                >
                  تأكيد كلمة السر الجديدة
                </label>
                <input
                  id="confirm-admin-pass"
                  type="password"
                  dir="ltr"
                  required
                  value={confirmPassInput}
                  onChange={(e) => {
                    setConfirmPassInput(e.target.value);
                    if (resetPassError) setResetPassError('');
                  }}
                  placeholder="••••••"
                  className="h-11 w-full rounded-xl border border-neutral-300 px-4 text-center text-sm tracking-widest text-[#111111] focus:border-[#EA580C] focus:outline-none"
                />
              </div>

              {resetPassError && (
                <p role="alert" className="text-center text-sm font-semibold text-red-600">
                  {resetPassError}
                </p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#EA580C] text-sm font-bold text-white transition-colors hover:bg-[#C2410C]"
                >
                  حفظ كلمة السر
                </button>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex h-11 items-center justify-center rounded-xl border border-neutral-200 px-5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
