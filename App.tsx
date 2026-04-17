import React, { useEffect, useMemo, useState } from 'react';

type Product = {
  id: number;
  name: string;
  category: string;
  description: string;
  unitMeasure: string;
  cost: number;
  salePrice: number;
  stock: number;
  minStock: number;
  createdAt?: string;
  updatedAt?: string;
};

type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

type SaleItem = {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
};

type Sale = {
  id: number;
  createdAt: string;
  total: number;
  items: SaleItem[];
};

type Purchase = {
  id: number;
  createdAt: string;
  productId: number;
  name: string;
  quantity: number;
  unitCost: number;
  total: number;
};

type Expense = {
  id: number;
  createdAt: string;
  concept: string;
  amount: number;
  category: string;
};

type TabKey = 'Inicio' | 'Inventario' | 'Ventas' | 'Compras' | 'Gastos' | 'Caja' | 'Reporte' | 'Resultados';

type CashDay = {
  dateKey: string;
  initialBalance: number;
  realBalance: number;
  updatedAt: string;
};

type CashClosure = {
  dateKey: string;
  initialBalance: number;
  cashIn: number;
  purchaseOut: number;
  expenseOut: number;
  expectedBalance: number;
  realBalance: number;
  difference: number;
  closedAt: string;
};

type StoredData = {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  cashDays: CashDay[];
  cashClosures: CashClosure[];
  nextProductId: number;
  nextSaleId: number;
  nextPurchaseId: number;
  nextExpenseId: number;
};

const STORAGE_KEY = 'mi_negocio_app_storage_v23';
let forceMemoryStorageForTests = false;

const memoryStore: { data: StoredData } = {
  data: {
    products: [],
    sales: [],
    purchases: [],
    expenses: [],
    cashDays: [],
    cashClosures: [],
    nextProductId: 1,
    nextSaleId: 1,
    nextPurchaseId: 1,
    nextExpenseId: 1,
  },
};

function getDefaultData(): StoredData {
  return {
    products: [],
    sales: [],
    purchases: [],
    expenses: [],
    cashDays: [],
    cashClosures: [],
    nextProductId: 1,
    nextSaleId: 1,
    nextPurchaseId: 1,
    nextExpenseId: 1,
  };
}

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function loadData(): StoredData {
  if (!forceMemoryStorageForTests && canUseLocalStorage()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefaultData();
      const parsed = JSON.parse(raw) as Partial<StoredData>;
      return {
        products: Array.isArray(parsed.products) ? parsed.products : [],
        sales: Array.isArray(parsed.sales) ? parsed.sales : [],
        purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        cashDays: Array.isArray(parsed.cashDays) ? parsed.cashDays : [],
        cashClosures: Array.isArray(parsed.cashClosures) ? parsed.cashClosures : [],
        nextProductId:
          typeof parsed.nextProductId === 'number' && parsed.nextProductId > 0
            ? parsed.nextProductId
            : 1,
        nextSaleId:
          typeof parsed.nextSaleId === 'number' && parsed.nextSaleId > 0
            ? parsed.nextSaleId
            : 1,
        nextPurchaseId:
          typeof parsed.nextPurchaseId === 'number' && parsed.nextPurchaseId > 0
            ? parsed.nextPurchaseId
            : 1,
        nextExpenseId:
          typeof parsed.nextExpenseId === 'number' && parsed.nextExpenseId > 0
            ? parsed.nextExpenseId
            : 1,
      };
    } catch {
      return getDefaultData();
    }
  }
  return memoryStore.data;
}

function saveData(data: StoredData): void {
  if (!forceMemoryStorageForTests && canUseLocalStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return;
    } catch {
      memoryStore.data = data;
      return;
    }
  }
  memoryStore.data = data;
}

function getAllProductsFromStorage(): Product[] {
  return loadData().products;
}

function getAllSalesFromStorage(): Sale[] {
  return loadData().sales;
}

function getAllPurchasesFromStorage(): Purchase[] {
  return loadData().purchases;
}

function getAllExpensesFromStorage(): Expense[] {
  return loadData().expenses;
}

function getCashDay(dateKey: string): CashDay | undefined {
  return loadData().cashDays.find((item) => item.dateKey === dateKey);
}

function saveCashDay(dateKey: string, initialBalance: number, realBalance: number): void {
  const current = loadData();
  const updatedAt = new Date().toISOString();
  const existing = current.cashDays.find((item) => item.dateKey === dateKey);
  const nextCashDays = existing
    ? current.cashDays.map((item) =>
        item.dateKey === dateKey ? { ...item, initialBalance, realBalance, updatedAt } : item
      )
    : [...current.cashDays, { dateKey, initialBalance, realBalance, updatedAt }];

  saveData({
    ...current,
    cashDays: nextCashDays,
  });
}

