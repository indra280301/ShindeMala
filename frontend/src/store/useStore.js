import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            theme: 'light',
            cart: [],
            cartLogs: [],
            draftCarts: {},
            draftLogs: {},
            selectedTable: null,
            refreshTrigger: 0,

            setAuth: (user, token) => set({ user, token }),
            triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
            logout: () => set((state) => ({ user: null, token: null, cart: [], cartLogs: [], selectedTable: null })),

            toggleTheme: () => set((state) => {
                const newTheme = state.theme === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                return { theme: newTheme };
            }),
            setTheme: (theme) => set(() => {
                document.documentElement.setAttribute('data-theme', theme);
                return { theme };
            }),

            setSelectedTable: (table) => set((state) => {
                if (state.selectedTable === table) return state; // No change

                const currentKey = state.selectedTable ? `table_${state.selectedTable.table_id}` : 'takeaway';
                const nextKey = table ? `table_${table.table_id}` : 'takeaway';

                const newDraftCarts = { ...state.draftCarts, [currentKey]: state.cart };
                const newDraftLogs = { ...state.draftLogs, [currentKey]: state.cartLogs };

                return {
                    selectedTable: table,
                    draftCarts: newDraftCarts,
                    draftLogs: newDraftLogs,
                    cart: newDraftCarts[nextKey] || [],
                    cartLogs: newDraftLogs[nextKey] || []
                };
            }),

            addToCart: (item) => set((state) => {
                const existing = state.cart.find((i) => i.item_id === item.item_id);
                const log = { id: Date.now(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), msg: `+ 1x ${item.name}`, type: 'add' };

                let newCart;
                if (existing) {
                    newCart = state.cart.map((i) =>
                        i.item_id === item.item_id ? { ...i, quantity: i.quantity + 1 } : i
                    );
                } else {
                    newCart = [...state.cart, { ...item, quantity: 1 }];
                }

                const newCartLogs = [log, ...state.cartLogs];
                const currentKey = state.selectedTable ? `table_${state.selectedTable.table_id}` : 'takeaway';

                return {
                    cart: newCart,
                    cartLogs: newCartLogs,
                    draftCarts: { ...state.draftCarts, [currentKey]: newCart },
                    draftLogs: { ...state.draftLogs, [currentKey]: newCartLogs }
                };
            }),

            removeFromCart: (itemId, completely = false) => set((state) => {
                const existing = state.cart.find((i) => i.item_id === itemId);
                if (!existing) return state;

                const log = { id: Date.now(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), msg: completely ? `- Removed All ${existing.name}` : `- 1x ${existing.name}`, type: 'remove' };

                let newCart;
                if (existing.quantity > 1 && !completely) {
                    newCart = state.cart.map((i) =>
                        i.item_id === itemId ? { ...i, quantity: i.quantity - 1 } : i
                    );
                } else {
                    newCart = state.cart.filter((i) => i.item_id !== itemId);
                }

                const newCartLogs = [log, ...state.cartLogs];
                const currentKey = state.selectedTable ? `table_${state.selectedTable.table_id}` : 'takeaway';

                return {
                    cart: newCart,
                    cartLogs: newCartLogs,
                    draftCarts: { ...state.draftCarts, [currentKey]: newCart },
                    draftLogs: { ...state.draftLogs, [currentKey]: newCartLogs }
                };
            }),

            clearCart: () => set((state) => {
                const currentKey = state.selectedTable ? `table_${state.selectedTable.table_id}` : 'takeaway';
                const newDraftCarts = { ...state.draftCarts };
                const newDraftLogs = { ...state.draftLogs };
                delete newDraftCarts[currentKey];
                delete newDraftLogs[currentKey];

                return {
                    cart: [],
                    cartLogs: [],
                    draftCarts: newDraftCarts,
                    draftLogs: newDraftLogs
                };
            }),

            getTotals: (discountRate = 0, serviceChargeRate = 0) => {
                const state = get();

                // Track separately based on tax type (VAT = Liquor, GST = Food/Beverage)
                let foodSubtotal = 0;
                let liquorSubtotal = 0;

                state.cart.forEach((item) => {
                    const lineAmount = parseFloat(item.price) * item.quantity;
                    if (parseFloat(item.vat_rate) > 0) {
                        liquorSubtotal += lineAmount;
                    } else {
                        foodSubtotal += lineAmount;
                    }
                });

                const subtotal = foodSubtotal + liquorSubtotal;

                // 1. Discount is applied to subtotals
                const foodDiscount = foodSubtotal * (discountRate / 100);
                const liquorDiscount = liquorSubtotal * (discountRate / 100);
                const totalDiscount = foodDiscount + liquorDiscount;

                const discountedFood = foodSubtotal - foodDiscount;
                const discountedLiquor = liquorSubtotal - liquorDiscount;

                // 2. Service Charge is applied on discounted amount
                const foodSC = discountedFood * (serviceChargeRate / 100);
                const liquorSC = discountedLiquor * (serviceChargeRate / 100);
                const totalSC = foodSC + liquorSC;

                const taxableFood = discountedFood + foodSC;
                const taxableLiquor = discountedLiquor + liquorSC;

                // 3. Taxes are applied on the taxable amount (Discounted + Service Charge)
                let cgst_total = 0;
                let sgst_total = 0;
                let vat_total = 0;

                state.cart.forEach((item) => {
                    const lineAmount = parseFloat(item.price) * item.quantity;
                    const itemShareOfCategory = parseFloat(item.vat_rate) > 0
                        ? (lineAmount / liquorSubtotal) || 0
                        : (lineAmount / foodSubtotal) || 0;

                    const itemTaxable = parseFloat(item.vat_rate) > 0
                        ? taxableLiquor * itemShareOfCategory
                        : taxableFood * itemShareOfCategory;

                    if (item.cgst_rate) cgst_total += itemTaxable * (parseFloat(item.cgst_rate) / 100);
                    if (item.sgst_rate) sgst_total += itemTaxable * (parseFloat(item.sgst_rate) / 100);
                    if (item.vat_rate) vat_total += itemTaxable * (parseFloat(item.vat_rate) / 100);
                });

                const grand_total = taxableFood + taxableLiquor + cgst_total + sgst_total + vat_total;

                return {
                    subtotal,
                    foodSubtotal,
                    liquorSubtotal,
                    discountAmount: totalDiscount,
                    serviceChargeAmount: totalSC,
                    taxableFood,
                    taxableLiquor,
                    cgst_total,
                    sgst_total,
                    vat_total,
                    grand_total
                };
            }
        }),
        {
            name: 'pos-storage-v2', // Changed key to force clear old zombie cache once
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                theme: state.theme,
                cart: state.cart,
                cartLogs: state.cartLogs,
                draftCarts: state.draftCarts,
                draftLogs: state.draftLogs,
                selectedTable: state.selectedTable
            })
        }
    )
);
