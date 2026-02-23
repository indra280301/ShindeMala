import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, Trash2, CheckCircle2, IndianRupee, ShoppingCart, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useStore } from '../store/useStore';

const POS = () => {
    const navigate = useNavigate();
    const clearCartLogs = () => useStore.setState({ cartLogs: [] });

    const refreshTrigger = useStore(state => state.refreshTrigger);

    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [discountRate, setDiscountRate] = useState(0);
    const [serviceChargeRate, setServiceChargeRate] = useState(0);
    const [isPrinting, setIsPrinting] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [activeOrder, setActiveOrder] = useState(null);
    const [dbLogs, setDbLogs] = useState([]);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

    const user = useStore((state) => state.user);
    const cart = useStore((state) => state.cart);
    const cartLogs = useStore((state) => state.cartLogs) || [];
    const addToCart = useStore((state) => state.addToCart);
    const removeFromCart = useStore((state) => state.removeFromCart);
    const clearCart = useStore((state) => state.clearCart);
    const getTotals = useStore((state) => state.getTotals);
    const selectedTable = useStore((state) => state.selectedTable);
    const setSelectedTable = useStore((state) => state.setSelectedTable);

    const displayCart = activeOrder ? activeOrder.items : cart;
    const displayLogs = activeOrder ? dbLogs : cartLogs;

    const fetchActiveOrder = async () => {
        try {
            let data = null;
            if (selectedTable) {
                const res = await api.get(`/orders/active/table/${selectedTable.table_id}?t=${new Date().getTime()}`);
                data = res.data;
            } else {
                // Fetch active takeaway order
                const res = await api.get(`/orders/active/takeaway?t=${new Date().getTime()}`);
                data = res.data;
            }
            setActiveOrder(data || null);

            if (data?.order_id) {
                fetchOrderLogs(data.order_id);
            } else {
                setDbLogs([]);
            }
        } catch (err) {
            console.error("Failed to load active order", err);
        }
    };

    const fetchOrderLogs = async (orderId) => {
        try {
            const { data } = await api.get(`/orders/${orderId}/logs`);

            // Map DB logs to the format the UI expects: { id, time, msg, type }
            const mappedLogs = data.map(log => ({
                id: log.log_id,
                time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                msg: `${log.user_name} (${log.role}): ${log.action_text}`,
                type: log.action_text.startsWith('+') ? 'add' : 'remove',
                is_db_log: true
            }));

            setDbLogs(mappedLogs);
        } catch (err) {
            console.error("Failed to fetch order logs", err);
        }
    };

    useEffect(() => {
        fetchMenuData();
        fetchActiveOrder();
    }, [refreshTrigger, selectedTable]);

    const fetchMenuData = async () => {
        try {
            setLoading(true);
            const [catRes, itemsRes] = await Promise.all([
                api.get('/menu/categories'),
                api.get('/menu/items')
            ]);
            setCategories(catRes.data);
            setMenuItems(itemsRes.data);
        } catch (err) {
            console.error('Failed to load menu data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenuData();
    }, []);

    const baseTotals = activeOrder ? {
        subtotal: parseFloat(activeOrder.subtotal || 0),
        cgst_total: parseFloat(activeOrder.cgst_total || 0),
        sgst_total: parseFloat(activeOrder.sgst_total || 0),
        vat_total: parseFloat(activeOrder.vat_total || 0),
        grand_total: parseFloat(activeOrder.grand_total || 0)
    } : getTotals(discountRate, serviceChargeRate);
    const totals = baseTotals;

    const handleAddToCart = async (item) => {
        // Always save to DB (both dine-in and takeaway)
        try {
            const price = parseFloat(item.price) || 0;
            const cgst = parseFloat(item.cgst_rate) || 0;
            const sgst = parseFloat(item.sgst_rate) || 0;
            const vat = parseFloat(item.vat_rate) || 0;

            const orderData = {
                table_id: selectedTable ? selectedTable.table_id : null,
                order_type: selectedTable ? 'dine_in' : 'takeaway',
                items: [{
                    item_id: item.item_id,
                    quantity: 1,
                    price: price,
                    cgst_amount: price * (cgst / 100),
                    sgst_amount: price * (sgst / 100),
                    vat_amount: price * (vat / 100),
                    line_total: price * (1 + (cgst + sgst + vat) / 100)
                }]
            };
            await api.post('/orders', orderData);

            // Refresh Order and Logs
            fetchActiveOrder();
            if (activeOrder) fetchOrderLogs(activeOrder.order_id);

        } catch (err) {
            console.error("Failed to add item", err);
        }
    };

    const handleRemoveFromCart = async (itemId) => {
        if (activeOrder) {
            try {
                await api.delete(`/orders/${activeOrder.order_id}/items/${itemId}`);
                fetchActiveOrder();
                fetchOrderLogs(activeOrder.order_id);
            } catch (err) {
                console.error("Failed to remove item", err);
            }
        } else {
            removeFromCart(itemId);
        }
    };

    const handleClearCartClick = () => {
        if (activeOrder) {
            setShowClearConfirm(true);
        } else if (cart.length > 0) {
            setShowClearConfirm(true);
        }
    };

    const executeClearCart = async () => {
        if (activeOrder) {
            try {
                await api.put(`/orders/${activeOrder.order_id}/status`, { status: 'cancelled' });
                if (selectedTable) {
                    await api.put(`/tables/${selectedTable.table_id}/status`, { status: 'available' });
                }
                // Log cancellation for BOTH dine-in and takeaway
                await api.post('/orders/cancel', {
                    table_number: selectedTable ? selectedTable.table_number : 'Takeaway',
                    items: activeOrder.items,
                    total_amount: activeOrder.grand_total
                });
            } catch (err) {
                console.error("Failed to cancel order", err);
            }
        } else {
            clearCart();
        }
        setSelectedTable(null);
        setActiveOrder(null);
        setShowClearConfirm(false);
        fetchActiveOrder();
    };

    const printBill = (fullOrderData) => {
        const orderTotals = {
            subtotal: parseFloat(fullOrderData.subtotal || 0),
            cgst_total: parseFloat(fullOrderData.cgst_total || 0),
            sgst_total: parseFloat(fullOrderData.sgst_total || 0),
            vat_total: parseFloat(fullOrderData.vat_total || 0),
            grand_total: parseFloat(fullOrderData.grand_total || 0)
        };

        // Create a receipt div that we inject into the page
        const receiptDiv = document.createElement('div');
        receiptDiv.id = 'print-receipt';
        receiptDiv.innerHTML = `
            <style>
                @media print {
                    body * { visibility: hidden !important; }
                    #print-receipt, #print-receipt * { visibility: visible !important; }
                    #print-receipt {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        z-index: 99999 !important;
                        background: white !important;
                    }
                }
                #print-receipt {
                    font-family: monospace;
                    width: 300px;
                    margin: 0 auto;
                    color: #000;
                    position: fixed;
                    top: -9999px;
                    left: -9999px;
                }
                #print-receipt .pr-header { text-align: center; margin-bottom: 20px; }
                #print-receipt .pr-header h2 { margin: 0; font-size: 18px; }
                #print-receipt .pr-header p { margin: 2px 0; font-size: 12px; }
                #print-receipt .pr-divider { border-top: 1px dashed #000; margin: 10px 0; }
                #print-receipt .pr-flex { display: flex; justify-content: space-between; font-size: 12px; margin: 4px 0; }
                #print-receipt .pr-row { display: flex; font-size: 12px; margin: 4px 0; }
                #print-receipt .pr-desc { flex: 1; text-align: left; }
                #print-receipt .pr-qty { width: 30px; text-align: right; }
                #print-receipt .pr-amt { width: 60px; text-align: right; }
                #print-receipt .pr-bold { font-weight: bold; }
            </style>
            <div class="pr-header">
                <h2>SHINDE MALA</h2>
                <p>Opposite Vivanta Hotel</p>
                <p>Hinjewadi-Wakad Road, Pune 411057</p>
                <p>INVOICE</p>
            </div>
            <div class="pr-flex">
                <span>No. ${fullOrderData.order_id}</span>
                <span>Dt: ${new Date().toLocaleString()}</span>
            </div>
            <div class="pr-flex">
                <span>Tb: ${fullOrderData.table_number || 'Parcel / Takeaway'}</span>
            </div>
            <div class="pr-divider"></div>
            <div class="pr-row pr-bold">
                <span class="pr-desc">Description</span>
                <span class="pr-qty">Qty</span>
                <span class="pr-amt">Amount</span>
            </div>
            <div class="pr-divider"></div>
            ${fullOrderData.items.map(item => `
                <div class="pr-row">
                    <span class="pr-desc">${item.name}</span>
                    <span class="pr-qty">${item.quantity}</span>
                    <span class="pr-amt">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                </div>
            `).join('')}
            <div class="pr-divider"></div>
            ${orderTotals.vat_total > 0 ? `<div class="pr-flex"><span>10% VAT:</span><span>${orderTotals.vat_total.toFixed(2)}</span></div>` : ''}
            ${orderTotals.sgst_total > 0 ? `<div class="pr-flex"><span>2.5% SGST:</span><span>${orderTotals.sgst_total.toFixed(2)}</span></div>` : ''}
            ${orderTotals.cgst_total > 0 ? `<div class="pr-flex"><span>2.5% CGST:</span><span>${orderTotals.cgst_total.toFixed(2)}</span></div>` : ''}
            <div class="pr-divider"></div>
            <div class="pr-flex pr-bold"><span>Bill Total:</span><span>${orderTotals.subtotal.toFixed(2)}</span></div>
            <div class="pr-divider"></div>
            <div class="pr-flex pr-bold" style="font-size: 16px;"><span>GRAND TOTAL:</span><span>${orderTotals.grand_total.toFixed(2)}</span></div>
            <div class="pr-divider"></div>
            <div class="pr-header" style="margin-top: 20px;">
                <p>GST NO - 27ABEFRO958F1Z4</p>
                <p>Thank You !!</p>
            </div>
        `;

        // Remove any existing receipt div
        const existing = document.getElementById('print-receipt');
        if (existing) existing.remove();

        document.body.appendChild(receiptDiv);

        // Use window.print() which works on all browsers including mobile Safari
        setTimeout(() => {
            window.print();
            // Clean up after print dialog closes
            setTimeout(() => {
                const el = document.getElementById('print-receipt');
                if (el) el.remove();
            }, 1000);
        }, 300);
    };

    const initiateSettle = () => {
        if (displayCart.length === 0) return;
        setShowSettleModal(true);
    };


    const handleCreateOrder = async () => {
        if (displayCart.length === 0 || !activeOrder) return;

        setIsPrinting(true);
        setShowSettleModal(false);
        try {
            // Fetch final order data for receipt
            const finalRes = await api.get(`/orders/${activeOrder.order_id}`);

            // SETTLE — Takeaway goes to 'processing' (awaiting delivery), Dine-in goes to 'completed'
            const settleStatus = selectedTable ? 'completed' : 'processing';
            await api.put(`/orders/${activeOrder.order_id}/status`, { status: settleStatus });
            if (selectedTable) {
                await api.put(`/tables/${selectedTable.table_id}/status`, { status: 'available' });
            }

            // Try to print (non-blocking, won't stop settlement)
            try { printBill(finalRes.data); } catch (e) { console.warn('Print failed:', e); }

            clearCart();
            setSelectedTable(null);
            setActiveOrder(null);
            setIsMobileCartOpen(false);
            if (selectedTable) {
                navigate('/tables');
            } else {
                // Stay on POS for takeaway, refresh to show empty state
                fetchActiveOrder();
            }
        } catch (err) {
            console.error('Order creation failed', err);
            alert('Failed to process order');
        } finally {
            setIsPrinting(false);
        }
    };

    const filteredItems = menuItems.filter(item => {
        const matchesCategory = activeCategory === 'All' || item.category_id === activeCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (user?.role === 'waiter' && !selectedTable) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px', backgroundColor: 'var(--bg-primary)' }}>
                <h2 style={{ color: 'var(--gold-accent)' }}>Takeaway Mode Restricted</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Please select a table from the Table Layout to take orders.</p>
                <button
                    className="premium-btn"
                    style={{ padding: '12px 24px', fontSize: '14px', maxWidth: '200px' }}
                    onClick={() => navigate('/tables')}
                >
                    Go To Tables
                </button>
            </div>
        );
    }

    if (loading) return <div style={{ padding: '40px' }}>Loading Terminal...</div>;

    return (
        <div style={styles.container} className="pos-container">
            {/* Mobile Cart Overlay */}
            {isMobileCartOpen && (
                <div
                    className="mobile-overlay"
                    onClick={() => setIsMobileCartOpen(false)}
                ></div>
            )}

            {/* Left Menu Section */}
            <div style={styles.menuSection}>
                <div style={styles.topBar}>
                    <div style={styles.searchBox}>
                        <Search size={20} color="var(--text-secondary)" />
                        <input
                            type="text"
                            placeholder="Search items..."
                            style={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Category Pills */}
                <div style={styles.categoryScroll}>
                    <button
                        style={{
                            ...styles.categoryPill,
                            ...(activeCategory === 'All' ? styles.categoryActive : {})
                        }}
                        onClick={() => setActiveCategory('All')}
                    >
                        All Items
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.category_id}
                            style={{
                                ...styles.categoryPill,
                                ...(activeCategory === cat.category_id ? styles.categoryActive : {})
                            }}
                            onClick={() => setActiveCategory(cat.category_id)}
                        >
                            {cat.category_name}
                        </button>
                    ))}
                </div>

                {/* Menu Grid */}
                <div style={styles.menuGrid} className="pos-item-grid pos-menu-grid">
                    {filteredItems.map((item, index) => (
                        <motion.div
                            key={item.item_id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            style={{
                                ...styles.menuCard,
                                opacity: item.is_available ? 1 : 0.4,
                                cursor: item.is_available ? 'pointer' : 'not-allowed',
                                filter: item.is_available ? 'none' : 'grayscale(100%)'
                            }}
                            className="card"
                            onClick={() => item.is_available && handleAddToCart(item)}
                        >
                            <div style={styles.cardInfo}>
                                <div style={styles.itemHeader}>
                                    <h4 style={styles.itemName}>{item.name}</h4>
                                    <span style={item.dietary_flag === 'veg' ? styles.vegDot : styles.nonVegDot} />
                                </div>
                                <p style={styles.itemCategory}>{item.category_name} • {item.preparation_time_minutes} min</p>
                                <div style={styles.itemPrice}>
                                    <IndianRupee size={14} />
                                    <span>{parseFloat(item.price).toFixed(2)}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Right Cart Section */}
            <div style={{ ...styles.cartSection, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }} className={`card pos-cart-section pos-cart-panel ${isMobileCartOpen ? 'mobile-cart-open' : ''}`}>
                <div style={styles.cartHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isMobileCartOpen && (
                            <button
                                onClick={() => setIsMobileCartOpen(false)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={24} />
                            </button>
                        )}
                        <div>
                            <h3>{selectedTable ? `Table ${selectedTable.table_number}` : 'Takeaway / Parcel'}</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedTable ? 'Dine-In Menu' : 'New Order'}</p>
                        </div>
                    </div>
                    {displayCart.length > 0 && user?.role !== 'waiter' && (
                        <button
                            onClick={handleClearCartClick}
                            title="Cancel Order"
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 'bold' }}
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>

                <div style={styles.cartItems}>
                    <AnimatePresence>
                        {displayCart.map(item => (
                            <motion.div
                                key={item.item_id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                style={styles.cartItem}
                            >
                                <div style={styles.cartItemInfo}>
                                    <h5 style={styles.cartItemName}>{item.name}</h5>
                                    <span style={styles.cartItemPrice}>₹{parseFloat(item.price).toFixed(2)}</span>
                                </div>
                                <div style={styles.quantityControl}>
                                    {user?.role !== 'waiter' && (
                                        <button style={styles.qtyBtn} onClick={() => handleRemoveFromCart(item.item_id)}><Minus size={14} /></button>
                                    )}
                                    <span style={styles.qtyText}>{item.quantity}</span>
                                    <button style={styles.qtyBtn} onClick={() => handleAddToCart(item)}><Plus size={14} /></button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {displayCart.length === 0 && (
                        <div style={styles.emptyCart}>Cart is empty</div>
                    )}
                    <div style={styles.cartTotals}>
                        <div style={{ ...styles.totalRow, ...styles.grandTotal, marginBottom: '16px' }}>
                            <span>Grand Total Payable:</span>
                            <span>₹{(totals.grand_total || 0).toFixed(2)}</span>
                        </div>

                        <button
                            onClick={() => setShowLogs(!showLogs)}
                            style={{ background: 'none', border: 'none', color: 'var(--gold-accent)', cursor: 'pointer', marginBottom: '16px', fontSize: '13px', textDecoration: 'underline', alignSelf: 'flex-start' }}>
                            {showLogs ? 'Hide Activity Logs' : 'View Activity Logs'}
                        </button>

                        {showLogs && (
                            <div style={{ width: '100%', marginBottom: '16px' }}>
                                {displayLogs.length === 0 ? (
                                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>No local activity.</p>
                                    </div>
                                ) : (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        gap: '12px',
                                        overflowX: 'auto',
                                        padding: '12px',
                                        backgroundColor: 'var(--bg-card)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        whiteSpace: 'nowrap',
                                        WebkitOverflowScrolling: 'touch'
                                    }}>
                                        {displayLogs.map(log => (
                                            <div key={log.id} style={{
                                                display: 'inline-flex',
                                                gap: '6px',
                                                fontSize: '11px',
                                                alignItems: 'center',
                                                padding: '6px 12px',
                                                backgroundColor: log.type === 'add' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                                                border: `1px solid ${log.type === 'add' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
                                                borderRadius: '20px'
                                            }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>{log.time}</span>
                                                <span style={{
                                                    color: log.type === 'add' ? 'var(--success)' : 'var(--danger)',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {log.msg}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {!activeOrder && displayLogs.length > 0 && (
                                    <button onClick={clearCartLogs} style={{ width: '100%', marginTop: '8px', padding: '6px', fontSize: '11px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                        Clear Local Logs
                                    </button>
                                )}
                            </div>
                        )}
                        {user?.role !== 'waiter' && (
                            <button
                                className="gold-btn"
                                style={styles.confirmBtn}
                                onClick={initiateSettle}
                                disabled={displayCart.length === 0 || isPrinting}
                            >
                                <CheckCircle2 size={20} />
                                {isPrinting ? 'Processing...' : 'Settle & Print Final Bill'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Settle Modal with Discount & Service Charge */}
            {showSettleModal && (
                <div style={{ ...styles.modalOverlay, zIndex: 2000 }}>
                    <div className="card" style={{ padding: '24px', maxWidth: '400px', backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
                        <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)', textAlign: 'center' }}>Finalize Bill</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                            <div style={styles.rateInputGroup}>
                                <label style={styles.rateLabel}>Discount (%)</label>
                                <input type="number" min="0" max="100" value={discountRate} onChange={(e) => setDiscountRate(Number(e.target.value) || 0)} style={{ ...styles.rateInput, width: '100%', padding: '12px', fontSize: '16px' }} />
                            </div>
                            <div style={styles.rateInputGroup}>
                                <label style={styles.rateLabel}>Service Charge (%) <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>(Optional)</span></label>
                                <input type="number" min="0" max="100" value={serviceChargeRate} onChange={(e) => setServiceChargeRate(Number(e.target.value) || 0)} style={{ ...styles.rateInput, width: '100%', padding: '12px', fontSize: '16px' }} />
                            </div>

                            <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', marginTop: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                                    <span>Subtotal:</span>
                                    <span>₹{totals.subtotal.toFixed(2)}</span>
                                </div>
                                {(totals.cgst_total > 0 || totals.sgst_total > 0 || totals.vat_total > 0) && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                        <span>Total Taxes:</span>
                                        <span>₹{(totals.cgst_total + totals.sgst_total + totals.vat_total).toFixed(2)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                                    <span>Final Grand Total:</span>
                                    <span>₹{totals.grand_total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', flex: 1, fontWeight: 'bold' }}
                                onClick={() => setShowSettleModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                style={{ padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--gold-accent)', color: '#000', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}
                                onClick={() => handleCreateOrder()}
                                disabled={isPrinting}
                            >
                                {isPrinting ? 'Printing...' : 'Print Final Bill'}
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Clear Cart Confirmation Modal */}
            {
                showClearConfirm && (
                    <div style={{ ...styles.modalOverlay, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                        <div className="card" style={{ padding: '24px', maxWidth: '350px', backgroundColor: 'var(--bg-card)', textAlign: 'center', borderRadius: '12px' }}>
                            <h3 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Clear Order?</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px' }}>
                                Are you sure you want to completely discard this draft order? This action cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', flex: 1 }}
                                    onClick={() => setShowClearConfirm(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--danger)', color: '#fff', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}
                                    onClick={executeClearCart}
                                >
                                    Cancel Order
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Mobile Floating Cart Button */}
            <div
                className="pos-mobile-cart-btn"
                onClick={() => setIsMobileCartOpen(true)}
            >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingCart size={24} color="#000" />
                    {displayCart.length > 0 && (
                        <span style={{
                            position: 'absolute', top: '-10px', right: '-10px',
                            background: 'var(--danger)', color: 'white',
                            borderRadius: '50%', padding: '2px 6px',
                            fontSize: '12px', fontWeight: 'bold',
                            border: '2px solid var(--bg-primary)'
                        }}>
                            {displayCart.length}
                        </span>
                    )}
                </div>
            </div>
        </div >
    );
};

const styles = {
    container: {
        display: 'flex',
        gap: '24px',
        height: 'calc(100vh - 120px)'
    },
    menuSection: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        overflow: 'hidden'
    },
    topBar: {
        display: 'flex',
        gap: '16px'
    },
    searchBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: 'var(--bg-card)',
        padding: '12px 20px',
        borderRadius: 'var(--radius-lg)',
        flex: 1,
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)'
    },
    searchInput: {
        border: 'none',
        background: 'transparent',
        color: 'var(--text-primary)',
        fontSize: '16px',
        width: '100%',
        outline: 'none'
    },
    categoryScroll: {
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '8px',
        flexShrink: 0
    },
    categoryPill: {
        padding: '10px 24px',
        borderRadius: '30px',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-color)',
        whiteSpace: 'nowrap',
        fontWeight: '500',
        fontSize: '15px'
    },
    categoryActive: {
        backgroundColor: 'var(--gold-accent)',
        color: '#fff',
        borderColor: 'var(--gold-accent)'
    },
    menuGrid: {
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        alignContent: 'start',
        gap: '20px',
        overflowY: 'auto',
        paddingRight: '8px'
    },
    menuCard: {
        padding: '16px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '130px',
        borderLeft: '4px solid var(--gold-accent)'
    },
    cardInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        height: '100%'
    },
    itemHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline'
    },
    itemName: {
        fontSize: '16px',
        fontWeight: '600',
        color: 'var(--text-primary)'
    },
    vegDot: {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: 'green',
        border: '2px solid white',
        boxShadow: '0 0 0 1px green'
    },
    nonVegDot: {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: 'red',
        border: '2px solid white',
        boxShadow: '0 0 0 1px red'
    },
    itemCategory: {
        fontSize: '13px',
        color: 'var(--text-secondary)'
    },
    itemPrice: {
        marginTop: 'auto',
        fontSize: '18px',
        fontWeight: '700',
        color: 'var(--gold-accent)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    },
    cartSection: {
        width: '380px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
    },
    cartHeader: {
        padding: '20px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    clearBtn: {
        color: 'var(--danger)',
        padding: '8px',
        borderRadius: '8px',
        backgroundColor: 'rgba(211, 47, 47, 0.1)'
    },
    cartItems: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    cartItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '16px',
        borderBottom: '1px dashed var(--border-color)'
    },
    cartItemName: {
        fontSize: '15px',
        fontWeight: '600',
        marginBottom: '4px'
    },
    cartItemPrice: {
        fontSize: '14px',
        color: 'var(--text-secondary)'
    },
    quantityControl: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: 'var(--bg-secondary)',
        padding: '6px',
        borderRadius: '8px'
    },
    qtyBtn: {
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        backgroundColor: 'var(--bg-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-primary)'
    },
    qtyText: {
        fontWeight: '600',
        width: '20px',
        textAlign: 'center'
    },
    emptyCart: {
        textAlign: 'center',
        color: 'var(--text-secondary)',
        marginTop: '40px',
        fontStyle: 'italic'
    },
    cartTotals: {
        padding: '24px',
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        color: 'var(--text-primary)',
        fontWeight: '500'
    },
    totalRowText: {
        display: 'flex',
        justifyContent: 'space-between',
        color: 'var(--text-secondary)',
        fontSize: '14px'
    },
    grandTotal: {
        fontSize: '22px',
        fontWeight: '700',
        marginTop: '8px',
        paddingTop: '16px',
        borderTop: '1px dashed var(--border-color)'
    },
    confirmBtn: {
        marginTop: '16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        fontSize: '16px',
        opacity: 1
    },
    receiptSection: {
        paddingBottom: '8px',
        marginBottom: '8px',
        borderBottom: '1px dashed var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    ratesRow: {
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border-color)'
    },
    rateInputGroup: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    rateLabel: {
        fontSize: '12px',
        color: 'var(--text-secondary)'
    },
    rateInput: {
        padding: '8px',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)',
        width: '100%',
        fontFamily: 'inherit'
    }
};

export default POS;
