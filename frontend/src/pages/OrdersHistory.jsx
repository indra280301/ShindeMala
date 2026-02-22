import React, { useState, useEffect } from 'react';
import { History, Calendar, User, Printer, CheckCircle, Search } from 'lucide-react';
import api from '../api/axios';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';

const OrdersHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrderData, setSelectedOrderData] = useState(null);
    const [showOrderModal, setShowOrderModal] = useState(false);

    // Gets exact local time string for datetime-local input
    const getLocalDatetimeStr = (d) => {
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    };

    const getDefaultStartDate = () => {
        const _d = new Date();
        if (_d.getHours() < 10) _d.setDate(_d.getDate() - 1);
        _d.setHours(10, 0, 0, 0);
        return getLocalDatetimeStr(_d);
    };

    const getDefaultEndDate = () => {
        const _d = new Date();
        if (_d.getHours() < 10) _d.setDate(_d.getDate() - 1);
        _d.setDate(_d.getDate() + 1);
        _d.setHours(10, 0, 0, 0);
        return getLocalDatetimeStr(_d);
    };

    const formatDisplayDate = (rawDate) => {
        if (!rawDate) return 'Invalid Date';
        try {
            const d = new Date(rawDate);
            if (isNaN(d.getTime())) return 'Invalid Date';
            return d.toLocaleString();
        } catch (err) {
            return 'Invalid Date';
        }
    };

    const [activeTab, setActiveTab] = useState('dine_in');
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState(getDefaultStartDate());
    const [endDate, setEndDate] = useState(getDefaultEndDate());

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const { data } = await api.get('/orders/history');
            setOrders(data);
        } catch (error) {
            console.error('Failed to fetch orders history', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewOrder = async (orderId) => {
        try {
            const res = await api.get(`/orders/${orderId}`);
            setSelectedOrderData(res.data);
            setShowOrderModal(true);
        } catch (err) {
            console.error('Failed to fetch order details', err);
            alert('Failed to load order.');
        }
    };

    const printBill = () => {
        if (!selectedOrderData) return;

        const totals = {
            subtotal: parseFloat(selectedOrderData.subtotal),
            cgst_total: parseFloat(selectedOrderData.cgst_total),
            sgst_total: parseFloat(selectedOrderData.sgst_total),
            vat_total: parseFloat(selectedOrderData.vat_total),
            grand_total: parseFloat(selectedOrderData.grand_total)
        };
        const invoiceHTML = `
            <html>
            <head>
                <style>
                    body { font-family: monospace; width: 300px; margin: 0 auto; color: #000; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .header h2 { margin: 0; font-size: 18px; }
                    .header p { margin: 2px 0; font-size: 12px; }
                    .divider { border-top: 1px dashed #000; margin: 10px 0; }
                    .flex-row { display: flex; justify-content: space-between; font-size: 12px; margin: 4px 0; }
                    .table-row { display: flex; font-size: 12px; margin: 4px 0; }
                    .col-desc { flex: 1; text-align: left; }
                    .col-qty { width: 30px; text-align: right; }
                    .col-amt { width: 60px; text-align: right; }
                    .bold { font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>SHINDE MALA</h2>
                    <p>Opposite Vivanta Hotel</p>
                    <p>Hinjewadi-Wakad Road, Pune 411057</p>
                    <p>INVOICE REPRINT</p>
                </div>
                <div class="flex-row">
                    <span>No. ${selectedOrderData.order_id}</span>
                    <span>Dt: ${formatDisplayDate((selectedOrderData.closed_at || selectedOrderData.created_at))}</span>
                </div>
                <div class="flex-row">
                    <span>Tb: ${selectedOrderData.table_number || 'Takeaway'}</span>
                    <span>Op: ${selectedOrderData.waiter_name || 'Staff'}</span>
                </div>
                <div class="divider"></div>
                <div class="table-row bold">
                    <span class="col-desc">Description</span>
                    <span class="col-qty">Qty</span>
                    <span class="col-amt">Amount</span>
                </div>
                <div class="divider"></div>
                ${selectedOrderData.items.map(item => `
                    <div class="table-row">
                        <span class="col-desc">${item.name}</span>
                        <span class="col-qty">${item.quantity}</span>
                        <span class="col-amt">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
                <div class="divider"></div>
                
                ${totals.vat_total > 0 ? `
                    <div class="flex-row"><span>10% VAT:</span><span>${totals.vat_total.toFixed(2)}</span></div>
                ` : ''}
                
                ${totals.sgst_total > 0 ? `<div class="flex-row"><span>2.5% SGST:</span><span>${totals.sgst_total.toFixed(2)}</span></div>` : ''}
                ${totals.cgst_total > 0 ? `<div class="flex-row"><span>2.5% CGST:</span><span>${totals.cgst_total.toFixed(2)}</span></div>` : ''}
                <div class="divider"></div>
                
                <div class="flex-row bold"><span>Bill Total:</span><span>${totals.subtotal.toFixed(2)}</span></div>
                <div class="divider"></div>
                <div class="flex-row bold" style="font-size: 16px;"><span>GRAND TOTAL:</span><span>${totals.grand_total.toFixed(2)}</span></div>
                <div class="divider"></div>
                <div class="header" style="margin-top: 20px;">
                    <p>GST NO - 27ABEFRO958F1Z4</p>
                    <p>Thank You !!</p>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '', 'height=600,width=400');
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(async () => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    if (loading) return <div style={{ padding: '40px' }}>Loading Completed Orders...</div>;

    const filteredOrders = orders.filter(o => {
        const matchesTab = activeTab === 'dine_in' ? o.table_number : !o.table_number;
        const searchVal = searchQuery.toLowerCase();
        const matchesSearch = o.order_id.toString().includes(searchVal) || (o.table_number && o.table_number.toLowerCase().includes(searchVal));

        // Filter by Date Range
        const rawDateStr = o.closed_at || o.created_at;
        const orderDateObj = new Date(rawDateStr);
        const matchesDate = orderDateObj.getTime() >= new Date(startDate).getTime() && orderDateObj.getTime() <= new Date(endDate).getTime();

        return matchesTab && matchesSearch && matchesDate;
    });

    const handleMarkDelivered = async (orderId, e) => {
        e.stopPropagation();
        try {
            await api.put(`/orders/${orderId}/status`, { status: 'completed' });
            fetchHistory();
        } catch (err) {
            console.error('Failed to mark delivered', err);
            alert('Error updating order status');
        }
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div>
                    <h1 style={styles.pageTitle}>Orders History</h1>
                    <p style={styles.pageSubtitle}>Log of all successful and completed orders</p>
                </div>
                <div style={styles.stats}>
                    <div style={styles.statCard}>
                        <h4 style={styles.statLabel}>Completed Orders</h4>
                        <p style={styles.statValue}>{orders.length}</p>
                    </div>
                </div>
            </header>

            <div className="orders-filters-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={styles.tabsContainer}>
                    <button
                        style={{ ...styles.tabBtn, ...(activeTab === 'dine_in' ? styles.activeTabBtn : {}) }}
                        onClick={() => setActiveTab('dine_in')}
                    >
                        Dine-In Orders
                    </button>
                    <button
                        style={{ ...styles.tabBtn, ...(activeTab === 'takeaway' ? styles.activeTabBtn : {}) }}
                        onClick={() => setActiveTab('takeaway')}
                    >
                        Takeaway & Delivery
                    </button>
                </div>
                <div className="orders-date-search" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 16px', color: 'var(--text-primary)', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>From</span>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Calendar size={14} color="var(--gold-accent)" style={{ marginRight: '6px' }} />
                                <input
                                    type="datetime-local"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none', fontSize: '12px', cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                        <div style={{ width: '1px', height: '100%', backgroundColor: 'var(--border-color)' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>To</span>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Calendar size={14} color="var(--gold-accent)" style={{ marginRight: '6px' }} />
                                <input
                                    type="datetime-local"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none', fontSize: '12px', cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="orders-search-box" style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 16px', flex: '1', minWidth: '180px' }}>
                        <Search size={18} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
                        <input
                            type="text"
                            placeholder="Search by Order ID or Table..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '14px' }}
                        />
                    </div>
                </div>
            </div>

            <div style={styles.grid}>
                {filteredOrders.length === 0 ? (
                    <div className="card" style={styles.emptyCard}>
                        <History size={48} color="var(--text-secondary)" style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <h3>No Completed Orders</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>No successful orders match your criteria.</p>
                    </div>
                ) : (
                    filteredOrders.map((order, i) => (
                        <motion.div
                            key={order.order_id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="card"
                            style={styles.logCard}
                            onClick={() => handleViewOrder(order.order_id)}
                        >
                            <div style={styles.cardHeader}>
                                <div>
                                    <h3 style={styles.tableRef}>Order #{order.order_id} {order.table_number ? `- Tb ${order.table_number}` : '- Takeaway'}</h3>
                                    <div style={styles.metaRow}>
                                        <Calendar size={12} />
                                        <span>{formatDisplayDate(order.closed_at || order.created_at)}</span>
                                    </div>
                                    <div style={styles.metaRow}>
                                        <User size={12} />
                                        <span>Served By: {order.waiter_name || 'Staff'}</span>
                                    </div>
                                </div>
                                <div style={{ ...styles.badge, backgroundColor: order.order_status === 'processing' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: order.order_status === 'processing' ? 'var(--warning)' : 'var(--success)' }}>
                                    <CheckCircle size={14} style={{ marginRight: '4px' }} />
                                    {order.order_status === 'processing' ? 'Processing' : 'Completed'}
                                </div>
                            </div>

                            <div style={styles.divider} />

                            <div style={styles.totalSection}>
                                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Grand Total:</span>
                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--success)' }}>₹{parseFloat(order.grand_total).toFixed(2)}</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                                <div style={styles.printAction}>
                                    <span>Click to view & reprint</span>
                                </div>
                                {order.order_status === 'processing' && (
                                    <button
                                        className="gold-btn"
                                        style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '4px', fontWeight: 'bold' }}
                                        onClick={(e) => handleMarkDelivered(order.order_id, e)}
                                    >
                                        Mark Delivered
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Modal for Order Details / Reprint */}
            {showOrderModal && selectedOrderData && (
                <div style={styles.modalOverlay}>
                    <div className="card" style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h2>Order #{selectedOrderData.order_id} Details</h2>
                            <button onClick={() => setShowOrderModal(false)} style={styles.closeBtn}>×</button>
                        </div>

                        <div style={styles.orderSummary}>
                            <p><strong>Table / Type:</strong> {selectedOrderData.table_number ? `Tb ${selectedOrderData.table_number}` : 'Takeaway'}</p>
                            <p><strong>Total Items:</strong> {selectedOrderData.items.length}</p>
                            <p><strong>Subtotal:</strong> ₹{parseFloat(selectedOrderData.subtotal).toFixed(2)}</p>
                            <p><strong>Taxes:</strong> ₹{(parseFloat(selectedOrderData.cgst_total) + parseFloat(selectedOrderData.sgst_total) + parseFloat(selectedOrderData.vat_total)).toFixed(2)}</p>
                            <h3 style={{ marginTop: '8px', color: 'var(--gold-accent)' }}>Grand Total: ₹{parseFloat(selectedOrderData.grand_total).toFixed(2)}</h3>
                        </div>

                        <div style={styles.itemsListPreview}>
                            {selectedOrderData.items.map((item, idx) => (
                                <div key={idx} style={styles.itemPreviewRow}>
                                    <span>{item.quantity}x {item.name}</span>
                                    <span style={{ color: 'var(--text-secondary)' }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div style={styles.modalActions}>
                            <button
                                className="gold-btn"
                                style={{ padding: '12px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                onClick={printBill}
                            >
                                <Printer size={18} />
                                Reprint Bill
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '32px'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    pageTitle: {
        fontSize: '28px',
        color: 'var(--text-primary)',
        fontWeight: '700',
        marginBottom: '8px'
    },
    pageSubtitle: {
        color: 'var(--text-secondary)',
        fontSize: '15px'
    },
    stats: {
        display: 'flex',
        gap: '16px'
    },
    statCard: {
        backgroundColor: 'var(--bg-card)',
        padding: '16px 24px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        borderLeft: '4px solid var(--success)'
    },
    statLabel: {
        fontSize: '12px',
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    statValue: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: 'var(--text-primary)',
        marginTop: '4px'
    },
    tabsContainer: {
        display: 'flex',
        gap: '12px',
        marginBottom: '4px'
    },
    tabBtn: {
        padding: '10px 20px',
        borderRadius: '8px',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-color)',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px',
        transition: '0.2s'
    },
    activeTabBtn: {
        backgroundColor: 'var(--gold-accent)',
        color: '#000',
        borderColor: 'var(--gold-accent)'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '24px'
    },
    emptyCard: {
        gridColumn: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
        background: 'var(--bg-card)'
    },
    logCard: {
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-card)',
        borderLeft: '4px solid var(--success)',
        padding: '0',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        ':hover': { transform: 'translateY(-4px)' }
    },
    cardHeader: {
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    tableRef: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: 'var(--text-primary)',
        margin: '0 0 12px 0'
    },
    metaRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        marginBottom: '4px'
    },
    badge: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        color: 'var(--success)',
        padding: '6px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
    divider: {
        height: '1px',
        backgroundColor: 'var(--border-color)',
        width: '100%'
    },
    totalSection: {
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    printAction: {
        padding: '12px 20px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottomLeftRadius: 'var(--radius-lg)',
        borderBottomRightRadius: 'var(--radius-lg)',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--gold-accent)',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100
    },
    modalContent: {
        backgroundColor: 'var(--bg-card)',
        padding: '24px',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '400px'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: '24px',
        color: 'var(--text-secondary)',
        cursor: 'pointer'
    },
    orderSummary: {
        backgroundColor: 'var(--bg-secondary)',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '14px'
    },
    itemsListPreview: {
        maxHeight: '150px',
        overflowY: 'auto',
        marginBottom: '20px',
        paddingRight: '8px'
    },
    itemPreviewRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '13px',
        padding: '6px 0',
        borderBottom: '1px solid var(--border-color)'
    },
    modalActions: {
        display: 'flex',
        gap: '12px'
    }
};

export default OrdersHistory;