function getAllCashClosuresFromStorage(): CashClosure[] {
  return loadData().cashClosures;
}

function closeCashDay(dateKey: string, snapshot: Omit<CashClosure, 'dateKey' | 'closedAt'>): void {
  const current = loadData();
  const closure: CashClosure = {
    dateKey,
    closedAt: new Date().toISOString(),
    ...snapshot,
  };

  const nextClosures = current.cashClosures.some((item) => item.dateKey === dateKey)
    ? current.cashClosures.map((item) => (item.dateKey === dateKey ? closure : item))
    : [closure, ...current.cashClosures];

  saveData({
    ...current,
    cashClosures: nextClosures,
  });
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(date: Date): string {
  return date.toDateString();
}

function toMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function openCashDay(dateKey: string, initialBalance: number): void {
  const existing = getCashDay(dateKey);
  saveCashDay(dateKey, initialBalance, existing?.realBalance ?? initialBalance);
}

function createProductInStorage(input: ProductInput): Product {
  const current = loadData();
  const now = new Date().toISOString();
  const product: Product = {
    ...input,
    id: current.nextProductId,
    createdAt: now,
    updatedAt: now,
  };

  saveData({
    ...current,
    products: [...current.products, product].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    nextProductId: current.nextProductId + 1,
  });

  return product;
}

function deleteProductFromStorage(id: number): void {
  const current = loadData();
  saveData({
    ...current,
    products: current.products.filter((product) => product.id !== id),
  });
}

function registerPurchase(productId: number, quantity: number, unitCost: number) {
  const current = loadData();
  const product = current.products.find((item) => item.id === productId);

  if (!product) return { ok: false, message: 'Producto no encontrado.' } as const;
  if (!(quantity > 0)) return { ok: false, message: 'La cantidad debe ser mayor que cero.' } as const;
  if (!(unitCost >= 0)) return { ok: false, message: 'El costo unitario no es válido.' } as const;

  const now = new Date().toISOString();
  const previousTotal = product.stock * product.cost;
  const purchaseTotal = quantity * unitCost;
  const newStock = product.stock + quantity;
  const weightedAverageCost = newStock > 0 ? (previousTotal + purchaseTotal) / newStock : 0;

  const purchase: Purchase = {
    id: current.nextPurchaseId,
    createdAt: now,
    productId,
    name: product.name,
    quantity,
    unitCost,
    total: purchaseTotal,
  };

  saveData({
    ...current,
    products: current.products.map((item) =>
      item.id === productId
        ? { ...item, stock: newStock, cost: weightedAverageCost, updatedAt: now }
        : item
    ),
    purchases: [purchase, ...current.purchases],
    nextPurchaseId: current.nextPurchaseId + 1,
  });

  return { ok: true } as const;
}

function confirmSaleInStorage(items: SaleItem[]) {
  const current = loadData();
  if (items.length === 0) {
    return { ok: false, message: 'Debes agregar al menos un producto al carrito.' } as const;
  }

  const productMap = new Map<number, Product>(current.products.map((item) => [item.id, item]));

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) return { ok: false, message: `El producto ${item.name} ya no existe.` } as const;
    if (item.quantity <= 0) {
      return { ok: false, message: `La cantidad de ${item.name} debe ser mayor que cero.` } as const;
    }
    if (item.quantity > product.stock) {
      return {
        ok: false,
        message: `No hay suficiente stock para ${item.name}. Disponible: ${product.stock}.`,
      } as const;
    }
  }

  const now = new Date().toISOString();
  const normalizedItems: SaleItem[] = items.map((item) => {
    const product = productMap.get(item.productId)!;
    return {
      ...item,
      unitCost: product.cost,
      subtotal: item.quantity * item.unitPrice,
    };
  });

  const sale: Sale = {
    id: current.nextSaleId,
    createdAt: now,
    total: normalizedItems.reduce((sum, item) => sum + item.subtotal, 0),
    items: normalizedItems,
  };

  saveData({
    ...current,
    products: current.products.map((product) => {
      const line = normalizedItems.find((item) => item.productId === product.id);
      return line ? { ...product, stock: product.stock - line.quantity, updatedAt: now } : product;
    }),
    sales: [sale, ...current.sales],
    nextSaleId: current.nextSaleId + 1,
  });

  return { ok: true, sale } as const;
}

function registerExpense(concept: string, amount: number, category: string) {
  const current = loadData();
  const normalizedConcept = concept.trim();
  const normalizedCategory = category.trim() || 'General';

  if (!normalizedConcept) return { ok: false, message: 'El concepto es obligatorio.' } as const;
  if (!(amount > 0)) return { ok: false, message: 'El valor del gasto debe ser mayor que cero.' } as const;

  const expense: Expense = {
    id: current.nextExpenseId,
    createdAt: new Date().toISOString(),
    concept: normalizedConcept,
    amount,
    category: normalizedCategory,
  };

  saveData({
    ...current,
    expenses: [expense, ...current.expenses],
    nextExpenseId: current.nextExpenseId + 1,
  });

  return { ok: true } as const;
}

