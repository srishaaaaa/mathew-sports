"use client";

import { useState, useRef, useEffect } from "react";
import {
  User,
  Receipt,
  Search,
  ChevronDown,
  X,
  PackagePlus,
  ShoppingBag,
  Trash2,
  Plus,
  TrendingUp,
  Trophy,
  IndianRupee,
  BarChart2,
  Package,
  List,
  Globe,
  Zap,
  Menu,
  History,
  ChevronLeft,
  ChevronRight,
  Percent,
  Calendar,
  Download,
  LogOut,
  Eye,
  EyeOff,
  ShieldCheck,
  Shield,
  Lock,
  Printer,
  Save,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import InstallAppButton from "@/app/install-app-button";
import { BRANCH } from "@/lib/branches/pos2";
import {
  createProductAction,
  deleteProductAction,
  deleteOrderAction,
  listOrdersAction,
  listProductsAction,
  orderExistsAction,
  createOrderAction,
  updateProductAction,
  logoutAction,
  getThemeAction,
  saveThemeAction,
  getShopOverridesAction,
  saveShopProfileAction,
  listAdvanceOrdersAction,
  createAdvanceOrderAction,
  setAdvanceStatusAction,
  finalizeAdvanceOrderAction,
  cancelAdvanceOrderAction,
  deleteAdvanceOrderAction,
} from "@/app/pos2/actions";
import PaymentPicker, { initialPayState, payStateError, splitParts, splitTotal, type PayState } from "@/app/_terminals/advance/payment-picker";
import AdvanceOrdersPanel from "@/app/_terminals/advance/advance-orders-panel";
import CreateAdvanceModal, { type AdvanceCart } from "@/app/_terminals/advance/create-advance-modal";
import type { AdvanceActions } from "@/app/_terminals/advance/shared";
import { cgstSgst, round2, type PaymentMode } from "@/lib/payments";

// Settings → store details for this branch.
const SETTINGS_ACTIONS: SettingsActions = {
  getOverrides: getShopOverridesAction,
  saveProfile: saveShopProfileAction,
};

// Advance-order server actions for this branch (stable object for the panel).
const ADVANCE_ACTIONS: AdvanceActions = {
  list: listAdvanceOrdersAction,
  create: createAdvanceOrderAction,
  setStatus: setAdvanceStatusAction,
  finalize: finalizeAdvanceOrderAction,
  cancel: cancelAdvanceOrderAction,
  remove: deleteAdvanceOrderAction,
};
import { useBranchTheme } from "@/app/components/branch-theme";
import SettingsModal, { type SettingsActions } from "@/app/_terminals/settings/settings-modal";
import type { ShopProfile } from "@/lib/shop";
import { Palette, LayoutDashboard, Clock as ClockIcon, Wallet, Check as CheckIcon, Eye as EyeIcon, Percent as PercentIcon, CalendarDays as CalendarIcon, Search as SearchIcon } from "lucide-react";
import OrderDetailsModal from "@/app/_terminals/order-details-modal";
import BillGeneratedModal from "@/app/_terminals/bill-generated-modal";
import { PrintSettingsModal } from "@/app/_terminals/advance/shared";

type CatalogItem = {
  id: string;
  name: string;
  desc?: string;
  price?: number;
};

// The catalog lives entirely in the `products` table — the built-in items were
// seeded there by migration 0002_seed_default_products.sql.

type OrderItem = {
  id: string;
  name: string;
  desc: string;
  price: number;
  qty: number;
};

type CompletedOrder = {
  id: string;
  customerName: string;
  customerPhone: string;
  source: "ONLINE" | "OFFLINE";
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountType?: "PERCENT" | "FIXED";
  discountValue?: number;
  deliveryFee: number;
  grandTotal: number;
  cashReceived: number;
  paymentMethod?: PaymentMode;
  splitCash?: number;
  splitGpay?: number;
  splitCard?: number;
  advanceOrderId?: string | null;
  date: string;
  status: "Completed" | "Pending";
};

const SearchableItemInput = ({
  item,
  catalog,
  updateItem,
}: {
  item: OrderItem;
  catalog: CatalogItem[];
  updateItem: (id: string, field: keyof OrderItem, value: any) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSearch, setInternalSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCatalog = catalog.filter(
    (c) =>
      c.name.toLowerCase().includes(internalSearch.toLowerCase()) ||
      (c.desc && c.desc.toLowerCase().includes(internalSearch.toLowerCase())),
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [internalSearch, isOpen]);

  useEffect(() => {
    if (listRef.current && listRef.current.children[selectedIndex]) {
      const activeItem = listRef.current.children[selectedIndex] as HTMLElement;
      activeItem.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && e.key !== "Escape") {
      setIsOpen(true);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredCatalog.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCatalog[selectedIndex]) {
        const catItem = filteredCatalog[selectedIndex];
        updateItem(item.id, "name", catItem.name);
        updateItem(item.id, "desc", catItem.desc || "");
        if (catItem.price !== undefined) {
          updateItem(item.id, "price", catItem.price);
        }
        setIsOpen(false);
        setTimeout(() => {
          const priceInput = document.getElementById(`price-${item.id}`);
          if (priceInput) priceInput.focus();
        }, 50);
      } else if (internalSearch.trim()) {
        updateItem(item.id, "name", internalSearch.trim());
        updateItem(item.id, "desc", "");
        setIsOpen(false);
        setTimeout(() => {
          const priceInput = document.getElementById(`price-${item.id}`);
          if (priceInput) priceInput.focus();
        }, 50);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        className={`relative cursor-pointer bg-[#FFFFFF] border ${isOpen ? "border-black/10 bg-white" : "border-black/10"} hover:border-black/10 rounded-lg px-4 py-2.5 transition-colors flex justify-between items-center group`}
        onClick={() => {
          setIsOpen(!isOpen);
          setInternalSearch("");
        }}
      >
        <div className="flex-1">
          <div className="font-semibold text-[#000000] text-sm">
            {item.name || (
              <span className="text-[#000000] font-normal">
                Select an item...
              </span>
            )}
          </div>
          {item.desc && !isOpen && (
            <div className="text-[10px] text-[#000000] mt-0.5">{item.desc}</div>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#000000] group-hover:text-[var(--brand-primary)] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#FFFFFF] border border-black/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.12)] overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 border-b border-black/10 bg-[#FFFFFF]">
            <div className="bg-[#FFFFFF] flex items-center px-3 py-2 rounded-md">
              <Search className="w-4 h-4 text-[#000000] mr-2" />
              <input
                type="text"
                placeholder="Search catalog..."
                className="w-full bg-transparent text-[#000000] text-sm focus:outline-none placeholder:text-[#000000]"
                value={internalSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredCatalog.length > 0 ? (
              <ul className="py-1" ref={listRef}>
                {filteredCatalog.map((catItem, idx) => (
                  <li
                    key={catItem.id}
                    className={`px-5 py-3 cursor-pointer border-b border-transparent last:border-0 transition-colors ${idx === selectedIndex ? "bg-[#FFFFFF] border-l-4 border-l-[var(--brand-primary)]" : "hover:bg-[#FFFFFF] border-l-4 border-l-transparent"}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      updateItem(item.id, "name", catItem.name);
                      updateItem(item.id, "desc", catItem.desc || "");
                      if (catItem.price !== undefined) {
                        updateItem(item.id, "price", catItem.price);
                      }
                      setIsOpen(false);
                      setTimeout(() => {
                        const priceInput = document.getElementById(
                          `price-${item.id}`,
                        );
                        if (priceInput) priceInput.focus();
                      }, 50);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      updateItem(item.id, "name", catItem.name);
                      updateItem(item.id, "desc", catItem.desc || "");
                      if (catItem.price !== undefined) {
                        updateItem(item.id, "price", catItem.price);
                      }
                      setIsOpen(false);
                      setTimeout(() => {
                        const priceInput = document.getElementById(
                          `price-${item.id}`,
                        );
                        if (priceInput) priceInput.focus();
                      }, 50);
                    }}
                    onClick={() => {
                      updateItem(item.id, "name", catItem.name);
                      updateItem(item.id, "desc", catItem.desc || "");
                      if (catItem.price !== undefined) {
                        updateItem(item.id, "price", catItem.price);
                      }
                      setIsOpen(false);
                      setTimeout(() => {
                        const priceInput = document.getElementById(
                          `price-${item.id}`,
                        );
                        if (priceInput) priceInput.focus();
                      }, 50);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="text-sm font-bold text-[#000000]">
                      {catItem.name}
                    </div>
                    {catItem.desc && (
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#000000] mt-1">
                        {catItem.desc}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-6 text-sm text-[#000000] text-center font-semibold">
                Press Enter to use "{internalSearch}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export type TerminalProps = {
  /** Signed-in account, checked on the server before this screen loads. */
  role: "admin" | "staff";
  userName: string;
  /** This branch's live store details (Settings → Store details). */
  shop: ShopProfile;
};

export default function POS2Billing({ role, userName, shop: initialShop }: TerminalProps) {
  // Store details can be edited in Settings; keep the latest here.
  const [shop, setShop] = useState<ShopProfile>(initialShop);
  const [isMounted, setIsMounted] = useState(false);
  // Branch theme: saved per branch in the database, picked in Settings.
  const { themeId, setThemeId } = useBranchTheme(BRANCH, getThemeAction);
  const [showSettings, setShowSettings] = useState(false);
  // Login happens on /login; this screen only loads for an allowed account.
  const isAuthorized = true;

  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<
    "billing" | "advance" | "orders" | "analytics"
  >("billing");
  const [isOnline, setIsOnline] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState<OrderItem[]>([
    { id: "1", name: "", desc: "", price: 0, qty: 1 },
  ]);
  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"fixed" | "percent">(
    "fixed",
  );
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMode>("CASH");
  // Split payment parts (used when paymentMethod === "SPLIT").
  const [splitPay, setSplitPay] = useState<PayState>(initialPayState);
  const [advanceCart, setAdvanceCart] = useState<AdvanceCart | null>(null);
  // Order History → eye button
  const [detailsOrder, setDetailsOrder] = useState<CompletedOrder | null>(null);
  const [advanceRefreshKey, setAdvanceRefreshKey] = useState(0);
  // Analytics: all bills, GST invoices only, or non-GST bills only.
  const [analyticsBillType, setAnalyticsBillType] = useState<"all" | "gst" | "nongst">("all");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [applyGST, setApplyGST] = useState<boolean>(false);
  const [gstPercentage, setGstPercentage] = useState<number>(5);

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  // Distinguishes "still loading" from "genuinely empty", so the picker never
  // flashes a misleading `No items match ""` before the fetch lands.
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);

  // Analytics filter/navigation states
  const [analyticsPeriod, setAnalyticsPeriod] = useState<
    "all" | "today" | "week" | "month" | "year" | "custom"
  >("all");
  const [analyticsStartDate, setAnalyticsStartDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [analyticsEndDate, setAnalyticsEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [analyticsSubTab, setAnalyticsSubTab] = useState<
    "revenue" | "today" | "products" | "coupons"
  >("revenue");
  const [analyticsSearchPhone, setAnalyticsSearchPhone] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  // Analytics → Coupons (discount report, as in IGMOLS)
  const [couponSearchQuery, setCouponSearchQuery] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = async () => {
    await logoutAction();
    window.location.replace("/login?branch=pos2");
  };

  const selectTab = (tab: "billing" | "advance" | "orders" | "analytics") => {
    setActiveTab(tab);
    // On mobile/tablet the sidebar is an overlay — close it after navigating.
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const productsData = await listProductsAction();
      setCatalog(
        productsData.map((p) => ({
          id: p.id,
          name: p.name,
          desc: p.description,
          price: p.default_price || undefined,
        })),
      );

      const ordersData = await listOrdersAction();
      setOrders(
        ordersData.map((o) => {
          let phone = o.customer_phone || "";
          let method: PaymentMode = (o.payment_mode as PaymentMode) || "CASH";
          if (phone.includes("_")) {
            const parts = phone.split("_");
            phone = parts[0];
            const pm = parts[1];
            if (!o.payment_mode && (pm === "CARD" || pm === "GPAY" || pm === "SPLIT")) {
              method = pm;
            }
          }
          return {
            id: o.id,
            customerName: o.customer_name || "Guest",
            customerPhone: phone,
            source: o.source,
            items: o.order_items.map((i, idx) => ({
              id: `${o.id}-${idx}`,
              name: i.snapshot_name,
              desc: i.snapshot_desc || "",
              price: i.snapshot_price,
              qty: i.quantity,
            })),
            subtotal: o.subtotal,
            discount: o.discount_amount,
            discountType: o.discount_type,
            discountValue: o.discount_value,
            deliveryFee: o.delivery_fee,
            grandTotal: o.grand_total,
            cashReceived: o.cash_received,
            paymentMethod: method,
            splitCash: o.split_cash ?? 0,
            splitGpay: o.split_gpay ?? 0,
            splitCard: o.split_card ?? 0,
            advanceOrderId: o.advance_order_id ?? null,
            date: o.created_at,
            status: (o.status === "COMPLETED" ? "Completed" : "Pending") as
              | "Completed"
              | "Pending",
          };
        }),
      );
    } catch (err) {
      console.error("Error refreshing data:", err);
    } finally {
      setIsRefreshing(false);
      setIsCatalogLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [isAuthorized]);

  // Modal State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CompletedOrder | null>(
    null,
  );
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatPrice, setNewCatPrice] = useState<number | "">("");

  const [activeCatalogRowId, setActiveCatalogRowId] = useState<string | null>(
    null,
  );
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogTargetRowId, setCatalogTargetRowId] = useState<string | null>(
    null,
  );

  // Generic "Are you sure?" confirmation dialog — reused for destructive actions.
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Billing: "Save Order" & "Complete Sale" states
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [savedOrderId, setSavedOrderId] = useState<string | null>(null);
  const [isCompletingSale, setIsCompletingSale] = useState(false);
  const [saleCompletedPrompt, setSaleCompletedPrompt] = useState<{
    orderId: string;
    customerName: string;
    customerPhone: string;
    grandTotal: number;
    orderSnapshot: OrderSnapshot;
  } | null>(null);
  const [promptPhone, setPromptPhone] = useState("");
  const [showPromptPhoneInput, setShowPromptPhoneInput] = useState(false);
  const [billPrintUrl, setBillPrintUrl] = useState<string | null>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // Order search/filters state
  const [orderSearchId, setOrderSearchId] = useState("");
  const [orderSearchName, setOrderSearchName] = useState("");
  const [orderSearchPhone, setOrderSearchPhone] = useState("");
  const [orderFilterSource, setOrderFilterSource] = useState("ALL");
  const [orderFilterStatus, setOrderFilterStatus] = useState("ALL");
  const [historyPeriod, setHistoryPeriod] = useState<
    "all" | "today" | "week" | "month" | "year" | "custom"
  >("all");
  const [historyStartDate, setHistoryStartDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [historyEndDate, setHistoryEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  const addItem = () => {
    setItems([
      ...items,
      { id: Math.random().toString(), name: "", desc: "", price: 0, qty: 1 },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof OrderItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const clearOrder = () => {
    setItems([
      { id: Math.random().toString(), name: "", desc: "", price: 0, qty: 1 },
    ]);
  };

  const addToCatalog = async () => {
    if (!newCatName.trim()) return;

    const details = {
      name: newCatName,
      description: newCatDesc,
      default_price: newCatPrice || 0,
    };

    if (editingCatalogId) {
      const saved = await updateProductAction(editingCatalogId, details);

      if (!saved) {
        console.error("Could not find catalog item to update", editingCatalogId);
        return;
      }

      setCatalog(
        catalog.map((c) =>
          c.id === editingCatalogId
            ? {
                id: saved.id,
                name: saved.name,
                desc: saved.description,
                price: saved.default_price || undefined,
              }
            : c,
        ),
      );
      setNewCatName("");
      setNewCatDesc("");
      setNewCatPrice("");
      setEditingCatalogId(null);
      setShowCatalogModal(false);
      return;
    }

    const created = await createProductAction(details);

    setCatalog([
      ...catalog,
      {
        id: created.id,
        name: created.name,
        desc: created.description,
        price: created.default_price || undefined,
      },
    ]);

    if (catalogTargetRowId) {
      updateItem(catalogTargetRowId, "name", created.name);
      updateItem(catalogTargetRowId, "price", created.default_price || 0);
      setCatalogTargetRowId(null);
    }

    setNewCatName("");
    setNewCatDesc("");
    setNewCatPrice("");
    setShowCatalogModal(false);
  };

  const deleteFromCatalog = async (id: string) => {
    // Only drop it from the UI once the database write has actually succeeded,
    // so a failure can't leave the screen disagreeing with the catalog.
    await deleteProductAction(id);
    setCatalog((prev) => prev.filter((c) => c.id !== id));
  };

  const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);
  const calculatedDiscount =
    discountType === "percent"
      ? subtotal * (discountValue / 100)
      : discountValue;
  const afterDiscount = Math.max(0, subtotal - calculatedDiscount);
  const gstAmount = applyGST ? afterDiscount * (gstPercentage / 100) : 0;
  const grandTotal = afterDiscount + gstAmount + deliveryFee;

  const randomInvoiceSuffix = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randStr = "";
    for (let i = 0; i < 5; i++) {
      randStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return randStr;
  };

  const generateOrderId = async () => {
    const currentYear = new Date().getFullYear();
    let attempts = 0;
    try {
      while (attempts < 10) {
        const tempId = `${BRANCH.invoicePrefix}-${currentYear}-${randomInvoiceSuffix()}`;
        if (
          !orders.some((o) => o.id === tempId) &&
          !(await orderExistsAction(tempId))
        ) {
          return tempId;
        }
        attempts++;
      }
    } catch (err) {
      console.error("Error generating secure random invoice number:", err);
    }
    return `${BRANCH.invoicePrefix}-${currentYear}-${randomInvoiceSuffix()}`;
  };

  type OrderSnapshot = {
    id: string;
    customerName: string;
    customerPhone: string;
    subtotal: number;
    discount: number;
    applyGST: boolean;
    gstPercentage: number;
    gstAmount: number;
    grandTotal: number;
    paymentMethod?: PaymentMode;
    // For the "Bill Generated" screen
    items: { name: string; qty: number; price: number }[];
    amountReceived: number;
    split?: { cash: number; gpay: number; card: number };
  };

  // Validates the current cart, writes the order to the database, updates local
  // state and resets the form. Returns a snapshot for messaging, or null if the
  // cart was invalid or the write failed.
  const persistCurrentOrder = async (): Promise<OrderSnapshot | null> => {
    // Strict validation: every row must have a name and a price > 0.
    const hasInvalidItem = items.some(
      (i) =>
        !i.name ||
        i.name.trim() === "" ||
        i.price === undefined ||
        i.price <= 0,
    );
    if (hasInvalidItem || items.length === 0) {
      alert(
        "Please ensure all items have a valid name and a price greater than 0. Remove any empty rows before proceeding.",
      );
      return null;
    }

    const splitError = paymentMethod === "SPLIT" ? payStateError({ ...splitPay, mode: "SPLIT" }, grandTotal) : "";
    if (splitError) {
      alert(`Split payment: ${splitError}`);
      return null;
    }
    const split = paymentMethod === "SPLIT" ? splitParts(splitPay, grandTotal) : {};
    const splitCash = paymentMethod === "SPLIT" ? round2(split.CASH ?? 0) : paymentMethod === "CASH" ? grandTotal : 0;
    const splitGpay = paymentMethod === "SPLIT" ? round2(split.GPAY ?? 0) : paymentMethod === "GPAY" ? grandTotal : 0;
    const splitCard = paymentMethod === "SPLIT" ? round2(split.CARD ?? 0) : paymentMethod === "CARD" ? grandTotal : 0;

    const newOrderId = await generateOrderId();
    const itemsToSave = items;
    const createdAt = new Date().toISOString();
    const snapshot: OrderSnapshot = {
      id: newOrderId,
      customerName: customerName || "Guest",
      customerPhone,
      subtotal,
      discount: calculatedDiscount,
      applyGST,
      gstPercentage,
      gstAmount,
      grandTotal,
      paymentMethod,
      items: items.filter((i) => i.name).map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
      amountReceived:
        paymentMethod === "CASH"
          ? cashReceived > 0 ? cashReceived : grandTotal
          : paymentMethod === "SPLIT"
            ? splitTotal(splitPay)
            : grandTotal,
      split: paymentMethod === "SPLIT" ? { cash: splitCash, gpay: splitGpay, card: splitCard } : undefined,
    };

    const phoneToSave = customerPhone ? `${customerPhone}_${paymentMethod}` : `_${paymentMethod}`;
    const actualCashReceived = paymentMethod === "CASH" ? cashReceived : grandTotal;

    try {
      await createOrderAction({
        id: newOrderId,
        customer_name: customerName || "Guest",
        customer_phone: phoneToSave,
        source: isOnline ? "ONLINE" : "OFFLINE",
        status: "COMPLETED",
        subtotal,
        discount_type: discountType === "percent" ? "PERCENT" : "FIXED",
        discount_value: discountValue,
        discount_amount: calculatedDiscount,
        delivery_fee: deliveryFee,
        grand_total: grandTotal,
        cash_received: actualCashReceived,
        created_at: createdAt,
        payment_mode: paymentMethod,
        split_cash: splitCash,
        split_gpay: splitGpay,
        split_card: splitCard,
        order_items: [
          ...itemsToSave.map((i) => ({
            snapshot_name: i.name,
            snapshot_desc: i.desc,
            snapshot_price: i.price,
            quantity: i.qty,
          })),
          ...(applyGST && gstAmount > 0
            ? [
                {
                  snapshot_name: `GST (${gstPercentage}%)`,
                  snapshot_desc: "",
                  snapshot_price: gstAmount,
                  quantity: 1,
                },
              ]
            : []),
        ],
      });
    } catch (err) {
      console.error("Error saving order:", err);
      alert("Could not save this order. Please check your connection and try again.");
      return null;
    }

    const newOrder: CompletedOrder = {
      id: newOrderId,
      customerName: customerName || "Guest",
      customerPhone,
      source: isOnline ? "ONLINE" : "OFFLINE",
      items: [
        ...itemsToSave,
        ...(applyGST && gstAmount > 0
          ? [
              {
                id: Math.random().toString(),
                name: `GST (${gstPercentage}%)`,
                desc: "",
                price: gstAmount,
                qty: 1,
              },
            ]
          : []),
      ],
      subtotal,
      discount: calculatedDiscount,
      discountType: discountType === "percent" ? "PERCENT" : "FIXED",
      discountValue: discountValue,
      deliveryFee,
      grandTotal,
      cashReceived: actualCashReceived,
      paymentMethod,
      splitCash,
      splitGpay,
      splitCard,
      date: createdAt,
      status: "Completed",
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Reset form
    setCustomerName("");
    setCustomerPhone("");
    setItems([{ id: "1", name: "", desc: "", price: 0, qty: 1 }]);
    setDiscountValue(0);
    setDeliveryFee(0);
    setCashReceived(0);
    setPaymentMethod("CASH");
    setSplitPay(initialPayState());
    setApplyGST(false);
    setGstPercentage(5);

    return snapshot;
  };

  // Helper to send formatted WhatsApp invoice message to a designated phone number
  const sendWhatsAppForSnapshot = (snap: OrderSnapshot, targetPhone: string) => {
    const cleanPhone = targetPhone.replace(/\D/g, "").slice(0, 10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      alert("Please enter a valid 10-digit mobile contact number to send the bill.");
      return;
    }

    const domain = typeof window !== "undefined" ? window.location.origin : "";
    const invoiceUrl = `${domain}/pos2/invoice/${snap.id}`;

    const shopEmoji = String.fromCodePoint(0x2728);
    const checkEmoji = String.fromCodePoint(0x2705);
    const moneyEmoji = String.fromCodePoint(0x1f4b0);
    const receiptEmoji = String.fromCodePoint(0x1f4e6);

    let message = `${shopEmoji} *${shop.shopName}* ${shopEmoji}\n\n`;
    message += `${checkEmoji} Here are your invoice details!\n\n`;

    message += `*Subtotal:* ₹${snap.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n`;
    if (snap.discount > 0) {
      message += `*Discount Applied:* -₹${snap.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n`;
    }
    if (snap.applyGST && snap.gstAmount > 0) {
      message += `*GST (${snap.gstPercentage}%):* ₹${snap.gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n`;
    }

    message += `\n${moneyEmoji} *Total Amount:* ₹${snap.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n`;
    
    if (snap.paymentMethod) {
      const modeEmoji = snap.paymentMethod === "CASH" ? "💵" : snap.paymentMethod === "CARD" ? "💳" : "📱";
      const modeText = snap.paymentMethod === "GPAY" ? "GPay (UPI)" : snap.paymentMethod === "CARD" ? "Card" : snap.paymentMethod === "SPLIT" ? "Split" : "Cash";
      message += `${modeEmoji} *Payment Mode:* ${modeText}\n`;
    }
    message += `\n${receiptEmoji} View and download your detailed digital receipt here:\n${invoiceUrl}`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send/?phone=91${cleanPhone}&text=${encodedMessage}`;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = whatsappUrl;
    } else {
      window.open(whatsappUrl, "_blank");
    }
  };

  // "Complete Sale" — validates cart, saves order, and immediately opens "Receipt or WhatsApp?" prompt
  const handleCompleteSale = async () => {
    if (isCompletingSale || isSavingOrder) return;
    setIsCompletingSale(true);
    try {
      const snap = await persistCurrentOrder();
      if (snap) {
        setSaleCompletedPrompt({
          orderId: snap.id,
          customerName: snap.customerName,
          customerPhone: snap.customerPhone,
          grandTotal: snap.grandTotal,
          orderSnapshot: snap,
        });
        setPromptPhone(snap.customerPhone || "");
        setShowPromptPhoneInput(false);
      }
    } finally {
      setIsCompletingSale(false);
    }
  };

  // "Save Order" — persist to database directly, without prompt
  const handleSaveOrder = async () => {
    if (isSavingOrder || isCompletingSale) return;
    setIsSavingOrder(true);
    try {
      const snap = await persistCurrentOrder();
      if (snap) {
        setSavedOrderId(snap.id);
        window.setTimeout(() => setSavedOrderId(null), 5000);
      }
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (isSavingOrder || isCompletingSale || isSendingWhatsApp) return;
    if (!customerPhone || customerPhone.length !== 10) {
      alert(
        "Please enter a valid 10-digit mobile contact number to send the bill.",
      );
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      const snap = await persistCurrentOrder();
      if (snap) {
        sendWhatsAppForSnapshot(snap, snap.customerPhone);
      }
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Permanently delete an invoice — removes it from the database and, because
  // every analytics figure is derived from `orders`, from the dashboard too.
  const handleDeleteOrder = async (id: string) => {
    setDeletingOrderId(id);
    try {
      await deleteOrderAction(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
      setActiveInvoiceId((prev) => (prev === id ? null : prev));
      setSelectedOrder((prev) => (prev && prev.id === id ? null : prev));
    } catch (err) {
      console.error("Error deleting order:", err);
      alert("Could not delete this invoice. Please try again.");
      throw err;
    } finally {
      setDeletingOrderId(null);
    }
  };

  const runConfirm = async () => {
    if (!confirmDialog) return;
    setConfirmBusy(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } catch {
      // Keep the dialog open so the user can retry; the handler already alerted.
    } finally {
      setConfirmBusy(false);
    }
  };

  // Real-time analytics derived from orders with period filtering
  const now = new Date();

  const isGstBill = (o: CompletedOrder) => o.items.some((i) => i.name?.startsWith("GST ("));
  const analyticsFilteredOrders = orders.filter((o) => {
    if (analyticsBillType === "gst" && !isGstBill(o)) return false;
    if (analyticsBillType === "nongst" && isGstBill(o)) return false;
    if (
      analyticsSearchPhone &&
      !o.customerPhone.includes(analyticsSearchPhone)
    ) {
      return false;
    }
    const orderDate = new Date(o.date);
    if (analyticsPeriod === "today") {
      return (
        orderDate.getDate() === now.getDate() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear()
      );
    }
    if (analyticsPeriod === "week") {
      const startOfWeek = new Date(now);
      const dayOfWeek = startOfWeek.getDay();
      const distToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(startOfWeek.getDate() + distToMonday); // Monday start of week
      startOfWeek.setHours(0, 0, 0, 0);
      return orderDate >= startOfWeek;
    }
    if (analyticsPeriod === "month") {
      return (
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear()
      );
    }
    if (analyticsPeriod === "year") {
      return orderDate.getFullYear() === now.getFullYear();
    }
    if (analyticsPeriod === "custom") {
      const orderTime = orderDate.getTime();
      const start = analyticsStartDate ? new Date(analyticsStartDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const end = analyticsEndDate ? new Date(analyticsEndDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      if (start && end) {
        return orderTime >= start.getTime() && orderTime <= end.getTime();
      } else if (start) {
        return orderTime >= start.getTime();
      } else if (end) {
        return orderTime <= end.getTime();
      }
      return true;
    }
    return true; // "all"
  });

  const totalOrdersCount = analyticsFilteredOrders.length;
  const totalRevenueAmount = analyticsFilteredOrders.reduce(
    (acc, o) => acc + o.grandTotal,
    0,
  );
  const avgOrderValue =
    totalOrdersCount > 0 ? totalRevenueAmount / totalOrdersCount : 0;

  // Split channels
  const onlineOrders = analyticsFilteredOrders.filter(
    (o) => o.source === "ONLINE",
  ).length;
  const offlineOrders = analyticsFilteredOrders.filter(
    (o) => o.source === "OFFLINE",
  ).length;

  // Split revenues
  const onlineRevenue = analyticsFilteredOrders
    .filter((o) => o.source === "ONLINE")
    .reduce((acc, o) => acc + o.grandTotal, 0);
  const offlineRevenue = analyticsFilteredOrders
    .filter((o) => o.source === "OFFLINE")
    .reduce((acc, o) => acc + o.grandTotal, 0);

  // Top items by revenue in analyticsFilteredOrders
  const itemSales: Record<
    string,
    { name: string; revenue: number; qty: number }
  > = {};
  analyticsFilteredOrders.forEach((order) => {
    order.items.forEach((item) => {
      if (!item.name || item.name.startsWith("GST (")) return;
      if (!itemSales[item.name])
        itemSales[item.name] = { name: item.name, revenue: 0, qty: 0 };
      itemSales[item.name].revenue += item.price * item.qty;
      itemSales[item.name].qty += item.qty;
    });
  });
  const topItems = Object.values(itemSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Helper to get ISO week number of the year
  const getWeekOfYear = (d: Date) => {
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    target.setDate(target.getDate() - dayNr + 3); // Nearest Thursday
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  };
  const currentWeekNumber = getWeekOfYear(now);

  // Revenue per day of current week (Mon–Sun) - CONSTANT (independent of analyticsPeriod filters)
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekRevenue = [0, 0, 0, 0, 0, 0, 0];
  
  // Find Monday to Sunday of current calendar week
  const currentDayOfWeek = now.getDay();
  const distToMon = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const mondayOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + distToMon);
  mondayOfThisWeek.setHours(0, 0, 0, 0);
  
  const sundayOfThisWeek = new Date(mondayOfThisWeek);
  sundayOfThisWeek.setDate(mondayOfThisWeek.getDate() + 6);
  sundayOfThisWeek.setHours(23, 59, 59, 999);

  orders.forEach((order) => {
    if (analyticsSearchPhone) {
      const q = analyticsSearchPhone.toLowerCase();
      const matchPhone = order.customerPhone.includes(q);
      const matchInvoice = order.id.toLowerCase().includes(q);
      if (!matchPhone && !matchInvoice) {
        return;
      }
    }
    const orderDate = new Date(order.date);
    const orderTime = orderDate.getTime();
    if (orderTime >= mondayOfThisWeek.getTime() && orderTime <= sundayOfThisWeek.getTime()) {
      const day = (orderDate.getDay() + 6) % 7;
      weekRevenue[day] += order.grandTotal;
    }
  });
  const maxWeekRevenue = Math.max(...weekRevenue, 1);

  // Revenue per month of current year - CONSTANT (independent of analyticsPeriod filters)
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthRevenue = Array(12).fill(0);
  orders.forEach((order) => {
    if (analyticsSearchPhone) {
      const q = analyticsSearchPhone.toLowerCase();
      const matchPhone = order.customerPhone.includes(q);
      const matchInvoice = order.id.toLowerCase().includes(q);
      if (!matchPhone && !matchInvoice) {
        return;
      }
    }
    const d = new Date(order.date);
    if (d.getFullYear() === now.getFullYear()) {
      monthRevenue[d.getMonth()] += order.grandTotal;
    }
  });
  const maxMonthRevenue = Math.max(...monthRevenue, 1);
  const totalYearRevenue = monthRevenue.reduce((a, b) => a + b, 0);
  const avgMonthRevenue = totalYearRevenue / 12;

  // New Detailed KPI Computations based on analyticsFilteredOrders
  const todayOrders = orders.filter((o) => {
    if (analyticsSearchPhone) {
      const q = analyticsSearchPhone.toLowerCase();
      const matchPhone = o.customerPhone.includes(q);
      const matchInvoice = o.id.toLowerCase().includes(q);
      if (!matchPhone && !matchInvoice) {
        return false;
      }
    }
    const d = new Date(o.date);
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  });

  const todayRevenue = todayOrders.reduce((acc, o) => acc + o.grandTotal, 0);

  const todayOrdersCount = todayOrders.length;
  const todayOnlineOrdersCount = todayOrders.filter(
    (o) => o.source === "ONLINE",
  ).length;
  const todayOfflineOrdersCount = todayOrders.filter(
    (o) => o.source === "OFFLINE",
  ).length;

  const todayOnlineRevenue = todayOrders
    .filter((o) => o.source === "ONLINE")
    .reduce((acc, o) => acc + o.grandTotal, 0);
  const todayOfflineRevenue = todayOrders
    .filter((o) => o.source === "OFFLINE")
    .reduce((acc, o) => acc + o.grandTotal, 0);

  const todayItemsSold = todayOrders.reduce(
    (acc, o) => acc + o.items.reduce((sum, item) => sum + ((item.name && !item.name.startsWith("GST (")) ? item.qty : 0), 0),
    0,
  );

  // Today's top items
  const todayItemSales: Record<
    string,
    { name: string; revenue: number; qty: number }
  > = {};
  todayOrders.forEach((order) => {
    order.items.forEach((item) => {
      if (!item.name || item.name.startsWith("GST (")) return;
      if (!todayItemSales[item.name])
        todayItemSales[item.name] = { name: item.name, revenue: 0, qty: 0 };
      todayItemSales[item.name].revenue += item.price * item.qty;
      todayItemSales[item.name].qty += item.qty;
    });
  });
  const todayTopItems = Object.values(todayItemSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const monthlyRevenue = orders
    .filter((o) => {
      const d = new Date(o.date);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((acc, o) => acc + o.grandTotal, 0);

  const totalItemsSold = analyticsFilteredOrders.reduce(
    (acc, o) => acc + o.items.reduce((sum, item) => sum + ((item.name && !item.name.startsWith("GST (")) ? item.qty : 0), 0),
    0,
  );

  const categorySales: Record<string, number> = {};
  analyticsFilteredOrders.forEach((order) => {
    order.items.forEach((item) => {
      if (!item.name || item.name.startsWith("GST (")) return;
      const cat = item.desc || "Uncategorized";
      if (!categorySales[cat]) categorySales[cat] = 0;
      categorySales[cat] += item.price * item.qty;
    });
  });
  const topCategory =
    Object.keys(categorySales).length > 0
      ? Object.entries(categorySales).sort((a, b) => b[1] - a[1])[0][0]
      : "None";
  const topProduct = topItems[0]?.name || "None";

  // Money received per mode. Split bills count towards each mode they used.
  const gstRevenue = analyticsFilteredOrders.filter(isGstBill).reduce((t, o) => t + o.grandTotal, 0);
  const nonGstRevenue = totalRevenueAmount - gstRevenue;
  const received = { CASH: { amt: 0, bills: 0 }, GPAY: { amt: 0, bills: 0 }, CARD: { amt: 0, bills: 0 } };
  const splitStats = { amt: 0, bills: 0, cash: 0, gpay: 0, card: 0 };
  analyticsFilteredOrders.forEach((o) => {
    const m = o.paymentMethod || "CASH";
    if (m === "SPLIT") {
      const c = o.splitCash || 0, g = o.splitGpay || 0, k = o.splitCard || 0;
      splitStats.amt += o.grandTotal;
      splitStats.bills += 1;
      splitStats.cash += c;
      splitStats.gpay += g;
      splitStats.card += k;
      if (c > 0) { received.CASH.amt += c; received.CASH.bills += 1; }
      if (g > 0) { received.GPAY.amt += g; received.GPAY.bills += 1; }
      if (k > 0) { received.CARD.amt += k; received.CARD.bills += 1; }
    } else {
      received[m].amt += o.grandTotal;
      received[m].bills += 1;
    }
  });
  const rupees = (v: number) => "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (!isMounted) {
    return <div className="min-h-screen bg-[var(--brand-bg)]" />;
  }


  // Filtered orders for Order History tab
  const historyFilteredOrders = orders.filter((order) => {
    const matchId = order.id
      .toLowerCase()
      .includes(orderSearchId.toLowerCase());
    const matchName = order.customerName
      .toLowerCase()
      .includes(orderSearchName.toLowerCase());
    const matchPhone = (order.customerPhone || "").includes(orderSearchPhone);
    const matchSource =
      orderFilterSource === "ALL" || order.source === orderFilterSource;
    const matchStatus =
      orderFilterStatus === "ALL" ||
      order.status.toUpperCase() === orderFilterStatus.toUpperCase();

    // Period match
    let matchPeriod = true;
    if (historyPeriod !== "all") {
      const orderDate = new Date(order.date);
      const orderTime = orderDate.getTime();
      const now = new Date();

      if (historyPeriod === "today") {
        matchPeriod = orderDate.toDateString() === now.toDateString();
      } else if (historyPeriod === "week") {
        const currentDay = now.getDay();
        const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
        const startOfWeek = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + distanceToMon,
        );
        startOfWeek.setHours(0, 0, 0, 0);
        matchPeriod = orderTime >= startOfWeek.getTime();
      } else if (historyPeriod === "month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        matchPeriod = orderTime >= startOfMonth.getTime();
      } else if (historyPeriod === "year") {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        matchPeriod = orderTime >= startOfYear.getTime();
      } else if (historyPeriod === "custom") {
        const start = historyStartDate ? new Date(historyStartDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        const end = historyEndDate ? new Date(historyEndDate) : null;
        if (end) end.setHours(23, 59, 59, 999);

        if (start && end) {
          matchPeriod =
            orderTime >= start.getTime() && orderTime <= end.getTime();
        } else if (start) {
          matchPeriod = orderTime >= start.getTime();
        } else if (end) {
          matchPeriod = orderTime <= end.getTime();
        }
      }
    }

    return (
      matchId &&
      matchName &&
      matchPhone &&
      matchSource &&
      matchStatus &&
      matchPeriod
    );
  });

  const handleExportCSV = () => {
    if (historyFilteredOrders.length === 0) {
      alert("No orders available to export.");
      return;
    }

    // CSV Headers padded with spaces to ensure columns default to a readable width in Excel
    const headers = [
      "Order ID          ",
      "Date                   ",
      "Customer Name           ",
      "Customer Phone          ",
      "Source        ",
      "Subtotal      ",
      "Discount      ",
      "Delivery Fee  ",
      "Grand Total   ",
      "Status        ",
      "Items                                                                               ",
    ];

    // CSV Rows
    const rows = historyFilteredOrders.map((o) => {
      const itemsStr = o.items.map((i) => `${i.name} (x${i.qty})`).join("; ");

      // Formatting date: MM/DD/YYYY HH:MM AM/PM as an Excel text formula to prevent ### errors
      const dateObj = new Date(o.date);
      const dateStr = dateObj.toLocaleDateString();
      const timeStr = dateObj.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const formattedDate = `"=""${dateStr} ${timeStr}"""`;

      // Formatting phone number as an Excel text formula to prevent scientific notation
      const formattedPhone = o.customerPhone
        ? `"=""${o.customerPhone}"""`
        : `"N/A"`;

      return [
        o.id,
        formattedDate,
        o.customerName,
        formattedPhone,
        o.source,
        o.subtotal,
        o.discount,
        o.deliveryFee,
        o.grandTotal,
        o.status,
        `"${itemsStr.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((val) => {
            if (typeof val === "string" && !val.startsWith('"')) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Order_History_${historyPeriod}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resendWhatsApp = (order: CompletedOrder) => {
    if (!order.customerPhone || order.customerPhone.length < 10) {
      alert("Invalid customer phone number for this order.");
      return;
    }
    const domain = window.location.origin;
    const invoiceUrl = `${domain}/pos2/invoice/${order.id}`;

    const shopEmoji = String.fromCodePoint(0x2728);
    const checkEmoji = String.fromCodePoint(0x2705);
    const tagEmoji = String.fromCodePoint(0x1F516);
    const moneyEmoji = String.fromCodePoint(0x1F4B0);
    const receiptEmoji = String.fromCodePoint(0x1F4E6);

    let message = `${shopEmoji} *${shop.shopName}* ${shopEmoji}\n\n`;
    message += `${checkEmoji} Here are your invoice details!\n\n`;
    
    message += `*Subtotal:* ₹${order.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n`;
    if (order.discount > 0) {
      message += `*Discount Applied:* -₹${order.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n`;
    }
    
    const gstItem = order.items.find(i => i.name && i.name.startsWith("GST"));
    const calculatedGst = order.grandTotal - (order.subtotal - order.discount + order.deliveryFee);
    
    if (calculatedGst > 0.1) {
      const gstLabel = gstItem ? gstItem.name : "GST";
      message += `*${gstLabel}:* ₹${calculatedGst.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n`;
    }
    
    message += `\n${moneyEmoji} *Total Amount:* ₹${order.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n\n`;
    message += `${receiptEmoji} View and download your detailed digital receipt here:\n${invoiceUrl}`;

    const encodedMessage = encodeURIComponent(message);
    let whatsappUrl = `https://api.whatsapp.com/send/?phone=91${order.customerPhone.split('_')[0]}&text=${encodedMessage}`;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = whatsappUrl;
    } else {
      window.open(whatsappUrl, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-[#000000] flex flex-row font-sans overflow-hidden">
      {/* Catalog Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] w-full max-w-md overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 flex justify-between items-center bg-[#FFFFFF]">
              <h3 className="font-bold text-lg text-[#000000] flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--brand-primary)]/10 rounded-lg flex items-center justify-center">
                  <PackagePlus className="w-5 h-5 text-[var(--brand-primary)]" />
                </div>
                {editingCatalogId ? "Edit Item" : "Add New Item"}
              </h3>
              <button
                onClick={() => {
                  setShowCatalogModal(false);
                  setEditingCatalogId(null);
                }}
                className="w-8 h-8 flex items-center justify-center bg-[#000000] text-[#FFFFFF] hover:bg-black/80 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-8 py-8 space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-[#000000] uppercase tracking-[0.15em] mb-2">
                  Item Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Premium T-Shirt"
                  className="minimal-input font-bold text-sm"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#000000] uppercase tracking-[0.15em] mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., DRESSES"
                  className="minimal-input text-sm"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#000000] uppercase tracking-[0.15em] mb-2">
                  Default Price (Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g., 299"
                  className="minimal-input text-sm font-semibold"
                  value={newCatPrice}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) =>
                    setNewCatPrice(
                      e.target.value === "" ? "" : parseFloat(e.target.value),
                    )
                  }
                />
              </div>
              <button
                onClick={addToCatalog}
                className="w-full py-4 mt-4 bg-[var(--brand-primary-dark)] hover:bg-[var(--brand-primary)] text-[var(--brand-on-primary)] rounded-lg font-bold text-xs uppercase tracking-[0.15em] transition-colors"
              >
                {editingCatalogId ? "Update Catalog Item" : "Save to Catalog"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile/Tablet Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      {/* Collapsible Left Sidebar. On mobile it is a fixed overlay drawer that
          slides via transform only and snaps instantly (no transition — a
          transitioned width/transform here can stall and leave the panel stuck
          off-screen). On desktop it keeps the smooth collapse. */}
      <aside
        className={`fixed lg:sticky top-0 bottom-0 left-0 z-40 h-screen shrink-0 overflow-hidden bg-[#0F0F0F] text-[#FFFFFF] flex flex-col justify-between shadow-xl w-64 border-r border-white/10 lg:transition-all lg:duration-300 lg:ease-in-out ${isSidebarOpen ? "translate-x-0 lg:w-64" : "-translate-x-full lg:w-0 lg:border-r-0 lg:translate-x-0"}`}
      >
        <div className="w-64 flex flex-col justify-between h-full shrink-0 overflow-hidden relative">
          <div className="flex flex-col">
            {/* Header branding */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: shop.logoBackground }}>
                  <img
                    src={shop.logoMark}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <span className="font-black text-sm tracking-tight text-[#FFFFFF] block ">
                    {shop.shopName}
                  </span>
                </div>
              </div>

              {/* Close Button Inside Sidebar */}
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white font-bold hover:text-white transition-all cursor-pointer"
                title="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="px-4 py-6 space-y-2">
              <button
                onClick={() => selectTab("billing")}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "billing"
                    ? "bg-[#FFFFFF] text-[var(--brand-primary)] shadow-lg scale-102"
                    : "text-white font-bold hover:bg-white/10 hover:text-white"
                }`}
              >
                <Receipt className="w-5 h-5" />
                Billing Panel
              </button>
              <button
                onClick={() => selectTab("advance")}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "advance"
                    ? "bg-[#FFFFFF] text-[var(--brand-primary)] shadow-lg scale-102"
                    : "text-white font-bold hover:bg-white/10 hover:text-white"
                }`}
              >
                <ClockIcon className="w-5 h-5" />
                Advance Orders
              </button>
              <button
                onClick={() => selectTab("orders")}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "orders"
                    ? "bg-[#FFFFFF] text-[var(--brand-primary)] shadow-lg scale-102"
                    : "text-white font-bold hover:bg-white/10 hover:text-white"
                }`}
              >
                <History className="w-5 h-5" />
                Order History
              </button>
              {role === 'admin' && (
                <>
                  <button
                    onClick={() => selectTab("analytics")}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === "analytics"
                        ? "bg-[#FFFFFF] text-[var(--brand-primary)] shadow-lg scale-102"
                        : "text-white font-bold hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <BarChart2 className="w-5 h-5" />
                    Analytics Dashboard
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-white font-bold hover:bg-white/10 hover:text-white"
                  >
                    <Palette className="w-5 h-5" />
                    Settings
                  </button>
                  <a
                    href="/admin"
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-white font-bold hover:bg-white/10 hover:text-white"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    Admin Panel
                  </a>
                </>
              )}

              <div className="pt-4 border-t border-white/10 mt-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-black/20 hover:bg-[var(--brand-primary-light)]/10 transition-all cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  Log Out
                </button>
              </div>
            </nav>
          </div>

          {/* Footer branding */}
          <div className="p-6 border-t border-white/10 flex items-center justify-start gap-4">
            <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-[var(--brand-primary)] shrink-0">
              <span className="text-[var(--brand-on-primary)] font-bold text-sm">{(userName || "U").charAt(0).toUpperCase()}</span>
            </div>
            <p className="text-[10px] text-[var(--brand-border)]/70 mt-1 font-semibold uppercase tracking-wider">
              {userName} • {role === "admin" ? "Admin" : "Staff"}
            </p>
          </div>
        </div>
      </aside>
      {showSettings && role === "admin" && (
        <SettingsModal
          branch={BRANCH}
          shop={shop}
          actions={SETTINGS_ACTIONS}
          themeId={themeId}
          onPreviewTheme={setThemeId}
          onSaveTheme={saveThemeAction}
          onShopSaved={setShop}
          onClose={() => setShowSettings(false)}
        />
      )}
      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto px-3 sm:px-8 lg:px-12 pt-3 pb-8 relative flex flex-col animate-in fade-in duration-300">
        {/* Global Top Navbar */}
        <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 border-b border-black/10 w-full mb-6 gap-4">
          <div className="flex items-center gap-4">
            {/* Always available on mobile/tablet; on desktop only when the
                sidebar is collapsed. */}
            <button
              onClick={() => setIsSidebarOpen((v) => !v)}
              className={`w-9 h-9 bg-white border border-black/10 hover:bg-[var(--brand-bg)] rounded-lg flex items-center justify-center transition-colors shadow-sm cursor-pointer shrink-0 ${isSidebarOpen ? "lg:hidden" : ""}`}
              title={isSidebarOpen ? "Close menu" : "Open menu"}
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5 text-[var(--brand-primary)]" />
            </button>
            <div>
              <h1 className="text-lg font-black text-[#000000] tracking-tight ">
                {shop.shopName}
              </h1>
            </div>
            <InstallAppButton appName={`${shop.shopName} POS`} />
          </div>

          {/* OFFLINE / ONLINE Toggle (only shown when billing tab is active) */}
          {activeTab === "billing" && (
            <div className="flex items-center bg-[#FFFFFF]/60 border border-black/10 rounded-full p-1 shadow-sm">
              <button
                onClick={() => setIsOnline(false)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-all uppercase cursor-pointer ${!isOnline ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary)] shadow-sm" : "text-[#000000] hover:text-[#000000]"}`}
              >
                <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)]"></span>
                OFFLINE (POS)
              </button>
              <button
                onClick={() => setIsOnline(true)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-all uppercase cursor-pointer ${isOnline ? "bg-[#1A1A1A] text-[#FFFFFF] shadow-sm" : "text-[#000000] hover:text-[#000000]"}`}
              >
                <span className="w-2 h-2 rounded-full bg-[#1A1A1A]"></span>
                ONLINE ORDER
              </button>
            </div>
          )}
        </header>

        {activeTab === "billing" && (
          <div className="flex-1 flex flex-col gap-6 max-w-[1400px] min-w-0 mx-auto w-full">
            {/* Subheader Accent Bar and Title */}
            <div className="flex justify-between items-center py-2 border-b border-black/10 w-full">
              <div className="flex items-center gap-4">
                <span className="w-1.5 h-8 bg-[var(--brand-primary)] rounded-full"></span>
                <div>
                  <h2 className="text-xl font-black text-[#000000] tracking-tight">
                    POS Billing Panel
                  </h2>
                  <p className="text-[11px] text-[#000000] font-semibold mt-0.5">
                    Quick Invoice generator & database synced checkout
                  </p>
                </div>
              </div>
            </div>

            {/* Grid Layout */}
            <div className="flex flex-col lg:flex-row gap-8 w-full">
              {/* Left Column */}
              <div className="w-full lg:w-[60%] xl:w-[65%] flex flex-col gap-6 h-auto lg:h-full">
                {/* Customer Details */}
                <div className="flex-shrink-0 bg-white border border-black/10 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 relative overflow-hidden group">
                  <h2 className="text-base font-black flex items-center gap-3 text-[#000000] mb-6 tracking-tight">
                    <User className="w-4 h-4 text-[var(--brand-primary)]" />
                    Customer Details
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-[#000000] uppercase tracking-[0.15em] mb-2">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter name"
                        className="w-full bg-[#FFFFFF]/40 border border-black/10 hover:border-black/10 focus:border-[var(--brand-primary)] focus:bg-white rounded-lg px-4 py-2.5 text-[#000000] text-sm font-semibold focus:outline-none transition-colors placeholder:text-[#000000] placeholder:font-normal shadow-sm"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#000000] uppercase tracking-[0.15em] mb-2">
                        Mobile Number (WhatsApp)
                      </label>
                      <input
                        type="tel"
                        placeholder="Enter 10-digit number"
                        maxLength={10}
                        className="w-full bg-[#FFFFFF]/40 border border-black/10 hover:border-black/10 focus:border-[var(--brand-primary)] focus:bg-white rounded-lg px-4 py-2.5 text-[#000000] text-sm font-semibold focus:outline-none transition-colors placeholder:text-[#000000] placeholder:font-normal shadow-sm"
                        value={customerPhone}
                        onChange={(e) =>
                          setCustomerPhone(
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>


                {/* Order Items Ledger */}
                <div className="flex-1 bg-white border border-black/10 rounded-xl shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 flex flex-col overflow-visible">
                  <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 sm:px-6 pt-4 sm:pt-6 pb-2 border-b border-transparent gap-4">
                    <h2 className="text-base font-black flex items-center gap-3 text-[#000000] tracking-tight">
                      <Receipt className="w-4 h-4 text-[var(--brand-primary)]" />
                      Order Items
                    </h2>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
                      <button
                        onClick={clearOrder}
                        className="text-[10px] font-bold text-[#000000] bg-[#FFFFFF] hover:bg-[#FFFFFF] border border-black/10 px-4 py-2 rounded-lg uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear Order
                      </button>
                      <button
                        onClick={() => {
                          setNewCatName("");
                          setNewCatDesc("");
                          setNewCatPrice("");
                          setCatalogTargetRowId(null);
                          setShowCatalogModal(true);
                        }}
                        className="text-[10px] font-bold text-[#000000] bg-[#FFFFFF] hover:bg-[#FFFFFF] border border-black/10 px-4 py-2 rounded-lg uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <PackagePlus className="w-3.5 h-3.5 text-[var(--brand-primary)]" />{" "}
                        Add To Catalog
                      </button>
                      <button
                        onClick={addItem}
                        className="text-[10px] font-bold text-[var(--brand-primary)] bg-[var(--brand-primary)]/5 hover:bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 px-4 py-2 rounded-lg uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Custom Item
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 px-4 sm:px-6 pb-4 sm:pb-6 overflow-visible">
                    {/* Table Header */}
                    <div className="hidden sm:grid grid-cols-12 gap-4 pb-3 border-b border-black/10 text-[9px] font-black text-[#000000] uppercase tracking-[0.15em] mt-4 mb-2">
                      <div className="col-span-7 pl-2">
                        Item Name / Description
                      </div>
                      <div className="col-span-2 text-center">Price (₹)</div>
                      <div className="col-span-2 text-center">Qty</div>
                      <div className="col-span-1"></div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-4 pt-2 overflow-visible">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-4 items-stretch sm:items-center group border-b border-transparent pb-4 pt-1 overflow-visible relative"
                        >
                          {/* Item Name / Description Input + Catalog Button */}
                          <div className="col-span-7 relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                            <input
                              type="text"
                              placeholder="Type custom product description..."
                              className="flex-1 bg-white border border-black/10 focus:border-[var(--brand-primary)] rounded-lg px-4 py-2 text-xs font-semibold text-[#000000] focus:outline-none transition-colors placeholder:text-[#000000] min-w-0"
                              value={item.name}
                              onChange={(e) =>
                                updateItem(item.id, "name", e.target.value)
                              }
                            />
                            <button
                              onClick={() => {
                                setActiveCatalogRowId(
                                  activeCatalogRowId === item.id
                                    ? null
                                    : item.id,
                                );
                                setCatalogSearch("");
                              }}
                              className="flex items-center justify-center gap-1.5 border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/5 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 px-3 py-2 rounded-lg text-[10px] font-bold transition-colors uppercase tracking-wider shrink-0 cursor-pointer w-full sm:w-auto"
                            >
                              <List className="w-3.5 h-3.5" />
                              Catalog
                            </button>

                            {/* Catalog Dropdown Popover */}
                            {activeCatalogRowId === item.id && (
                              <div className="absolute z-[80] top-full left-0 mt-1 w-full sm:w-80 max-w-[calc(100vw-2.5rem)] bg-[#FFFFFF] border-2 border-black/10 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="p-2 border-b border-black/10 bg-[#FFFFFF] flex items-center justify-between gap-2">
                                  <input
                                    type="text"
                                    placeholder="Search catalog items..."
                                    className="w-full bg-white border border-black/10 focus:border-[var(--brand-primary)] rounded-md px-3 py-1.5 text-xs font-semibold focus:outline-none transition-colors"
                                    value={catalogSearch}
                                    onChange={(e) =>
                                      setCatalogSearch(e.target.value)
                                    }
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => fetchData()}
                                    disabled={isRefreshing}
                                    className="text-[#000000] hover:text-[var(--brand-primary)] p-1.5 rounded transition-colors cursor-pointer shrink-0"
                                    title="Refresh catalog from database"
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[var(--brand-primary)]" : ""}`} />
                                  </button>
                                  <button
                                    onClick={() => setActiveCatalogRowId(null)}
                                    className="text-[#000000] hover:text-[var(--brand-primary)] p-1.5 rounded transition-colors cursor-pointer shrink-0"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {catalog.filter((c) =>
                                    c.name
                                      .toLowerCase()
                                      .includes(catalogSearch.toLowerCase()),
                                  ).length > 0 ? (
                                    catalog
                                      .filter((c) =>
                                        c.name
                                          .toLowerCase()
                                          .includes(
                                            catalogSearch.toLowerCase(),
                                          ),
                                      )
                                      .map((catItem) => (
                                        <div
                                          key={catItem.id}
                                          className="w-full flex items-center border-b border-transparent last:border-0 hover:bg-[#FFFFFF] transition-colors"
                                        >
                                          <button
                                            className="flex-1 text-left px-4 py-2.5 flex flex-col cursor-pointer"
                                            onClick={() => {
                                              updateItem(
                                                item.id,
                                                "name",
                                                catItem.name,
                                              );
                                              if (catItem.price !== undefined) {
                                                updateItem(
                                                  item.id,
                                                  "price",
                                                  catItem.price,
                                                );
                                              }
                                              setActiveCatalogRowId(null);
                                            }}
                                          >
                                            <span className="text-xs font-bold text-[#000000]">
                                              {catItem.name}
                                            </span>
                                            {catItem.desc && (
                                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#000000] mt-0.5">
                                                {catItem.desc}
                                              </span>
                                            )}
                                            {catItem.price !== undefined && (
                                              <span className="text-[10px] font-bold text-[var(--brand-primary)] mt-0.5">
                                                ₹{catItem.price}
                                              </span>
                                            )}
                                          </button>
                                          <div className="flex shrink-0">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setNewCatName(catItem.name);
                                                setNewCatDesc(catItem.desc || "");
                                                setNewCatPrice(catItem.price || "");
                                                setEditingCatalogId(catItem.id);
                                                setShowCatalogModal(true);
                                                setActiveCatalogRowId(null);
                                              }}
                                              className="px-3 py-2.5 text-[#000000] hover:text-[#1A1A1A] transition-colors cursor-pointer"
                                              title="Edit item"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmDialog({
                                                  title: "Delete catalog item?",
                                                  message: `"${catItem.name}" will be removed from the catalog. This won't affect invoices that already use it.`,
                                                  confirmLabel: "Delete item",
                                                  onConfirm: () => deleteFromCatalog(catItem.id),
                                                });
                                              }}
                                              className="px-3 py-2.5 text-[#000000] hover:text-[var(--brand-primary)] transition-colors cursor-pointer"
                                              title="Delete item"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                  ) : (
                                    <div className="px-4 py-4 text-center">
                                      <div className="text-xs text-[#000000] font-semibold mb-2 flex items-center justify-center gap-2">
                                        {isCatalogLoading ? (
                                          <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--brand-primary)]" />
                                            Loading catalog…
                                          </>
                                        ) : catalogSearch.trim() ? (
                                          `No items match "${catalogSearch}"`
                                        ) : (
                                          "No catalog items yet"
                                        )}
                                      </div>
                                      <div className="flex items-center justify-center gap-2 flex-wrap">
                                        <button
                                          onClick={() => fetchData()}
                                          disabled={isRefreshing}
                                          className="text-[10px] font-bold text-[var(--brand-text-muted)] bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                                          title="Sync from database"
                                        >
                                          <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
                                          Sync
                                        </button>
                                        <button
                                          onClick={() => {
                                            setNewCatName(catalogSearch);
                                            setCatalogTargetRowId(item.id);
                                            setShowCatalogModal(true);
                                            setActiveCatalogRowId(null);
                                          }}
                                          className={`text-[10px] font-bold text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/20 px-3 py-1.5 rounded uppercase tracking-wider transition-colors cursor-pointer ${isCatalogLoading ? "hidden" : ""}`}
                                        >
                                          + Add to Catalog
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Price, Qty, and Trash (Grid layout to prevent overflow on tiny 300px screens) */}
                          <div className="col-span-5 grid grid-cols-[minmax(0,1fr)_auto_auto] sm:grid-cols-5 gap-2 sm:gap-4 w-full items-center">
                            {/* Price Input */}
                            <div className="sm:col-span-2 flex items-center gap-1.5 sm:gap-2 sm:block min-w-0 w-full">
                              <span className="text-[10px] font-bold text-[#000000] uppercase sm:hidden shrink-0">
                                Price:
                              </span>
                              <input
                                type="number"
                                className="w-full min-w-0 text-center bg-white border border-black/10 focus:border-[var(--brand-primary)] rounded-lg px-2 sm:px-3 py-2 text-xs font-semibold text-[#000000] focus:outline-none transition-colors"
                                value={item.price || ""}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    "price",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                onWheel={(e) => e.currentTarget.blur()}
                                placeholder="0"
                              />
                            </div>

                            {/* Quantity Counter */}
                            <div className="sm:col-span-2 flex items-center justify-end gap-1.5 sm:gap-2 sm:block shrink-0">
                              <span className="text-[10px] font-bold text-[#000000] uppercase sm:hidden shrink-0">
                                Qty:
                              </span>
                              <div className="flex items-center border border-black/10 bg-white rounded-lg overflow-hidden h-[36px] max-w-[90px] shrink-0">
                                <button
                                  className="w-7 h-full flex items-center justify-center text-[#000000] hover:bg-[#FFFFFF] hover:text-[var(--brand-primary)] font-bold text-xs transition-colors cursor-pointer"
                                  onClick={() =>
                                    updateItem(
                                      item.id,
                                      "qty",
                                      Math.max(1, item.qty - 1),
                                    )
                                  }
                                >
                                  −
                                </button>
                                <span className="flex-1 text-center font-bold text-xs text-[#000000] min-w-[18px]">
                                  {item.qty}
                                </span>
                                <button
                                  className="w-7 h-full flex items-center justify-center text-[#000000] hover:bg-[#FFFFFF] hover:text-[var(--brand-primary)] font-bold text-xs transition-colors cursor-pointer"
                                  onClick={() =>
                                    updateItem(item.id, "qty", item.qty + 1)
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Trash Button */}
                            <div className="sm:col-span-1 flex justify-end shrink-0">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-[#000000] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-tint)] p-2 rounded-lg border border-black/10 hover:border-transparent transition-colors flex items-center justify-center cursor-pointer"
                                title="Remove Item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>{" "}
              {/* Right Column - Premium Light Order Panel */}
              <div className="w-full lg:w-[40%] xl:w-[35%] flex flex-col shrink-0 bg-white text-[#000000] border border-black/10 rounded-2xl shadow-sm lg:sticky lg:top-28 lg:self-start transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 overflow-hidden group">
                <div className="p-4 sm:p-6 pb-4 border-b border-black/10 flex justify-between items-center bg-[#FFFFFF]">
                  <h2 className="text-base font-black flex items-center gap-3 text-[#000000] tracking-tight">
                    <ShoppingBag className="w-4 h-4 text-[var(--brand-primary)]" />
                    Current Order
                  </h2>
                  <span
                    className={`flex items-center gap-2 bg-white border border-black/10 px-3 py-1 rounded-full font-bold text-[9px] ${isOnline ? "text-[#1A1A1A]" : "text-[var(--brand-primary)]"}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-[#1A1A1A]" : "bg-[var(--brand-primary)]"}`}
                    ></span>
                    {isOnline ? "ONLINE ORDER" : "OFFLINE (POS)"}
                  </span>
                </div>

                <div className="p-4 sm:p-6 space-y-5">
                  {/* Customer Details Box */}
                  <div className="bg-[#FFFFFF]/40 border border-black/10 rounded-xl p-4 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#000000] font-semibold">
                        SOURCE
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-widest border ${isOnline ? "border-[#1A1A1A] text-[#1A1A1A] bg-[#1A1A1A]/10" : "border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary)]/10"}`}
                      >
                        {isOnline ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#000000] font-semibold">
                        CUSTOMER
                      </span>
                      <span className="font-bold text-[#000000] truncate max-w-[65%] text-right">
                        {customerName || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#000000] font-semibold">
                        PHONE
                      </span>
                      <span className="font-bold text-[#000000]">
                        {customerPhone || "-"}
                      </span>
                    </div>

                    {/* Items summary list inside customer details box */}
                    <div className="border-t border-black/10 pt-2.5 mt-2.5">
                      {items.filter((i) => i.name).length === 0 ? (
                        <div className="text-center py-2 text-[10px] text-[#000000] font-semibold italic">
                          No items added yet
                        </div>
                      ) : (
                        <div className="max-h-24 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
                          {items
                            .filter((i) => i.name)
                            .map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between items-center text-[10px]"
                              >
                                <span className="text-[#000000] font-semibold">
                                  {item.qty}x {item.name}
                                </span>
                                <span className="font-bold text-[var(--brand-primary)]">
                                  ₹
                                  {(item.price * item.qty).toLocaleString(
                                    undefined,
                                    { minimumFractionDigits: 2 },
                                  )}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Discounts section */}
                  <div className="space-y-4 pt-1">
                    {/* Manual Discount */}
                    <div>
                      <label className="block text-[10px] font-bold text-[#000000] uppercase tracking-[0.1em] mb-1.5">
                        Manual Discount
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={discountType}
                          onChange={(e) => {
                            setDiscountType(
                              e.target.value as "fixed" | "percent",
                            );
                          }}
                          className="bg-white border border-black/10 text-[#000000] rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-[var(--brand-primary)] cursor-pointer"
                        >
                          <option value="fixed">₹</option>
                          <option value="percent">%</option>
                        </select>
                        <input
                          type="number"
                          className="flex-1 text-right bg-white border border-black/10 rounded-lg px-3 py-2 text-xs font-bold text-[#000000] placeholder:text-[#000000] focus:outline-none focus:border-[var(--brand-primary)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                          value={discountValue || ""}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) => {
                            setDiscountValue(parseFloat(e.target.value) || 0);
                          }}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Subtotal & Delivery Breakdown */}
                    <div className="space-y-2.5 pt-2 border-t border-black/10">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-[#000000]">
                          Subtotal (
                          {items
                            .filter((i) => i.name)
                            .reduce((sum, i) => sum + i.qty, 0)}{" "}
                          items)
                          {applyGST && <span className="text-[9px] font-bold text-[var(--brand-primary-dark)] uppercase"> excl. GST</span>}
                        </span>
                        <span className="font-bold text-[#000000]">
                          ₹
                          {subtotal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-[#000000]">Delivery</span>
                        <input
                          type="number"
                          className="w-20 text-right bg-white border border-black/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#000000] placeholder:text-[#000000] focus:outline-none focus:border-[var(--brand-primary)]"
                          value={deliveryFee || ""}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) =>
                            setDeliveryFee(parseFloat(e.target.value) || 0)
                          }
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Bill type: Non-GST Bill / GST Invoice */}
                    <div className="pt-2 space-y-2.5">
                      <div className="flex items-center bg-[#FFFFFF] border border-black/10 rounded-full p-1 w-full">
                        <button
                          type="button"
                          onClick={() => setApplyGST(false)}
                          className={`flex-1 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${!applyGST ? "bg-[#111827] text-white shadow-sm" : "text-[#000000]"}`}
                        >
                          Non-GST Bill
                        </button>
                        <button
                          type="button"
                          onClick={() => setApplyGST(true)}
                          className={`flex-1 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${applyGST ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary)] shadow-sm" : "text-[#000000]"}`}
                        >
                          GST Invoice
                        </button>
                      </div>
                      {applyGST && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-[#000000] uppercase tracking-wider">
                            GST <span className="text-[9px] font-bold text-[var(--brand-primary-dark)]">(+ added)</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                className="w-14 text-right bg-white border border-black/10 rounded-lg px-2 py-1 text-xs font-bold text-[#000000] focus:outline-none focus:border-[var(--brand-primary)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={gstPercentage || ""}
                                onChange={(e) => setGstPercentage(parseFloat(e.target.value) || 0)}
                                placeholder="%"
                              />
                              <span className="text-xs font-bold text-[#000000]">%</span>
                            </div>
                            <span className="text-xs font-bold text-[var(--brand-primary)] w-20 text-right">
                              ₹{gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      )}
                      {/* GST split-up: CGST + SGST, half each */}
                      {applyGST && gstPercentage > 0 && (
                        <div className="rounded-lg bg-[var(--brand-tint)]/50 border border-black/5 px-3 py-2 space-y-1">
                          {(["CGST", "SGST"] as const).map((k) => (
                            <div key={k} className="flex justify-between items-center text-[11px] font-semibold text-[#000000]">
                              <span>
                                {k} <span className="text-[var(--brand-primary-dark)] font-bold">@ {round2(gstPercentage / 2)}%</span>
                              </span>
                              <span className="font-bold">
                                ₹{(k === "CGST" ? cgstSgst(gstPercentage, gstAmount).cgst : cgstSgst(gstPercentage, gstAmount).sgst).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Financial Option — payment method */}
                    <div className="pt-2">
                      <PaymentPicker
                        part="buttons"
                        value={{ ...splitPay, mode: paymentMethod }}
                        onChange={(p) => {
                          setSplitPay(p);
                          setPaymentMethod(p.mode);
                        }}
                        amount={grandTotal}
                      />
                    </div>

                    {/* Grand Total */}
                    <div className="flex justify-between items-center text-sm font-bold pt-4 border-t border-black/10">
                      <span className="text-[#000000] uppercase tracking-wider">
                        Grand Total
                      </span>
                      <span className="text-xl text-[var(--brand-primary)] font-black">
                        ₹
                        {grandTotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    {/* Payment inputs — per selected method */}
                    {paymentMethod === "SPLIT" ? (
                      <PaymentPicker
                        part="split"
                        value={{ ...splitPay, mode: paymentMethod }}
                        onChange={(p) => {
                          setSplitPay(p);
                          setPaymentMethod(p.mode);
                        }}
                        amount={grandTotal}
                      />
                    ) : (
                      <div className="bg-[#FFFFFF]/40 border border-black/10 rounded-xl p-4 mt-2">
                        <span className="block text-[9px] font-bold text-[#000000] uppercase tracking-wider mb-0.5">
                          {paymentMethod === "GPAY" ? "QR / GPay" : paymentMethod === "CARD" ? "Card" : "Cash"} Payment
                        </span>
                        <label className="block text-[10px] font-bold text-[#000000] mb-2.5">
                          {paymentMethod === "CASH" ? "Amount Received (₹)" : `${paymentMethod === "GPAY" ? "QR / GPay" : "Card"} Amount (₹)`}
                        </label>
                        <input
                          type="number"
                          className="w-full bg-white border border-black/10 focus:border-[var(--brand-primary)] rounded-lg px-3 py-2 text-base font-bold text-[#000000] placeholder:text-[#000000]/40 focus:outline-none transition-colors"
                          value={cashReceived || ""}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    {/* Change Return — cash only */}
                    {paymentMethod === "CASH" && cashReceived > 0 && (
                      <div className="flex justify-between items-center bg-white border border-black/10 rounded-lg p-3 text-xs">
                        <span className="font-bold text-[#000000] uppercase tracking-[0.05em]">
                          Change Return
                        </span>
                        <span className={`font-black text-sm ${cashReceived >= grandTotal ? "text-[#00A86B]" : "text-[#27272A]"}`}>
                          ₹
                          {Math.max(0, cashReceived - grandTotal).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}

                    {/* Saved confirmation */}
                    {savedOrderId && (
                      <div className="flex items-center gap-2 bg-[#10B981]/10 border border-[#10B981]/30 text-[#059669] rounded-lg p-3 text-[11px] font-bold">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        Order {savedOrderId} saved to the database.
                      </div>
                    )}

                    {/* Action Buttons */}
                    <button
                      onClick={handleCompleteSale}
                      disabled={isCompletingSale || isSavingOrder}
                      className="w-full mt-2 bg-[#10B981] hover:bg-[#059669] text-white py-3.5 rounded-lg font-black text-[11px] uppercase tracking-[0.1em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-[0_4px_14px_rgba(16,185,129,0.35)] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isCompletingSale ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckIcon className="w-4 h-4" />
                      )}
                      {isCompletingSale ? "Processing…" : "Complete Sale"}
                    </button>


                    <button
                      onClick={() => {
                        const valid = items.filter((i) => i.name && i.name.trim() && i.price > 0 && i.qty > 0);
                        if (valid.length === 0 || valid.length !== items.length) {
                          alert("Please ensure all items have a valid name and a price greater than 0. Remove any empty rows before proceeding.");
                          return;
                        }
                        setAdvanceCart({
                          customerName,
                          customerPhone,
                          source: isOnline ? "ONLINE" : "OFFLINE",
                          items: valid.map((i) => ({ name: i.name, desc: i.desc, price: i.price, qty: i.qty })),
                          discountType: discountType === "percent" ? "PERCENT" : "FIXED",
                          discountValue,
                          isGst: applyGST,
                          gstPercentage,
                          deliveryFee,
                          subtotal,
                          discountAmount: Math.min(subtotal, calculatedDiscount),
                          gstAmount,
                          total: grandTotal,
                        });
                      }}
                      disabled={isSavingOrder || isCompletingSale}
                      className="w-full mt-2 bg-white hover:bg-amber-50 text-amber-700 border-2 border-amber-400 py-3 rounded-lg font-bold text-[10px] uppercase tracking-[0.1em] flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <ClockIcon className="w-3.5 h-3.5" />
                      Save as Advance Order
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "advance" && (
          <AdvanceOrdersPanel
            branch={{ shopName: shop.shopName, receiptBase: "/pos2/advance", invoiceBase: "/pos2/invoice" }}
            actions={ADVANCE_ACTIONS}
            role={role}
            refreshKey={advanceRefreshKey}
            onInvoiceCreated={() => fetchData()}
          />
        )}

        {detailsOrder && <OrderDetailsModal order={detailsOrder} onClose={() => setDetailsOrder(null)} />}

        {advanceCart && (
          <CreateAdvanceModal
            cart={advanceCart}
            branch={{ shopName: shop.shopName, receiptBase: "/pos2/advance", invoiceBase: "/pos2/invoice" }}
            actions={ADVANCE_ACTIONS}
            onClose={() => setAdvanceCart(null)}
            onSaved={() => {
              setAdvanceRefreshKey((k) => k + 1);
              setCustomerName("");
              setCustomerPhone("");
              setItems([{ id: "1", name: "", desc: "", price: 0, qty: 1 }]);
              setDiscountValue(0);
              setDeliveryFee(0);
              setCashReceived(0);
              setPaymentMethod("CASH");
              setSplitPay(initialPayState());
              setApplyGST(false);
              setGstPercentage(5);
            }}
          />
        )}

        {activeTab === "orders" && (
          <div className="flex-1 flex flex-col max-w-[1400px] mx-auto w-full pb-8 pr-2 animate-in fade-in duration-300">
            {/* Header Panel */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
              <div>
                <h2 className="text-[28px] font-black text-[#000000] tracking-tight">
                  Order History
                </h2>
                <p className="text-xs text-[#000000] font-semibold mt-1">
                  Manage and track past invoices
                </p>
              </div>

              {orders.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  <div className="flex flex-wrap items-center bg-[#FFFFFF] border border-black/10 rounded-xl p-1 gap-1 max-w-full">
                    <span className="text-[9px] font-bold text-[#000000] uppercase tracking-wider px-2">
                      Period:
                    </span>
                    {(["all", "today", "week", "month", "year"] as const).map(
                      (p) => {
                        const displayLabel =
                          p === "all"
                            ? "All Time"
                            : p === "today"
                              ? "Today"
                              : p === "week"
                                ? "This Week"
                                : p === "month"
                                  ? "This Month"
                                  : "This Year";
                        const isActive = historyPeriod === p;
                        return (
                          <button
                            key={p}
                            onClick={() => {
                              setHistoryPeriod(p);
                              setHistoryStartDate("");
                              setHistoryEndDate("");
                            }}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              isActive
                                ? "bg-[var(--brand-primary-dark)] text-[var(--brand-on-primary)] shadow-sm"
                                : "text-[#000000] hover:bg-[#000000]/5"
                            }`}
                          >
                            {displayLabel}
                          </button>
                        );
                      },
                    )}
                  </div>

                  <div className="flex flex-wrap items-center border rounded-xl px-3 py-1.5 gap-2 shadow-sm bg-white border-black/10 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#000000]">
                        From:
                      </span>
                      <input
                        type="date"
                        value={historyStartDate}
                        onChange={(e) => {
                          setHistoryPeriod("custom");
                          setHistoryStartDate(e.target.value);
                        }}
                        className="text-xs font-bold bg-transparent border-none outline-none focus:ring-0 cursor-pointer text-[#000000] w-[115px]"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#000000]">
                        To:
                      </span>
                      <input
                        type="date"
                        value={historyEndDate}
                        onChange={(e) => {
                          setHistoryPeriod("custom");
                          setHistoryEndDate(e.target.value);
                        }}
                        className="text-xs font-bold bg-transparent border-none outline-none focus:ring-0 cursor-pointer text-[#000000] w-[115px]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-4 py-2 border-2 border-[var(--brand-primary)] bg-transparent text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-[var(--brand-on-primary)] rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                </div>
              )}
            </div>

            {orders.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-black/10 rounded-xl bg-[#FFFFFF] py-12">
                <p className="text-[#000000] font-medium">
                  No past transactions yet.
                </p>
              </div>
            ) : (
              <>
                {/* Search and Filters Bar */}
                <div className="bg-white border-2 border-black/10 rounded-xl p-4 mb-6 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full">
                    <div>
                      <label className="block text-[9px] font-bold text-[#000000] uppercase tracking-wider mb-1">
                        Search Order ID
                      </label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[#000000] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder={`e.g. ${BRANCH.invoicePrefix}-...`}
                          className="w-full bg-[#FFFFFF]/30 border border-black/10 focus:border-[var(--brand-primary)] rounded-lg pl-8 pr-3 py-1.5 text-xs font-semibold text-[#000000] focus:outline-none"
                          value={orderSearchId}
                          onChange={(e) => setOrderSearchId(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-[#000000] uppercase tracking-wider mb-1">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        placeholder="Search name..."
                        className="w-full bg-[#FFFFFF]/30 border border-black/10 focus:border-[var(--brand-primary)] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#000000] focus:outline-none"
                        value={orderSearchName}
                        onChange={(e) => setOrderSearchName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-[#000000] uppercase tracking-wider mb-1">
                        Customer Phone
                      </label>
                      <input
                        type="text"
                        placeholder="Search phone..."
                        className="w-full bg-[#FFFFFF]/30 border border-black/10 focus:border-[var(--brand-primary)] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#000000] focus:outline-none"
                        value={orderSearchPhone}
                        onChange={(e) => setOrderSearchPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-[#000000] uppercase tracking-wider mb-1">
                        Order Source
                      </label>
                      <select
                        className="w-full bg-[#FFFFFF]/30 border border-black/10 focus:border-[var(--brand-primary)] rounded-lg px-3 py-1.5 text-xs font-bold text-[#000000] focus:outline-none cursor-pointer"
                        value={orderFilterSource}
                        onChange={(e) => setOrderFilterSource(e.target.value)}
                      >
                        <option value="ALL">All Sources</option>
                        <option value="ONLINE">Online Orders</option>
                        <option value="OFFLINE">Offline (POS)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {(() => {
                  const filteredOrders = historyFilteredOrders;

                  if (filteredOrders.length === 0) {
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-black/10 rounded-xl bg-[#FFFFFF] py-12">
                        <p className="text-[#000000] font-semibold">
                          No transactions match your search filters.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-[#FFFFFF] border-2 border-black/10 rounded-xl shadow-sm overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#FFFFFF] border-b border-black/10">
                            <th className="p-4 text-[10px] font-bold text-[#000000] uppercase tracking-widest">
                              Order ID
                            </th>
                            <th className="p-4 text-[10px] font-bold text-[#000000] uppercase tracking-widest">
                              Date &amp; Time
                            </th>
                            <th className="p-4 text-[10px] font-bold text-[#000000] uppercase tracking-widest">
                              Customer Name
                            </th>
                            <th className="p-4 text-[10px] font-bold text-[#000000] uppercase tracking-widest">
                              Mobile Number
                            </th>
                            <th className="p-4 text-[10px] font-bold text-[#000000] uppercase tracking-widest">
                              Source
                            </th>
                            <th className="p-4 text-[10px] font-bold text-[#000000] uppercase tracking-widest">
                              Total Due
                            </th>
                            <th className="p-4 text-[10px] font-bold text-[#000000] uppercase tracking-widest text-right">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map((order) => (
                            <tr
                              key={order.id}
                              className="border-b border-transparent hover:bg-[#FFFFFF] transition-colors"
                            >
                              <td className="p-4 text-xs font-semibold text-[#000000]">
                                {order.id}
                              </td>
                              <td className="p-4 text-xs font-bold text-[#000000] whitespace-nowrap">
                                {new Date(order.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                <span className="block text-[10px] font-semibold text-black/60">
                                  {new Date(order.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </td>
                              <td className="p-4 text-xs font-bold text-[#000000]">
                                {order.customerName}
                              </td>
                              <td className="p-4 text-xs font-mono font-bold text-[#000000]">
                                {order.customerPhone || "-"}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col items-start gap-1">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-widest border ${order.source === "ONLINE" ? "border-[#1A1A1A] text-[#1A1A1A] bg-[#1A1A1A]/10" : "border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary)]/10"}`}
                                  >
                                    {order.source}
                                  </span>
                                  {/* Tax invoice vs plain bill, and bills that completed an advance order */}
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-widest border border-black/15 text-black/70 bg-black/[0.03]">
                                    {isGstBill(order) ? "GST" : "NON-GST"}
                                  </span>
                                  {order.advanceOrderId && (
                                    <span
                                      title={`Completed advance order ${order.advanceOrderId}`}
                                      className="px-2 py-0.5 rounded text-[9px] font-bold tracking-widest border border-amber-400 text-amber-800 bg-amber-50"
                                    >
                                      ADVANCE
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-sm font-black text-[var(--brand-primary)]">
                                ₹{order.grandTotal.toLocaleString()}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex flex-row items-center justify-end gap-1.5">
                                  <span className="px-3 py-1 rounded bg-[#10B981]/10 text-[#10B981] text-[10px] font-bold uppercase tracking-wider hidden lg:inline-block mr-1">
                                    {order.status}
                                  </span>
                                  <button
                                    onClick={() => resendWhatsApp(order)}
                                    title="Send on WhatsApp"
                                    aria-label="Send on WhatsApp"
                                    className="flex items-center justify-center w-8 h-8 bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] rounded-md transition-colors cursor-pointer"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.012c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => setActiveInvoiceId(order.id)}
                                    title="View invoice"
                                    aria-label="View invoice"
                                    className="flex items-center justify-center w-8 h-8 bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/20 text-[var(--brand-primary-dark)] rounded-md transition-colors cursor-pointer"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => setDetailsOrder(order)}
                                    title="Order details"
                                    aria-label="Order details"
                                    className="flex items-center justify-center w-8 h-8 bg-black/5 hover:bg-black/10 text-[#000000] rounded-md transition-colors cursor-pointer"
                                  >
                                    <EyeIcon className="w-4 h-4" />
                                  </button>
                                  {/* Deleting invoices is admin-only (also enforced on the server). */}
                                  {role === "admin" && (
                                    <button
                                      onClick={() =>
                                        setConfirmDialog({
                                          title: "Delete this invoice?",
                                          message: `Invoice ${order.id} for ${order.customerName || "Guest"} (₹${order.grandTotal.toLocaleString()}) will be permanently deleted from the database and removed from every analytics report. This cannot be undone.`,
                                          confirmLabel: "Delete invoice",
                                          onConfirm: () => handleDeleteOrder(order.id),
                                        })
                                      }
                                      disabled={deletingOrderId === order.id}
                                      title="Delete invoice"
                                      aria-label="Delete invoice"
                                      className="flex items-center justify-center w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {deletingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {role === "admin" && activeTab === "analytics" && (
          <div className="flex-1 flex flex-col max-w-[1400px] min-w-0 mx-auto w-full pb-8 pr-2">
            {/* Header Panel */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
              <div>
                <h2 className="text-[28px] font-black text-[#000000] tracking-tight">
                  Revenue Analytics
                </h2>
                <p className="text-xs text-[#000000] font-semibold mt-1">
                  {analyticsBillType === "gst" ? "GST invoices only" : analyticsBillType === "nongst" ? "Non-GST bills only" : "All bills"} — full store & channel insights
                </p>
                <div className="inline-flex mt-3 bg-white border border-black/10 rounded-xl p-1 shadow-sm">
                  {(["all", "gst", "nongst"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setAnalyticsBillType(t)}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                        analyticsBillType === t
                          ? "bg-[var(--brand-primary-dark)] text-[var(--brand-on-primary)] shadow-sm"
                          : "text-black hover:bg-black/5"
                      }`}
                    >
                      {t === "all" ? "All bills" : t === "gst" ? "GST invoices" : "Non-GST bills"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Period Filters & Refresh Button */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {analyticsSubTab !== "today" && (
                  <>
                    <div className="flex flex-wrap items-center bg-[#FFFFFF] border border-black/10 rounded-xl p-1 gap-1 max-w-full">
                      <span className="text-[9px] font-bold text-[#000000] uppercase tracking-wider px-2">
                        Period:
                      </span>
                      {(["all", "today", "week", "month", "year"] as const).map(
                        (p) => {
                          const displayLabel =
                            p === "all"
                              ? "All Time"
                              : p === "today"
                                ? "Today"
                                : p === "week"
                                  ? "This Week"
                                  : p === "month"
                                    ? "This Month"
                                    : "This Year";
                          const isActive = analyticsPeriod === p;
                          return (
                            <button
                              key={p}
                              onClick={() => {
                                setAnalyticsPeriod(p);
                                setAnalyticsStartDate("");
                                setAnalyticsEndDate("");
                              }}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                isActive
                                  ? "bg-[var(--brand-primary-dark)] text-[var(--brand-on-primary)] shadow-sm"
                                  : "text-[#000000] hover:bg-[#000000]/5"
                              }`}
                            >
                              {displayLabel}
                            </button>
                          );
                        },
                      )}
                    </div>

                    <div className="flex flex-wrap items-center border rounded-xl px-3 py-1.5 gap-2 shadow-sm bg-white border-black/10 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#000000]">
                          From:
                        </span>
                        <input
                          type="date"
                          value={analyticsStartDate}
                          onChange={(e) => {
                            setAnalyticsPeriod("custom");
                            setAnalyticsStartDate(e.target.value);
                          }}
                          className="text-xs font-bold bg-transparent border-none outline-none focus:ring-0 cursor-pointer text-[#000000] w-[115px]"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#000000]">
                          To:
                        </span>
                        <input
                          type="date"
                          value={analyticsEndDate}
                          onChange={(e) => {
                            setAnalyticsPeriod("custom");
                            setAnalyticsEndDate(e.target.value);
                          }}
                          className="text-xs font-bold bg-transparent border-none outline-none focus:ring-0 cursor-pointer text-[#000000] w-[115px]"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sub Navigation Tabs */}
            <div className="flex border-b border-black/10 mb-6 gap-6 overflow-x-auto scrollbar-none pb-0.5 w-full shrink-0">
              {(["revenue", "today", "products", "coupons"] as const).map(
                (tab) => {
                  const isActive = analyticsSubTab === tab;
                  const displayLabel =
                    tab === "today"
                      ? "Today's Sales"
                      : tab === "revenue"
                        ? "Revenue"
                        : tab === "products"
                          ? "Products"
                          : "Coupons";
                  return (
                    <button
                      key={tab}
                      onClick={() => setAnalyticsSubTab(tab)}
                      className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative cursor-pointer shrink-0 ${
                        isActive
                          ? "text-[var(--brand-primary)]"
                          : "text-[#000000] hover:text-[#000000]"
                      }`}
                    >
                      {displayLabel}
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand-primary)] rounded-full" />
                      )}
                    </button>
                  );
                },
              )}
            </div>

            {/* Tab Contents */}
            {analyticsSubTab === "today" && (
              <>
                {/* Today's KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">
                        Today's Revenue
                      </span>
                      <div className="w-6 h-6 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center">
                        <IndianRupee className="w-3 h-3 text-[#1A1A1A] animate-pulse" />
                      </div>
                    </div>
                    <div className="text-xl font-black text-[#000000] mb-1">
                      ₹{todayRevenue.toLocaleString()}
                    </div>
                    <div className="text-[9px] text-[#000000] font-semibold">
                      Completed today
                    </div>
                  </div>

                  <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">
                        Today's Bills
                      </span>
                      <div className="w-6 h-6 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center">
                        <Trophy className="w-3 h-3 text-[#1A1A1A] animate-swing" />
                      </div>
                    </div>
                    <div className="text-xl font-black text-[#000000] mb-1">
                      {todayOrdersCount}
                    </div>
                    <div className="text-[9px] text-[#000000] font-semibold">
                      Completed today
                    </div>
                  </div>

                  <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">
                        Today's Items Sold
                      </span>
                      <div className="w-6 h-6 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center">
                        <Package className="w-3 h-3 text-[var(--brand-primary)] animate-pop" />
                      </div>
                    </div>
                    <div className="text-xl font-black text-[#000000] mb-1">
                      {todayItemsSold} pcs
                    </div>
                    <div className="text-[9px] text-[#000000] font-semibold">
                      Quantity sold today
                    </div>
                  </div>

                  <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">
                        Today's Avg Order Value
                      </span>
                      <div className="w-6 h-6 rounded-full bg-[var(--brand-primary-dark)]/10 flex items-center justify-center">
                        <Zap className="w-3 h-3 text-[var(--brand-primary-dark)] animate-pulse" />
                      </div>
                    </div>
                    <div className="text-xl font-black text-[#000000] mb-1">
                      ₹
                      {Math.round(
                        todayOrdersCount > 0
                          ? todayRevenue / todayOrdersCount
                          : 0,
                      ).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-[#000000] font-semibold">
                      Per invoice today
                    </div>
                  </div>
                </div>

                {/* Today's Detailed Split */}
                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 mb-8">
                  {/* Left Side: Today's Order Source & Leaderboard */}
                  <div className="col-span-8 w-full flex flex-col gap-6">
                    {/* Today's Transactions Table */}
                    <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm flex-1">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <h3 className="font-bold text-[#000000] text-sm">
                          Today's Transactions
                        </h3>

                        {/* Contact Search Input */}
                        <div className="flex items-center border border-black/10 bg-[#FFFFFF] rounded-lg px-3 py-1.5 gap-2 shadow-xs w-full sm:w-auto animate-in fade-in duration-200">
                          <Search className="w-3.5 h-3.5 text-[#000000]" />
                          <input
                            type="text"
                            placeholder="Search contact/invoice..."
                            className="text-xs font-semibold bg-transparent border-none outline-none focus:ring-0 text-[#000000] placeholder:text-[#000000]/50 w-full sm:w-[170px]"
                            value={analyticsSearchPhone}
                            onChange={(e) =>
                              setAnalyticsSearchPhone(e.target.value)
                            }
                          />
                        </div>
                      </div>
                      {todayOrders.length === 0 ? (
                        <div className="text-center text-[#000000] text-xs font-semibold py-12">
                          {analyticsSearchPhone
                            ? "No matching transactions found."
                            : "No orders placed today."}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-[#FFFFFF] border-b border-black/10">
                                <th className="p-3 text-[10px] font-bold text-[#000000] uppercase tracking-wider">
                                  Invoice ID
                                </th>
                                <th className="p-3 text-[10px] font-bold text-[#000000] uppercase tracking-wider">
                                  Customer No
                                </th>
                                <th className="p-3 text-[10px] font-bold text-[#000000] uppercase tracking-wider">
                                  Source
                                </th>
                                <th className="p-3 text-[10px] font-bold text-[#000000] uppercase tracking-wider text-right">
                                  Items
                                </th>
                                <th className="p-3 text-[10px] font-bold text-[#000000] uppercase tracking-wider text-right">
                                  Grand Total
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {todayOrders.map((order) => (
                                <tr
                                  key={order.id}
                                  className="border-b border-transparent hover:bg-[#FFFFFF]/50 transition-colors"
                                >
                                  <td className="p-3 text-xs font-semibold text-[#000000]">
                                    {order.id}
                                  </td>
                                  <td className="p-3 text-xs font-mono font-bold text-[#000000]">
                                    {order.customerPhone || "-"}
                                  </td>
                                  <td className="p-3">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-widest border ${order.source === "ONLINE" ? "border-[#1A1A1A] text-[#1A1A1A] bg-[#1A1A1A]/10" : "border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary)]/10"}`}
                                    >
                                      {order.source}
                                    </span>
                                  </td>
                                  <td className="p-3 text-xs font-semibold text-[#000000] text-right">
                                    {order.items.reduce(
                                      (sum, i) => sum + ((i.name && !i.name.startsWith("GST (")) ? i.qty : 0),
                                      0,
                                    )}{" "}
                                    pcs
                                  </td>
                                  <td className="p-3 text-xs font-black text-[var(--brand-primary)] text-right">
                                    ₹{order.grandTotal.toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Channel Split & Top items */}
                  <div className="col-span-4 w-full flex flex-col gap-6">
                    {/* Today's Channel Split Card */}
                    <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm">
                      <h3 className="font-bold text-[#000000] mb-4 text-sm">
                        Today's Channel Split
                      </h3>
                      {todayOrdersCount === 0 ? (
                        <div className="text-center text-[#000000] text-xs font-semibold py-6">
                          No sales today.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-wider w-14">
                              Offline
                            </span>
                            <div className="flex-1 h-2.5 bg-[var(--brand-muted)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--brand-primary)] rounded-full transition-all duration-700"
                                style={{
                                  width: `${(todayOfflineOrdersCount / todayOrdersCount) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-black text-[#000000] w-12 text-right">
                              ₹{todayOfflineRevenue.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-[#1A1A1A] uppercase tracking-wider w-14">
                              Online
                            </span>
                            <div className="flex-1 h-2.5 bg-[var(--brand-muted)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#1A1A1A] rounded-full transition-all duration-700"
                                style={{
                                  width: `${(todayOnlineOrdersCount / todayOrdersCount) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-black text-[#000000] w-12 text-right">
                              ₹{todayOnlineRevenue.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Today's Top Products Sold Card */}
                    <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm flex-1">
                      <h3 className="font-bold text-[#000000] text-sm mb-4">
                        Today's Top Items
                      </h3>
                      {todayTopItems.length === 0 ? (
                        <div className="text-center text-[#000000] text-xs font-semibold py-6">
                          No items sold today.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {todayTopItems.map((item, idx) => (
                            <div
                              key={item.name}
                              className="flex items-center gap-3"
                            >
                              <span className="text-[11px] font-black text-[#000000] w-4">
                                {idx + 1}
                              </span>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-bold text-[#000000]">
                                    {item.name}
                                  </span>
                                  <span className="text-xs font-black text-[var(--brand-primary)]">
                                    ₹{item.revenue.toLocaleString()}
                                  </span>
                                </div>
                                <div className="h-1.5 bg-[var(--brand-muted)] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--brand-primary)] rounded-full transition-all duration-700"
                                    style={{
                                      width: `${(item.revenue / todayTopItems[0].revenue) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-[10px] text-[#000000] font-semibold w-10 text-right">
                                {item.qty} pcs
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {analyticsSubTab === "revenue" && (
              <>
                {/* Top 5x2 KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Row 1 */}
                  <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">
                        Total Revenue
                      </span>
                      <div className="w-6 h-6 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center">
                        <IndianRupee className="w-3 h-3 text-[#1A1A1A] animate-pulse" />
                      </div>
                    </div>
                    <div className="text-xl font-black text-[#000000] mb-1">
                      ₹{totalRevenueAmount.toLocaleString()}
                    </div>
                    <div className="text-[9px] text-[#000000] font-semibold">
                      GST ({rupees(gstRevenue)}) + Non-GST ({rupees(nonGstRevenue)})
                    </div>
                  </div>

                  <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">
                        Completed Bills
                      </span>
                      <div className="w-6 h-6 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center">
                        <Trophy className="w-3 h-3 text-[#1A1A1A] animate-swing" />
                      </div>
                    </div>
                    <div className="text-xl font-black text-[#000000] mb-1">
                      {totalOrdersCount}
                    </div>
                    <div className="text-[9px] text-[#000000] font-semibold">
                      POS + manual bills
                    </div>
                  </div>

                  <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">
                        Offline Bills
                      </span>
                      <div className="w-6 h-6 rounded-full bg-[var(--brand-primary-dark)]/10 flex items-center justify-center">
                        <IndianRupee className="w-3 h-3 text-[var(--brand-primary-dark)] animate-bounce" />
                      </div>
                    </div>
                    <div className="text-xl font-black text-[#000000] mb-1">
                      ₹{offlineRevenue.toLocaleString()}
                    </div>
                    <div className="text-[9px] text-[#000000] font-semibold">
                      Walk-in POS sales
                    </div>
                  </div>

                  <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">
                        Online Bills
                      </span>
                      <div className="w-6 h-6 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center">
                        <IndianRupee className="w-3 h-3 text-[#1A1A1A] animate-float" />
                      </div>
                    </div>
                    <div className="text-xl font-black text-[#000000] mb-1">
                      ₹{onlineRevenue.toLocaleString()}
                    </div>
                    <div className="text-[9px] text-[#000000] font-semibold">
                      Online POS sales
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Row 2 */}
                  <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">
                        Total Offline Bills
                      </span>
                      <div className="w-6 h-6 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center">
                        <ShoppingBag className="w-3 h-3 text-[var(--brand-primary)] animate-pulse" />
                      </div>
                    </div>
                    <div className="text-xl font-black text-[#000000] mb-1">
                      {offlineOrders}
                    </div>
                    <div className="text-[9px] text-[#000000] font-semibold">
                      Walk-in POS orders
                    </div>
                  </div>

                  <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">
                        Total Online Bills
                      </span>
                      <div className="w-6 h-6 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center">
                        <Globe className="w-3 h-3 text-[#1A1A1A] animate-float" />
                      </div>
                    </div>
                    <div className="text-xl font-black text-[#000000] mb-1">
                      {onlineOrders}
                    </div>
                    <div className="text-[9px] text-[#000000] font-semibold">
                      Online channel orders
                    </div>
                  </div>

                  <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">
                        Total Items Sold
                      </span>
                      <div className="w-6 h-6 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center">
                        <Package className="w-3 h-3 text-[var(--brand-primary)] animate-pop" />
                      </div>
                    </div>
                    <div className="text-xl font-black text-[#000000] mb-1">
                      {totalItemsSold}
                    </div>
                    <div className="text-[9px] text-[#000000] font-semibold">
                      From completed bills
                    </div>
                  </div>

                  <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">
                        Top Product
                      </span>
                      <div className="w-6 h-6 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center">
                        <Trophy className="w-3 h-3 text-[var(--brand-primary)] animate-pop" />
                      </div>
                    </div>
                    <div
                      className="text-xl font-black text-[#000000] mb-1 truncate"
                      title={topProduct}
                    >
                      {topProduct}
                    </div>
                    <div className="text-[9px] text-[#000000] font-semibold">
                      Most sold item
                    </div>
                  </div>
                </div>

                {/* Row 3: money received by payment mode */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
                  {[
                    { label: "Cash received", value: received.CASH.amt, note: `${received.CASH.bills} bill${received.CASH.bills === 1 ? "" : "s"}`, tone: "bg-emerald-100 text-emerald-700" },
                    { label: "GPay / UPI received", value: received.GPAY.amt, note: `${received.GPAY.bills} bill${received.GPAY.bills === 1 ? "" : "s"}`, tone: "bg-slate-100 text-slate-700" },
                    {
                      label: "Split received",
                      value: splitStats.amt,
                      note: splitStats.bills
                        ? `${splitStats.bills} bill${splitStats.bills === 1 ? "" : "s"} - ${[
                            splitStats.cash ? `Cash ${rupees(splitStats.cash)}` : "",
                            splitStats.gpay ? `UPI ${rupees(splitStats.gpay)}` : "",
                            splitStats.card ? `Card ${rupees(splitStats.card)}` : "",
                          ].filter(Boolean).join(" + ")}`
                        : "0 bills",
                      tone: "bg-red-100 text-red-700",
                    },
                    { label: "Card received", value: received.CARD.amt, note: `${received.CARD.bills} bill${received.CARD.bills === 1 ? "" : "s"}`, tone: "bg-violet-100 text-violet-700" },
                  ].map((c) => (
                    <div key={c.label} className="bg-white border border-black/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">{c.label}</span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${c.tone}`}>
                          <Wallet className="w-3 h-3" />
                        </div>
                      </div>
                      <div className="text-xl font-black text-[#000000] mb-1">{rupees(c.value)}</div>
                      <div className="text-[9px] text-[#000000] font-semibold truncate" title={c.note}>{c.note}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-semibold text-black/50 mb-8">
                  Split bills are also counted in the Cash, GPay / UPI and Card totals by the part paid each way. Advance-order deposits count once the balance is collected and the order is invoiced.
                </p>

                {/* Main Charts & Breakdowns */}
                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
                  {/* Left Chart Column */}
                  <div className="col-span-8 w-full flex flex-col gap-6">
                    {/* Monthly Revenue Trend Chart */}
                    <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col min-h-[300px]">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="font-bold text-[#000000] text-sm mb-2 flex items-center">
                            Revenue Trend This Year <span className="text-[var(--brand-primary)] font-black ml-1.5">{now.getFullYear()}</span>
                          </h3>
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-black text-[#000000]">
                              ₹{totalYearRevenue.toLocaleString()}
                            </span>
                            {avgMonthRevenue > 0 && (
                              <span className="bg-[#FFFFFF] border border-black/10 text-[var(--brand-primary)] px-2 py-0.5 rounded text-[10px] font-bold">
                                Avg ₹
                                {Math.round(avgMonthRevenue).toLocaleString()}
                                /mo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {orders.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-[#000000] text-sm font-semibold">
                          Process orders to see yearly revenue trend.
                        </div>
                      ) : (
                        <div className="flex-1 overflow-x-auto scrollbar-thin pb-2">
                          <div className="flex items-end justify-between px-2 gap-1 relative mt-4 min-w-[500px] h-[170px] pt-10">
                            {monthNames.map((month, i) => (
                              <div
                                key={month}
                                className="flex flex-col items-center gap-1.5 w-full group/bar relative outline-none"
                                tabIndex={0}
                              >
                                {/* Monthly sales text on top for mobile/visibility */}
                                <span className="text-[8px] font-black text-[var(--brand-primary)] h-3 flex items-end">
                                  {monthRevenue[i] > 0
                                    ? monthRevenue[i] >= 1000
                                      ? `₹${(monthRevenue[i] / 1000).toFixed(1)}k`
                                      : `₹${monthRevenue[i]}`
                                    : ""}
                                </span>

                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#000000] text-white text-[10px] font-bold px-2 py-1.5 rounded-lg opacity-0 group-hover/bar:opacity-100 group-focus/bar:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-10 shadow-lg">
                                  <div className="text-[9px] text-white/70 font-semibold mb-0.5">
                                    {monthNames[i]}
                                  </div>
                                  ₹{(monthRevenue[i] || 0).toLocaleString()}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#000000]"></div>
                                </div>
                                <div
                                  className="w-full max-w-[24px] bg-[var(--brand-primary)] rounded-t-sm transition-all duration-1000 group-hover/bar:bg-[var(--brand-primary)] cursor-pointer min-h-[4px]"
                                  style={{
                                    height: `${Math.max(4, (monthRevenue[i] / maxMonthRevenue) * 100)}px`,
                                  }}
                                />
                                <span className="text-[10px] font-bold text-[#000000] uppercase">
                                  {month}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Weekly Revenue Bar Chart */}
                    <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col min-h-[250px]">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="font-bold text-[#000000] text-sm flex items-center">
                            Revenue This Week <span className="text-[var(--brand-primary)] font-black ml-1.5">(Week {currentWeekNumber} of {now.getFullYear()})</span>
                          </h3>
                          <p className="text-[10px] text-[#000000] font-semibold mt-1">
                            ₹
                            {weekRevenue
                              .reduce((a, b) => a + b, 0)
                              .toLocaleString()}{" "}
                            total
                          </p>
                        </div>
                      </div>

                      {orders.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-[#000000] text-sm font-semibold">
                          Process orders to see weekly revenue.
                        </div>
                      ) : (
                        <div className="flex-1 flex items-end justify-between px-2 gap-2">
                          {dayNames.map((day, i) => (
                            <div
                              key={day}
                              className="flex flex-col items-center gap-3 w-full group/bar relative outline-none"
                              tabIndex={0}
                            >
                              <span className="text-[9px] font-black text-[var(--brand-primary)]">
                                {weekRevenue[i] > 0
                                  ? `₹${weekRevenue[i] >= 1000 ? (weekRevenue[i] / 1000).toFixed(1) + "k" : weekRevenue[i]}`
                                  : ""}
                              </span>

                              {/* Tooltip for exact weekly revenue */}
                              <div className="absolute bottom-[52px] mb-2 left-1/2 -translate-x-1/2 bg-[#000000] text-white text-[10px] font-bold px-2 py-1.5 rounded-lg opacity-0 group-hover/bar:opacity-100 group-focus/bar:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-10 shadow-lg">
                                <div className="text-[9px] text-white/70 font-semibold mb-0.5">
                                  {dayNames[i]}
                                </div>
                                ₹{(weekRevenue[i] || 0).toLocaleString()}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#000000]"></div>
                              </div>

                              <div className="w-full max-w-[20px] h-32 bg-[var(--brand-muted)] rounded-full relative overflow-hidden cursor-pointer">
                                <div
                                  className="absolute bottom-0 w-full bg-[var(--brand-primary)] rounded-full transition-all duration-1000 group-hover/bar:bg-[var(--brand-primary)]"
                                  style={{
                                    height: `${(weekRevenue[i] / maxWeekRevenue) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-[#000000] uppercase">
                                {day}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (Breakdowns) */}
                  <div className="col-span-4 w-full flex flex-col gap-6">
                    {/* Order Source Breakdown */}
                    <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
                      <h3 className="font-bold text-[#000000] mb-4 text-sm">
                        Order Source
                      </h3>
                      {totalOrdersCount === 0 ? (
                        <div className="text-center text-[#000000] text-sm font-semibold py-6">
                          No orders yet.
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-wider w-14">
                              Offline
                            </span>
                            <div className="flex-1 h-2.5 bg-[var(--brand-muted)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--brand-primary)] rounded-full transition-all duration-700"
                                style={{
                                  width: `${(offlineOrders / totalOrdersCount) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-black text-[#000000] w-8 text-right">
                              {offlineOrders}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-[#1A1A1A] uppercase tracking-wider w-14">
                              Online
                            </span>
                            <div className="flex-1 h-2.5 bg-[var(--brand-muted)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#1A1A1A] rounded-full transition-all duration-700"
                                style={{
                                  width: `${(onlineOrders / totalOrdersCount) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-black text-[#000000] w-8 text-right">
                              {onlineOrders}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Top Items by Revenue */}
                    <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex-1">
                      <h3 className="font-bold text-[#000000] text-sm mb-4">
                        Top Items by Revenue
                      </h3>
                      {topItems.length === 0 ? (
                        <div className="text-center text-[#000000] text-sm font-semibold py-6">
                          No items sold yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {topItems.map((item, idx) => (
                            <div
                              key={item.name}
                              className="flex items-center gap-3"
                            >
                              <span className="text-[11px] font-black text-[#000000] w-4">
                                {idx + 1}
                              </span>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-xs font-bold text-[#000000]">
                                    {item.name}
                                  </span>
                                  <span className="text-xs font-black text-[var(--brand-primary)]">
                                    ₹{item.revenue.toLocaleString()}
                                  </span>
                                </div>
                                <div className="h-1.5 bg-[var(--brand-muted)] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--brand-primary)] rounded-full transition-all duration-700"
                                    style={{
                                      width: `${(item.revenue / topItems[0].revenue) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-[10px] text-[#000000] font-semibold w-10 text-right">
                                {item.qty} pcs
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {analyticsSubTab === "coupons" && (() => {
              // Discount report (IGMOLS "Coupons"): every bill with a discount.
              const discounted = analyticsFilteredOrders.filter((o) => o.discount > 0);
              const totalDiscount = discounted.reduce((acc, o) => acc + o.discount, 0);
              const q = couponSearchQuery.trim().toLowerCase();
              const rows = discounted.filter(
                (o) =>
                  !q ||
                  o.id.toLowerCase().includes(q) ||
                  (o.customerPhone || "").includes(q) ||
                  o.discount.toString().includes(q) ||
                  o.grandTotal.toString().includes(q),
              );
              const money = (v: number) => "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
              return (
                <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
                  <div className="col-span-1 w-full bg-white border border-black/10 rounded-xl p-6 shadow-sm flex flex-col gap-6">
                    <h3 className="font-bold text-[#000000] text-sm">Discount Summary</h3>
                    <div className="p-4 bg-[#FFFFFF] border border-black/10 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">Total Discounts Given</span>
                        <PercentIcon className="w-4 h-4 text-[var(--brand-primary)]" />
                      </div>
                      <span className="text-2xl font-black text-[var(--brand-primary)]">{money(totalDiscount)}</span>
                    </div>
                    <div className="p-4 bg-[#FFFFFF] border border-black/10 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">Discounted Orders</span>
                        <CalendarIcon className="w-4 h-4 text-black/50" />
                      </div>
                      <span className="text-2xl font-black text-[#000000]">{discounted.length}</span>
                    </div>
                    <div className="p-4 bg-[#FFFFFF] border border-black/10 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]">Avg Discount Per Order</span>
                        <IndianRupee className="w-4 h-4 text-[#10B981]" />
                      </div>
                      <span className="text-2xl font-black text-[#000000]">{money(Math.round(discounted.length ? totalDiscount / discounted.length : 0))}</span>
                    </div>
                  </div>

                  <div className="col-span-2 w-full bg-white border border-black/10 rounded-xl p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                      <h3 className="font-bold text-[#000000] text-sm">Promo Campaign Performance</h3>
                      <div className="flex items-center border border-black/10 bg-[#FFFFFF] rounded-lg px-3 py-1.5 gap-2 shadow-xs w-full sm:w-auto">
                        <SearchIcon className="w-3.5 h-3.5 text-[#000000]" />
                        <input
                          type="text"
                          placeholder="Search bill/mobile/amount..."
                          className="text-xs font-semibold bg-transparent border-none outline-none focus:ring-0 text-[#000000] placeholder:text-[#000000]/50 w-full sm:w-[220px]"
                          value={couponSearchQuery}
                          onChange={(e) => setCouponSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    {discounted.length === 0 ? (
                      <div className="text-center text-[#000000] text-sm font-semibold py-12">No discounts given in this period.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#FFFFFF] border-b border-black/10">
                              <th className="p-3 text-[10px] font-bold text-[#000000] uppercase tracking-wider">Transaction ID</th>
                              <th className="p-3 text-[10px] font-bold text-[#000000] uppercase tracking-wider">Customer Mobile</th>
                              <th className="p-3 text-[10px] font-bold text-[#000000] uppercase tracking-wider text-right">Order Total</th>
                              <th className="p-3 text-[10px] font-bold text-[#000000] uppercase tracking-wider text-right">Discount Applied</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="text-center py-12 text-sm font-semibold text-[#000000]">No matching discounted bills found.</td>
                              </tr>
                            ) : (
                              rows.map((order) => (
                                <tr key={order.id} className="border-b border-transparent hover:bg-black/[0.02] transition-colors">
                                  <td className="p-3 text-xs font-semibold text-[#000000]">{order.id}</td>
                                  <td className="p-3 text-xs font-mono font-bold text-[#000000]">{order.customerPhone || "-"}</td>
                                  <td className="p-3 text-xs font-bold text-right text-[#000000]">{money(order.grandTotal)}</td>
                                  <td className="p-3 text-xs font-black text-[#27272A] text-right">-{money(order.discount)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {analyticsSubTab === "products" && (
              <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <h3 className="font-bold text-[#000000] text-sm">
                    Product Sales Leaderboard
                  </h3>

                  {/* Product Search Input */}
                  <div className="flex items-center border border-black/10 bg-[#FFFFFF] rounded-lg px-3 py-1.5 gap-2 shadow-xs w-full sm:w-auto animate-in fade-in duration-200">
                    <Search className="w-3.5 h-3.5 text-[#000000]" />
                    <input
                      type="text"
                      placeholder="Search product..."
                      className="text-xs font-semibold bg-transparent border-none outline-none focus:ring-0 text-[#000000] placeholder:text-[#000000]/50 w-full sm:w-[180px]"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {Object.keys(itemSales).length === 0 ? (
                  <div className="text-center text-[#000000] text-sm font-semibold py-12">
                    No products sold in this period.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#FFFFFF] border-b border-black/10">
                          <th className="p-3 text-[10px] font-bold text-[#000000] uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="p-3 text-[10px] font-bold text-[#000000] uppercase tracking-wider">
                            Product Name
                          </th>
                          <th className="p-3 text-[10px] font-bold text-[#000000] uppercase tracking-wider text-right">
                            Qty Sold
                          </th>
                          <th className="p-3 text-[10px] font-bold text-[#000000] uppercase tracking-wider text-right">
                            Revenue
                          </th>
                          <th className="p-3 text-[10px] font-bold text-[#000000] uppercase tracking-wider">
                            Market Share
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(itemSales).filter((item) =>
                          item.name
                            .toLowerCase()
                            .includes(productSearchQuery.toLowerCase()),
                        ).length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="text-center py-12 text-sm font-semibold text-[#000000]"
                            >
                              No matching products found.
                            </td>
                          </tr>
                        ) : (
                          Object.values(itemSales)
                            .filter((item) =>
                              item.name
                                .toLowerCase()
                                .includes(productSearchQuery.toLowerCase()),
                            )
                            .sort((a, b) => b.revenue - a.revenue)
                            .map((item, idx) => {
                              const share =
                                totalRevenueAmount > 0
                                  ? (item.revenue / totalRevenueAmount) * 100
                                  : 0;
                              return (
                                <tr
                                  key={item.name}
                                  className="border-b border-transparent hover:bg-[#FFFFFF]/50 transition-colors"
                                >
                                  <td className="p-3 text-xs font-black text-[#000000]">
                                    {idx + 1}
                                  </td>
                                  <td className="p-3 text-xs font-bold text-[#000000]">
                                    {item.name}
                                  </td>
                                  <td className="p-3 text-xs font-bold text-[#000000] text-right">
                                    {item.qty} pcs
                                  </td>
                                  <td className="p-3 text-xs font-black text-[var(--brand-primary)] text-right">
                                    ₹{item.revenue.toLocaleString()}
                                  </td>
                                  <td className="p-3 w-1/4">
                                    <div className="flex items-center gap-3">
                                      <div className="flex-1 h-2 bg-[var(--brand-muted)] rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-[var(--brand-primary)] rounded-full"
                                          style={{ width: `${share}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] font-bold text-[#000000] w-8">
                                        {share.toFixed(1)}%
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
            <div className="bg-[#FFFFFF] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-6 border-b border-black/10 flex justify-between items-center bg-[#FFFFFF]">
                <div>
                  <h3 className="text-xl font-bold text-[#000000]">
                    Order Details
                  </h3>
                  <p className="text-sm text-[#000000] font-medium mt-1">
                    {selectedOrder.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-black/10 rounded-full transition-colors group cursor-pointer"
                >
                  <X className="w-5 h-5 text-[#000000] group-hover:text-[var(--brand-primary)] transition-colors" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <div className="text-[10px] font-bold text-[#000000] uppercase tracking-wider mb-1">
                      Customer Name
                    </div>
                    <div className="text-sm font-semibold text-[#000000]">
                      {selectedOrder.customerName}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#000000] uppercase tracking-wider mb-1">
                      Contact Number
                    </div>
                    <div className="text-sm font-semibold text-[#000000]">
                      {selectedOrder.customerPhone || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#000000] uppercase tracking-wider mb-1">
                      Order Source
                    </div>
                    <div className="text-sm font-semibold text-[#000000]">
                      {selectedOrder.source}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#000000] uppercase tracking-wider mb-1">
                      Date & Time
                    </div>
                    <div className="text-sm font-semibold text-[#000000]">
                      {new Date(selectedOrder.date).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="mb-4 text-[11px] font-bold text-[#000000] uppercase tracking-[0.1em] border-b border-black/10 pb-2">
                  Order Items
                </div>
                <div className="space-y-3 mb-8">
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center"
                    >
                      <div>
                        <div className="text-sm font-bold text-[#000000]">
                          {item.name}
                        </div>
                        {item.desc && (
                          <div className="text-[10px] text-[#000000] font-medium">
                            {item.desc}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#000000]">
                          ₹{(item.price * item.qty).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-[#000000] font-medium">
                          {item.qty} x ₹{item.price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-black/10 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#000000] font-semibold">
                      Subtotal
                    </span>
                    <span className="text-[#000000] font-bold">
                      ₹{selectedOrder.subtotal.toLocaleString()}
                    </span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#000000] font-semibold">
                        Discount
                      </span>
                      <span className="text-[var(--brand-primary)] font-bold">
                        -₹{selectedOrder.discount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedOrder.deliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#000000] font-semibold">
                        Delivery Fee
                      </span>
                      <span className="text-[#000000] font-bold">
                        ₹{selectedOrder.deliveryFee.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg pt-2 mt-2 border-t border-transparent">
                    <span className="text-[#000000] font-black uppercase tracking-tight">
                      Total{" "}
                    </span>
                    <span className="text-[var(--brand-primary)] font-black">
                      ₹{selectedOrder.grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Classy Footer */}
        <footer className="mt-auto pt-10 pb-2 border-t border-black/10 flex flex-col md:flex-row justify-between items-center text-[10px] text-[#000000] font-semibold uppercase tracking-wider gap-4">
          <div className="text-[#000000]">
            &copy; 2026 All Rights Reserved. {shop.shopName}.
          </div>
          <div>
            Powered By{" "}
            <a
              href="https://www.cenexasystems.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--brand-primary)] hover:underline font-bold transition-all"
            >
              Cenexa Systems
            </a>{" "}
            &middot; 2026
          </div>
          <div className="italic text-[var(--brand-text-muted)] font-bold tracking-[0.15em] flex items-center gap-1.5">
            <span className="w-1 h-1 bg-[var(--brand-primary)] rounded-full"></span>
            Style. Comfort. Everyday.
          </div>
        </footer>
      </main>

      {/* "Bill Generated" after Complete Sale */}
      {saleCompletedPrompt && (() => {
        const snap = saleCompletedPrompt.orderSnapshot;
        return (
          <BillGeneratedModal
            bill={{
              id: snap.id,
              isGst: snap.applyGST && snap.gstAmount > 0,
              paymentMethod: snap.paymentMethod ?? "CASH",
              grandTotal: snap.grandTotal,
              amountReceived: snap.amountReceived,
              split: snap.split,
              items: snap.items,
              customerPhone: snap.customerPhone,
            }}
            onPrint={() => setBillPrintUrl(`C:/Program Files/Git/pos2/invoice/${snap.id}`)}
            onView={() => setActiveInvoiceId(snap.id)}
            onWhatsApp={(phone) => sendWhatsAppForSnapshot(snap, phone)}
            onNewSale={() => setSaleCompletedPrompt(null)}
          />
        );
      })()}
      {billPrintUrl && <PrintSettingsModal url={billPrintUrl} onClose={() => setBillPrintUrl(null)} />}

      {/* Invoice Modal */}
      {activeInvoiceId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--brand-bg)] rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] sm:h-[85vh] flex flex-col overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="px-4 py-3 flex justify-between items-center bg-white border-b border-black/10 shrink-0">
              <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-[#000000] truncate">
                <Printer className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
                <span className="truncate">Invoice #{activeInvoiceId}</span>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const id = activeInvoiceId;
                    if (!id) return;
                    setBillPrintUrl(`/pos2/invoice/${id}`);
                  }}
                  className="flex items-center gap-1.5 px-3 h-8 bg-[var(--brand-primary)] text-[var(--brand-on-primary)] hover:bg-[var(--brand-primary-dark)] rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                  title="Print / Save PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </button>
                {role === "admin" && (
                  <button
                    onClick={() => {
                      const id = activeInvoiceId;
                      if (!id) return;
                      setConfirmDialog({
                        title: "Delete this invoice?",
                        message: `Invoice ${id} will be permanently deleted from the database and removed from every analytics report. This cannot be undone.`,
                        confirmLabel: "Delete invoice",
                        onConfirm: () => handleDeleteOrder(id),
                      });
                    }}
                    disabled={deletingOrderId === activeInvoiceId}
                    className="flex items-center gap-1.5 px-3 h-8 bg-white border border-[var(--brand-primary)]/40 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-[var(--brand-on-primary)] rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingOrderId === activeInvoiceId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete
                  </button>
                )}
                <button
                  onClick={() => setActiveInvoiceId(null)}
                  className="w-8 h-8 flex items-center justify-center bg-black hover:bg-black/80 text-white rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 w-full bg-[var(--brand-bg)] overflow-hidden relative">
              <iframe
                src={`/pos2/invoice/${activeInvoiceId}`}
                className="w-full h-full border-none absolute inset-0"
                title={`Invoice ${activeInvoiceId}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog ("Are you sure?") */}
      {confirmDialog && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!confirmBusy) setConfirmDialog(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[var(--brand-primary)]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black text-[#000000] tracking-tight">
                  {confirmDialog.title}
                </h3>
                <p className="text-[13px] font-medium text-[var(--brand-text-soft)] mt-1.5 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-[var(--brand-bg)]/60 border-t border-black/10 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                disabled={confirmBusy}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-[#000000] bg-white border border-black/15 hover:bg-[var(--brand-bg)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={runConfirm}
                disabled={confirmBusy}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-[var(--brand-on-primary)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {confirmBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {confirmBusy ? "Working…" : confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