function formatCOP(value: number): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$ ${Math.round(value)}`;
  }
}

function formatDate(dateText: string): string {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(dateText));
  } catch {
    return dateText;
  }
}

function toPositiveNumber(text: string): number {
  const parsed = Number(text.replace(',', '.').trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
}

function validateProductInput(input: {
  name: string;
  category: string;
  cost: string;
  salePrice: string;
  stock: string;
  minStock: string;
}) {
  if (!input.name.trim()) {
    return { ok: false, message: 'El nombre del producto es obligatorio.' } as const;
  }
  const cost = toPositiveNumber(input.cost);
  const salePrice = toPositiveNumber(input.salePrice);
  const stock = toPositiveNumber(input.stock);
  const minStock = toPositiveNumber(input.minStock);
  if ([cost, salePrice, stock, minStock].some(Number.isNaN)) {
    return { ok: false, message: 'Revisa los valores numéricos. No deben ser negativos.' } as const;
  }
  return {
    ok: true,
    value: {
      name: input.name.trim(),
      category: input.category.trim() || 'General',
      description: '',
      unitMeasure: 'unidad',
      cost,
      salePrice,
      stock,
      minStock,
    },
  } as const;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Test falló: ${message}`);
}

function runSelfTests(): void {
  const backup = JSON.parse(JSON.stringify(memoryStore.data)) as StoredData;
  const previousForce = forceMemoryStorageForTests;
  forceMemoryStorageForTests = true;
  memoryStore.data = getDefaultData();

  try {
    assert(formatCOP(1000).length > 0, 'formatCOP');
    assert(toPositiveNumber('12') === 12, 'num');

    const validated = validateProductInput({
      name: 'A',
      category: 'C',
      cost: '1',
      salePrice: '2',
      stock: '3',
      minStock: '1',
    });
    assert(validated.ok, 'val');

    const product = createProductInStorage({
      name: 'P',
      category: 'T',
      description: '',
      unitMeasure: 'unidad',
      cost: 100,
      salePrice: 200,
      stock: 3,
      minStock: 1,
    });
    assert(getAllProductsFromStorage().length === 1, 'prod');

    assert(registerPurchase(product.id, 2, 120).ok, 'buy1');
    assert(getAllProductsFromStorage()[0].cost === 108, 'avg1');

    assert(registerPurchase(product.id, 5, 150).ok, 'buy2');
    assert(getAllProductsFromStorage()[0].cost === 129, 'avg2');

    assert(
      confirmSaleInStorage([
        {
          productId: product.id,
          name: product.name,
          quantity: 2,
          unitPrice: product.salePrice,
          unitCost: product.cost,
          subtotal: 0,
        },
      ]).ok,
      'sale'
    );
    assert(getAllProductsFromStorage()[0].stock === 8, 'stock');

    assert(registerExpense('Transporte', 5000, 'Op').ok, 'exp');

    const cin = getAllSalesFromStorage().reduce((sum, item) => sum + item.total, 0);
    const pout = getAllPurchasesFromStorage().reduce((sum, item) => sum + item.total, 0);
    const eout = getAllExpensesFromStorage().reduce((sum, item) => sum + item.amount, 0);

    assert(cin === 400, 'cin');
    assert(pout === 990, 'pout');
    assert(eout === 5000, 'eout');

    saveCashDay('2099-01-01', 10000, 12000);
    const cashDay = getCashDay('2099-01-01');
    assert(!!cashDay, 'cashday');
    assert(cashDay?.initialBalance === 10000, 'cashday initial');
    assert(cashDay?.realBalance === 12000, 'cashday real');

    closeCashDay('2099-01-01', {
      initialBalance: 10000,
      cashIn: 4000,
      purchaseOut: 1000,
      expenseOut: 500,
      expectedBalance: 12500,
      realBalance: 12400,
      difference: -100,
    });
    const closures = getAllCashClosuresFromStorage();
    assert(closures.length === 1, 'closure length');

    openCashDay('2099-01-02', 12400);
    const opened = getCashDay('2099-01-02');
    assert(opened?.initialBalance === 12400, 'open tomorrow');
  } finally {
    memoryStore.data = backup;
    forceMemoryStorageForTests = previousForce;
  }
}

function SummaryCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-slate-700 mb-1.5">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none"
      />
    </label>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xl font-bold text-slate-900">{title}</div>
      <div className="text-slate-500 mt-1 mb-5">{subtitle}</div>
      {children}
    </div>
  );
}

export default function App() {
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<TabKey>('Inicio');

  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('General');
  const [productCost, setProductCost] = useState('0');
  const [productPrice, setProductPrice] = useState('0');
  const [productStock, setProductStock] = useState('0');
  const [productMinStock, setProductMinStock] = useState('0');
  const [inventoryMessage, setInventoryMessage] = useState('');

  const [purchaseProductId, setPurchaseProductId] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState('0');
  const [purchaseCost, setPurchaseCost] = useState('0');
  const [purchaseMessage, setPurchaseMessage] = useState('');

  const [expenseConcept, setExpenseConcept] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('0');
  const [expenseCategory, setExpenseCategory] = useState('General');
  const [expenseMessage, setExpenseMessage] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [salesMessage, setSalesMessage] = useState('');

  const products = getAllProductsFromStorage();
  const sales = getAllSalesFromStorage();
  const purchases = getAllPurchasesFromStorage();
  const expenses = getAllExpensesFromStorage();
  const cashClosures = getAllCashClosuresFromStorage();

  const [currentNow, setCurrentNow] = useState(() => new Date());
  const todayKey = useMemo(() => currentNow.toDateString(), [currentNow]);

  const [cashInitial, setCashInitial] = useState('0');
  const [cashReal, setCashReal] = useState('0');
  const [cashMessage, setCashMessage] = useState('');
  const [reportMonth, setReportMonth] = useState(toMonthKey(new Date()));

  useEffect(() => {
    runSelfTests();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentNow(new Date());
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const saved = getCashDay(todayKey);
    setCashInitial(String(saved?.initialBalance ?? 0));
    setCashReal(String(saved?.realBalance ?? 0));
  }, [todayKey, tick]);

  const salesToday = sales.filter((item) => new Date(item.createdAt).toDateString() === todayKey);
  const purchasesToday = purchases.filter((item) => new Date(item.createdAt).toDateString() === todayKey);
  const expensesToday = expenses.filter((item) => new Date(item.createdAt).toDateString() === todayKey);

  const salesTotal = salesToday.reduce((sum, item) => sum + item.total, 0);
  const costTotal = salesToday.reduce(
    (sum, sale) => sum + sale.items.reduce((acc, item) => acc + item.unitCost * item.quantity, 0),
    0
  );
  const grossProfit = salesTotal - costTotal;
  const expenseTotal = expensesToday.reduce((sum, item) => sum + item.amount, 0);
  const netProfit = grossProfit - expenseTotal;
  const cashIn = salesTotal;
  const purchaseOut = purchasesToday.reduce((sum, item) => sum + item.total, 0);
  const cashOut = purchaseOut + expenseTotal;
  const cashFlow = cashIn - cashOut;
  const expectedBalance = (Number(cashInitial) || 0) + cashFlow;
  const balanceDifference = (Number(cashReal) || 0) - expectedBalance;

  const tomorrowKey = toDateKey(addDays(new Date(), 1));

  const salesInMonth = sales.filter((item) => toMonthKey(new Date(item.createdAt)) === reportMonth);
  const purchasesInMonth = purchases.filter((item) => toMonthKey(new Date(item.createdAt)) === reportMonth);
  const expensesInMonth = expenses.filter((item) => toMonthKey(new Date(item.createdAt)) === reportMonth);
  const monthlySalesTotal = salesInMonth.reduce((sum, item) => sum + item.total, 0);
  const monthlyCostTotal = salesInMonth.reduce(
    (sum, sale) => sum + sale.items.reduce((acc, item) => acc + item.unitCost * item.quantity, 0),
    0
  );
  const monthlyGrossProfit = monthlySalesTotal - monthlyCostTotal;
  const monthlyPurchaseTotal = purchasesInMonth.reduce((sum, item) => sum + item.total, 0);
  const monthlyExpenseTotal = expensesInMonth.reduce((sum, item) => sum + item.amount, 0);
  const monthlyNetProfit = monthlyGrossProfit - monthlyExpenseTotal;
  const recentClosures = cashClosures
    .slice()
    .sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime())
    .slice(0, 10);

  const monthlyStatementSales = monthlySalesTotal;
  const monthlyStatementCostOfSales = monthlyCostTotal;
  const monthlyStatementGrossProfit = monthlyGrossProfit;
  const monthlyStatementOperatingExpenses = monthlyExpenseTotal;
  const monthlyStatementNetProfit = monthlyNetProfit;

  const filteredProducts = searchTerm.trim()
    ? products.filter((product) => product.name.toLowerCase().includes(searchTerm.trim().toLowerCase()))
    : products;

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartProfit = cart.reduce((sum, item) => sum + (item.unitPrice - item.unitCost) * item.quantity, 0);

  function rerender() {
    setTick((value) => value + 1);
  }

  function handleCreateProduct() {
    const result = validateProductInput({
      name: productName,
      category: productCategory,
      cost: productCost,
      salePrice: productPrice,
      stock: productStock,
      minStock: productMinStock,
    });
    if (!result.ok) {
      setInventoryMessage(result.message);
      return;
    }
    createProductInStorage(result.value);
    setProductName('');
    setProductCategory('General');
    setProductCost('0');
    setProductPrice('0');
    setProductStock('0');
    setProductMinStock('0');
    setInventoryMessage('Producto registrado correctamente.');
    rerender();
  }

  function handleRegisterPurchase() {
    if (!purchaseProductId) {
      setPurchaseMessage('Selecciona un producto.');
      return;
    }
    const result = registerPurchase(Number(purchaseProductId), Number(purchaseQuantity), Number(purchaseCost));
    if (!result.ok) {
      setPurchaseMessage(result.message);
      return;
    }
    setPurchaseQuantity('0');
    setPurchaseCost('0');
    setPurchaseMessage('Compra registrada correctamente.');
    rerender();
  }

  function handleRegisterExpense() {
    const result = registerExpense(expenseConcept, Number(expenseAmount), expenseCategory);
    if (!result.ok) {
      setExpenseMessage(result.message);
      return;
    }
    setExpenseConcept('');
    setExpenseAmount('0');
    setExpenseCategory('General');
    setExpenseMessage('Gasto registrado correctamente.');
    rerender();
  }

  function addToCart(product: Product) {
    setSalesMessage('');
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setSalesMessage(`No puedes agregar más unidades de ${product.name}.`);
          return current;
        }
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }
      if (product.stock <= 0) {
        setSalesMessage(`${product.name} no tiene stock disponible.`);
        return current;
      }
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.salePrice,
          unitCost: product.cost,
          subtotal: product.salePrice,
        },
      ];
    });
  }

  function updateCartQuantity(productId: number, rawValue: string) {
    const quantity = Math.max(0, Math.floor(Number(rawValue) || 0));
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    if (quantity > product.stock) {
      setSalesMessage(`No hay suficiente stock para ${product.name}. Disponible: ${product.stock}.`);
      return;
    }
    setSalesMessage('');
    if (quantity === 0) {
      setCart((current) => current.filter((item) => item.productId !== productId));
      return;
    }
    setCart((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, quantity, subtotal: quantity * item.unitPrice } : item
      )
    );
  }

  function confirmCurrentSale() {
    const result = confirmSaleInStorage(cart);
    if (!result.ok) {
      setSalesMessage(result.message);
      return;
    }
    setCart([]);
    setSalesMessage('Venta registrada correctamente.');
    rerender();
  }

  function handleCloseCashDay() {
    closeCashDay(todayKey, {
      initialBalance: Number(cashInitial) || 0,
      cashIn,
      purchaseOut,
      expenseOut: expenseTotal,
      expectedBalance,
      realBalance: Number(cashReal) || 0,
      difference: balanceDifference,
    });
    setCashMessage('Caja del día cerrada correctamente.');
    rerender();
  }

  function handleOpenTomorrowWithZero() {
    openCashDay(tomorrowKey, 0);
    setCashMessage('Se abrió la caja de mañana en cero.');
    rerender();
  }

  function handleOpenTomorrowWithTodayReal() {
    openCashDay(tomorrowKey, Number(cashReal) || 0);
    setCashMessage('Se abrió la caja de mañana con el saldo real de hoy.');
    rerender();
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-slate-900 text-white px-6 py-5">
            <div className="text-sm text-slate-300">Mi Negocio App</div>
            <div className="text-3xl font-bold mt-1">Control diario del negocio</div>
          </div>

          <div className="p-5 md:p-6">
            {tab === 'Inicio' && (
              <div>
                <div className="text-2xl font-bold text-slate-900">Resumen diario</div>
                <div className="text-slate-500 mt-1 mb-6">Movimiento del día actual: {todayKey}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                  <SummaryCard title="Ventas del día" value={formatCOP(salesTotal)} />
                  <SummaryCard title="Utilidad bruta" value={formatCOP(grossProfit)} />
                  <SummaryCard title="Gastos del día" value={formatCOP(expenseTotal)} />
                  <SummaryCard title="Utilidad neta" value={formatCOP(netProfit)} />
                  <SummaryCard title="Flujo de caja" value={formatCOP(cashFlow)} />
                </div>
              </div>
            )}

            {tab === 'Inventario' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <SectionCard title="Inventario" subtitle="Crea artículos con costo inicial, precio y stock.">
                  <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-4">
                    <Field label="Nombre" value={productName} onChange={setProductName} />
                    <Field label="Categoría" value={productCategory} onChange={setProductCategory} />
                    <Field label="Costo" value={productCost} onChange={setProductCost} type="number" />
                    <Field label="Precio de venta" value={productPrice} onChange={setProductPrice} type="number" />
                    <Field label="Stock inicial" value={productStock} onChange={setProductStock} type="number" />
                    <Field label="Stock mínimo" value={productMinStock} onChange={setProductMinStock} type="number" />
                    <button onClick={handleCreateProduct} className="w-full rounded-2xl bg-slate-900 text-white py-3 font-semibold">
                      Guardar producto
                    </button>
                    {inventoryMessage ? <div className="text-sm text-slate-700">{inventoryMessage}</div> : null}
                  </div>
                </SectionCard>

                <SectionCard title="Productos registrados" subtitle="Listado actual del inventario.">
                  {products.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-slate-500">
                      Aún no hay productos registrados.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {products.map((product) => (
                        <div key={product.id} className="rounded-2xl bg-white border border-slate-200 p-4 flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-lg font-bold text-slate-900">{product.name}</div>
                            <div className="text-sm text-slate-500">Categoría: {product.category}</div>
                            <div className="text-sm text-slate-500">Costo: {formatCOP(product.cost)} · Venta: {formatCOP(product.salePrice)}</div>
                            <div className={`text-sm font-semibold mt-2 ${product.stock <= product.minStock ? 'text-red-600' : 'text-green-700'}`}>
                              Stock: {product.stock} | Mínimo: {product.minStock}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              deleteProductFromStorage(product.id);
                              rerender();
                            }}
                            className="text-red-600 font-semibold"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {tab === 'Compras' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <SectionCard title="Compras de inventario" subtitle="Aumenta el stock usando promedio ponderado.">
                  <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-4">
                    <label className="block">
                      <div className="text-sm font-semibold text-slate-700 mb-1.5">Producto</div>
                      <select
                        value={purchaseProductId}
                        onChange={(event) => setPurchaseProductId(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none"
                      >
                        <option value="">Seleccionar producto</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                    </label>
                    <Field label="Cantidad" value={purchaseQuantity} onChange={setPurchaseQuantity} type="number" />
                    <Field label="Costo unitario" value={purchaseCost} onChange={setPurchaseCost} type="number" />
                    <button onClick={handleRegisterPurchase} className="w-full rounded-2xl bg-slate-900 text-white py-3 font-semibold">
                      Registrar compra
                    </button>
                    {purchaseMessage ? <div className="text-sm text-slate-700">{purchaseMessage}</div> : null}
                  </div>
                </SectionCard>

                <SectionCard title="Compras recientes" subtitle="Últimas entradas de inventario.">
                  {purchases.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-slate-500">
                      No hay compras registradas todavía.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {purchases.slice(0, 5).map((purchase) => (
                        <div key={purchase.id} className="rounded-2xl bg-white border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="font-bold text-slate-900">{purchase.name}</div>
                              <div className="text-sm text-slate-500">{formatDate(purchase.createdAt)}</div>
                            </div>
                            <div className="font-bold text-slate-900">{formatCOP(purchase.total)}</div>
                          </div>
                          <div className="mt-2 text-sm text-slate-600">Cantidad: {purchase.quantity} · Costo unitario: {formatCOP(purchase.unitCost)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {tab === 'Ventas' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <SectionCard title="Ventas" subtitle="Busca artículos, agrégalos al carrito y confirma.">
                  <div className="space-y-4">
                    <Field label="Buscar artículo" value={searchTerm} onChange={setSearchTerm} />
                    {products.length === 0 ? (
                      <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-slate-500">
                        Primero debes registrar productos en inventario.
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-slate-500">
                        No se encontraron artículos con ese nombre.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredProducts.map((product) => (
                          <div key={product.id} className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between gap-4">
                            <div>
                              <div className="font-bold text-slate-900">{product.name}</div>
                              <div className="text-sm text-slate-500">Stock disponible: {product.stock}</div>
                              <div className="text-sm text-slate-500">Precio: {formatCOP(product.salePrice)}</div>
                            </div>
                            <button
                              onClick={() => addToCart(product)}
                              disabled={product.stock <= 0}
                              className="rounded-xl bg-slate-900 text-white px-4 py-2.5 font-semibold disabled:opacity-50"
                            >
                              Agregar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Carrito" subtitle="Revisa cantidades y confirma la venta.">
                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    {cart.length === 0 ? (
                      <div className="text-slate-500 text-center py-8">Aún no has agregado productos.</div>
                    ) : (
                      <div className="space-y-4">
                        {cart.map((item) => (
                          <div key={item.productId} className="border border-slate-200 rounded-2xl p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="font-bold text-slate-900">{item.name}</div>
                                <div className="text-sm text-slate-500">Precio unitario: {formatCOP(item.unitPrice)}</div>
                                <div className="text-sm text-slate-500">Costo unitario: {formatCOP(item.unitCost)}</div>
                              </div>
                              <button
                                onClick={() => setCart((current) => current.filter((line) => line.productId !== item.productId))}
                                className="text-red-600 font-semibold"
                              >
                                Quitar
                              </button>
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                              <label className="text-sm text-slate-600">Cantidad</label>
                              <input
                                type="number"
                                min={0}
                                value={item.quantity}
                                onChange={(event) => updateCartQuantity(item.productId, event.target.value)}
                                className="w-24 rounded-xl border border-slate-300 px-3 py-2"
                              />
                              <div className="text-sm font-semibold text-slate-800">Subtotal: {formatCOP(item.subtotal)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {salesMessage ? <div className="mt-4 text-sm text-slate-700">{salesMessage}</div> : null}
                    <div className="mt-5 border-t border-slate-200 pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold text-slate-700">Total</div>
                        <div className="text-2xl font-bold text-slate-900">{formatCOP(cartTotal)}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-600">Utilidad estimada</div>
                        <div className="text-lg font-bold text-emerald-700">{formatCOP(cartProfit)}</div>
                      </div>
                    </div>
                    <button
                      onClick={confirmCurrentSale}
                      disabled={cart.length === 0}
                      className="mt-4 w-full rounded-2xl bg-emerald-600 text-white py-3 font-bold disabled:opacity-50"
                    >
                      Confirmar venta
                    </button>
                  </div>
                </SectionCard>
              </div>
            )}

            {tab === 'Gastos' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <SectionCard title="Gastos operativos" subtitle="Registra transporte, servicios, arriendo y más.">
                  <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-4">
                    <Field label="Concepto" value={expenseConcept} onChange={setExpenseConcept} />
                    <Field label="Valor" value={expenseAmount} onChange={setExpenseAmount} type="number" />
                    <Field label="Categoría" value={expenseCategory} onChange={setExpenseCategory} />
                    <button onClick={handleRegisterExpense} className="w-full rounded-2xl bg-slate-900 text-white py-3 font-semibold">
                      Registrar gasto
                    </button>
                    {expenseMessage ? <div className="text-sm text-slate-700">{expenseMessage}</div> : null}
                  </div>
                </SectionCard>

                <SectionCard title="Gastos recientes" subtitle="Últimos gastos operativos registrados.">
                  {expenses.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-slate-500">
                      No hay gastos registrados todavía.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {expenses.slice(0, 5).map((expense) => (
                        <div key={expense.id} className="rounded-2xl bg-white border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="font-bold text-slate-900">{expense.concept}</div>
                              <div className="text-sm text-slate-500">{formatDate(expense.createdAt)}</div>
                            </div>
                            <div className="font-bold text-slate-900">{formatCOP(expense.amount)}</div>
                          </div>
                          <div className="mt-2 text-sm text-slate-600">Categoría: {expense.category}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {tab === 'Caja' && (
              <div className="space-y-6">
                <SectionCard title="Caja diaria" subtitle="Control real del efectivo.">
                  <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-4">
                    <Field
                      label="Saldo inicial"
                      value={cashInitial}
                      onChange={(value) => {
                        setCashInitial(value);
                        saveCashDay(todayKey, Number(value) || 0, Number(cashReal) || 0);
                      }}
                      type="number"
                    />
                    <Field
                      label="Saldo real contado"
                      value={cashReal}
                      onChange={(value) => {
                        setCashReal(value);
                        saveCashDay(todayKey, Number(cashInitial) || 0, Number(value) || 0);
                      }}
                      type="number"
                    />
                    {cashMessage ? <div className="text-sm text-slate-700">{cashMessage}</div> : null}
                    <div className="flex flex-wrap gap-3">
                      <button onClick={handleCloseCashDay} className="rounded-2xl bg-slate-900 text-white px-4 py-3 font-semibold">
                        Cerrar caja de hoy
                      </button>
                      <button onClick={handleOpenTomorrowWithZero} className="rounded-2xl bg-white border border-slate-300 text-slate-700 px-4 py-3 font-semibold">
                        Abrir mañana en 0
                      </button>
                      <button onClick={handleOpenTomorrowWithTodayReal} className="rounded-2xl bg-white border border-slate-300 text-slate-700 px-4 py-3 font-semibold">
                        Abrir mañana con saldo real
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mt-4">
                    <SummaryCard title="Entradas" value={formatCOP(cashIn)} subtitle="Ventas" />
                    <SummaryCard title="Salidas compras" value={formatCOP(purchaseOut)} subtitle="Inventario" />
                    <SummaryCard title="Salidas gastos" value={formatCOP(expenseTotal)} subtitle="Operativos" />
                    <SummaryCard title="Saldo esperado" value={formatCOP(expectedBalance)} subtitle="Inicial más flujo" />
                    <SummaryCard title="Diferencia" value={formatCOP(balanceDifference)} subtitle="Real menos esperado" />
                  </div>
                </SectionCard>

                <SectionCard title="Cierres recientes" subtitle="Últimos cierres diarios registrados.">
                  {recentClosures.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-slate-500">
                      No hay cierres de caja registrados todavía.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentClosures.map((closure) => (
                        <div key={closure.dateKey} className="rounded-2xl bg-white border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="font-bold text-slate-900">{closure.dateKey}</div>
                              <div className="text-sm text-slate-500">Cierre: {formatDate(closure.closedAt)}</div>
                            </div>
                            <div className="font-bold text-slate-900">{formatCOP(closure.realBalance)}</div>
                          </div>
                          <div className="mt-2 text-sm text-slate-600">
                            Esperado: {formatCOP(closure.expectedBalance)} · Diferencia: {formatCOP(closure.difference)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {tab === 'Reporte' && (
              <div className="space-y-6">
                <SectionCard title="Reporte mensual" subtitle="Consulta resultados de gestión por mes sin borrar histórico.">
                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    <label className="block max-w-xs">
                      <div className="text-sm font-semibold text-slate-700 mb-1.5">Mes</div>
                      <input
                        type="month"
                        value={reportMonth}
                        onChange={(event) => setReportMonth(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mt-4">
                    <SummaryCard title="Ventas del mes" value={formatCOP(monthlySalesTotal)} subtitle={`${salesInMonth.length} ventas`} />
                    <SummaryCard title="Compras del mes" value={formatCOP(monthlyPurchaseTotal)} subtitle={`${purchasesInMonth.length} compras`} />
                    <SummaryCard title="Gastos del mes" value={formatCOP(monthlyExpenseTotal)} subtitle={`${expensesInMonth.length} gastos`} />
                    <SummaryCard title="Utilidad bruta" value={formatCOP(monthlyGrossProfit)} subtitle="Ventas menos costo" />
                    <SummaryCard title="Utilidad neta" value={formatCOP(monthlyNetProfit)} subtitle="Bruta menos gastos" />
                  </div>
                </SectionCard>

                <SectionCard title="Inventario actual" subtitle="El inventario se arrastra automáticamente al siguiente mes.">
                  {products.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-slate-500">
                      No hay inventario registrado.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {products.map((product) => (
                        <div key={product.id} className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between gap-4">
                          <div>
                            <div className="font-bold text-slate-900">{product.name}</div>
                            <div className="text-sm text-slate-500">Stock: {product.stock} · Costo promedio: {formatCOP(product.cost)}</div>
                          </div>
                          <div className="font-bold text-slate-900">{formatCOP(product.stock * product.cost)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {tab === 'Resultados' && (
              <div className="space-y-6">
                <SectionCard title="Estado de Resultados" subtitle="Lectura contable mensual del negocio.">
                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    <label className="block max-w-xs">
                      <div className="text-sm font-semibold text-slate-700 mb-1.5">Mes</div>
                      <input
                        type="month"
                        value={reportMonth}
                        onChange={(event) => setReportMonth(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none"
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                    <div className="divide-y divide-slate-200">
                      <div className="flex items-center justify-between px-4 py-4">
                        <div className="font-semibold text-slate-800">Ventas netas</div>
                        <div className="font-bold text-slate-900">{formatCOP(monthlyStatementSales)}</div>
                      </div>
                      <div className="flex items-center justify-between px-4 py-4">
                        <div className="font-semibold text-slate-800">Costo de ventas</div>
                        <div className="font-bold text-slate-900">{formatCOP(monthlyStatementCostOfSales)}</div>
                      </div>
                      <div className="flex items-center justify-between px-4 py-4 bg-slate-50">
                        <div className="font-semibold text-slate-900">Utilidad bruta</div>
                        <div className="font-bold text-slate-900">{formatCOP(monthlyStatementGrossProfit)}</div>
                      </div>
                      <div className="flex items-center justify-between px-4 py-4">
                        <div className="font-semibold text-slate-800">Gastos operativos</div>
                        <div className="font-bold text-slate-900">{formatCOP(monthlyStatementOperatingExpenses)}</div>
                      </div>
                      <div className="flex items-center justify-between px-4 py-4 bg-slate-100">
                        <div className="font-semibold text-slate-900">Utilidad neta del mes</div>
                        <div className="font-bold text-slate-900">{formatCOP(monthlyStatementNetProfit)}</div>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white px-3 py-3 grid grid-cols-8 gap-2">
            {(['Inicio', 'Inventario', 'Ventas', 'Compras', 'Gastos', 'Caja', 'Reporte', 'Resultados'] as TabKey[]).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`rounded-xl py-2.5 text-sm font-semibold ${tab === item ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
