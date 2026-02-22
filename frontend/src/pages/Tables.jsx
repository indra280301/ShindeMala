import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock } from 'lucide-react';
import api from '../api/axios';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

const Tables = () => {
    const navigate = useNavigate();
    const refreshTrigger = useStore((state) => state.refreshTrigger);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrderData, setSelectedOrderData] = useState(null);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [printingOption, setPrintingOption] = useState(false);
    const [showPrintConfirm, setShowPrintConfirm] = useState(false);
    const [activeSection, setActiveSection] = useState('AC');

    const setSelectedTable = useStore(state => state.setSelectedTable);
    const draftCarts = useStore(state => state.draftCarts);

    useEffect(() => {
        fetchTables();
        // In a real app, this would use WebSockets for real-time updates
        const interval = setInterval(fetchTables, 10000);
        return () => clearInterval(interval);
    }, [refreshTrigger]);

    const fetchTables = async () => {
        try {
            const { data } = await api.get(`/tables?t=${new Date().getTime()}`);
            setTables(data);
        } catch (error) {
            console.error('Error fetching tables', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTableClick = async (table) => {
        setSelectedTable(table);
        navigate('/orders');
    };
    const handleUpdateTableStatus = async (tableId, newStatus) => {
        try {
            await api.put(`/tables/${tableId}/status`, { status: newStatus });
            fetchTables();
        } catch (err) {
            console.error('Failed to update status', err);
            alert('Error updating table status');
        }
    };

    const handleSettleBill = async () => {
        if (!selectedOrderData) return;
        try {
            await api.put(`/orders/${selectedOrderData.order_id}/status`, { status: 'completed' });
            await api.put(`/tables/${selectedOrderData.table_id}/status`, { status: 'available' });
            // Add API to clear current_order_id on table if needed, handled organically or backend side
            setShowOrderModal(false);
            setSelectedOrderData(null);
            fetchTables();
            alert('Bill settled & Table cleared.');
        } catch (err) {
            console.error('Failed to settle bill', err);
            alert('Error settling bill.');
        }
    };

    const printBill = () => {
        if (!selectedOrderData) return;
        setPrintingOption(true);
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
                    <p>INVOICE</p>
                </div>
                <div class="flex-row">
                    <span>No. ${selectedOrderData.order_id}</span>
                    <span>Dt: ${new Date().toLocaleString()}</span>
                </div>
                <div class="flex-row">
                    <span>Tb: ${selectedOrderData.table_number}</span>
                    <span>Op: ${selectedOrderData.waiter_name}</span>
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
            setPrintingOption(false);

            // Auto Settle & Clear after print
            try {
                await api.put(`/orders/${selectedOrderData.order_id}/status`, { status: 'completed' });
                await api.put(`/tables/${selectedOrderData.table_id}/status`, { status: 'available' });
                setShowPrintConfirm(false);
                setShowOrderModal(false);
                setSelectedOrderData(null);
                fetchTables();
            } catch (err) {
                console.error('Failed to auto settle after print', err);
            }

        }, 250);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'available': return 'var(--success)';
            case 'occupied': return 'var(--danger)';
            case 'reserved': return 'var(--warning)';
            case 'cleaning': return 'var(--text-secondary)';
            case 'draft': return 'var(--danger)'; // Draft is visually same as occupied
            default: return 'var(--text-secondary)';
        }
    };

    if (loading && tables.length === 0) return <div style={{ padding: '40px' }}>Loading Layout...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div>
                    <h1 style={styles.pageTitle}>Table Management</h1>
                    <p style={styles.pageSubtitle}>Real-time floor layout</p>
                </div>

                <div style={styles.legend}>
                    <div style={styles.legendItem}>
                        <div style={{ ...styles.legendColor, backgroundColor: 'var(--success)' }} /> Available
                    </div>
                    <div style={styles.legendItem}>
                        <div style={{ ...styles.legendColor, backgroundColor: 'var(--danger)' }} /> Occupied
                    </div>
                    <div style={styles.legendItem}>
                        <div style={{ ...styles.legendColor, backgroundColor: 'var(--warning)' }} /> Reserved
                    </div>
                </div>
            </header>

            {/* Section Tabs */}
            <div className="tables-section-tabs" style={{ display: 'flex', gap: '10px', padding: '0 24px', marginBottom: '24px' }}>
                {['AC', 'Non-AC', 'Family'].map(sc => (
                    <button
                        key={sc}
                        onClick={() => setActiveSection(sc)}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '24px',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer',
                            border: `1px solid ${activeSection === sc ? 'var(--gold-accent)' : 'var(--border-color)'}`,
                            background: activeSection === sc ? 'var(--gold-accent)' : 'var(--bg-card)',
                            color: activeSection === sc ? '#000' : 'var(--text-primary)',
                            transition: 'all 0.2s',
                            boxShadow: activeSection === sc ? '0 4px 12px rgba(212, 175, 55, 0.2)' : 'none'
                        }}
                    >
                        {sc}
                    </button>
                ))}
            </div>

            <div style={{
                ...styles.grid,
                gridTemplateColumns: 'repeat(12, 80px)',
                gridAutoRows: '80px',
                gap: '12px',
                background: 'var(--bg-card)',
                backgroundImage: 'radial-gradient(var(--border-color) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                margin: '0 8px',
                padding: '16px',
                minHeight: '600px',
                justifyContent: 'start',
                alignContent: 'start',
                overflowX: 'auto',
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)',
                WebkitOverflowScrolling: 'touch'
            }}>
                {tables.filter(t => t.section === activeSection).map((table, index) => {
                    const hasDraft = draftCarts[`table_${table.table_id}`] && draftCarts[`table_${table.table_id}`].length > 0;
                    const displayStatus = hasDraft ? 'draft' : table.status;

                    let shapeStyles = {};
                    if (table.shape === 'circle') shapeStyles = { borderRadius: '50%' };

                    const rowSpan = table.shape === 'vertical' ? 2 : 1;
                    const colSpan = table.shape === 'horizontal' ? 2 : 1;

                    const placementStyles = (table.grid_row !== null && table.grid_col !== null) ? {
                        gridRow: `${Number(table.grid_row) + 1} / span ${rowSpan}`,
                        gridColumn: `${Number(table.grid_col) + 1} / span ${colSpan}`
                    } : {};

                    return (
                        <motion.div
                            key={table.table_id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 0.95 }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                ...placementStyles,
                                ...shapeStyles
                            }}
                            onClick={() => handleTableClick(table)}
                        >
                            <div style={{
                                width: '100%',
                                height: '100%',
                                background: displayStatus === 'available' ? 'var(--bg-primary)' : `${getStatusColor(displayStatus)}15`,
                                border: `2px solid ${getStatusColor(displayStatus)}`,
                                borderRadius: table.shape === 'circle' ? '50%' : '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                                boxShadow: displayStatus !== 'available' ? `0 4px 12px ${getStatusColor(displayStatus)}30` : '0 2px 4px rgba(0,0,0,0.05)',
                                color: getStatusColor(displayStatus),
                                overflow: 'hidden',
                                padding: '4px'
                            }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)', textAlign: 'center', wordBreak: 'break-word', lineHeight: '1.2' }}>{table.table_number}</span>
                                {displayStatus === 'reserved' && <span style={{ fontSize: '9px', marginTop: '2px', textTransform: 'uppercase', fontWeight: 600 }}>Reserved</span>}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>
                                {table.capacity} Pax
                            </span>
                        </motion.div>
                    )
                })}
            </div>

            {/* Modal for Order Details */}
            {showOrderModal && selectedOrderData && (
                <div style={styles.modalOverlay}>
                    <div className="card" style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h2>Table {selectedOrderData.table_number} Order</h2>
                            <button onClick={() => setShowOrderModal(false)} style={styles.closeBtn}>×</button>
                        </div>

                        <div style={styles.orderSummary}>
                            <p><strong>Status:</strong> {selectedOrderData.order_status.toUpperCase()}</p>
                            <p><strong>Subtotal:</strong> ₹{parseFloat(selectedOrderData.subtotal).toFixed(2)}</p>
                            <p><strong>Taxes:</strong> ₹{(parseFloat(selectedOrderData.cgst_total) + parseFloat(selectedOrderData.sgst_total) + parseFloat(selectedOrderData.vat_total)).toFixed(2)}</p>
                            <h3 style={{ marginTop: '8px', color: 'var(--gold-accent)' }}>Grand Total: ₹{parseFloat(selectedOrderData.grand_total).toFixed(2)}</h3>
                        </div>

                        <div style={styles.modalActions}>
                            <button
                                className="premium-btn"
                                style={{ padding: '12px', flex: 1 }}
                                onClick={() => navigate('/orders')}
                            >
                                Add More Items
                            </button>
                            <button
                                className="gold-btn"
                                style={{ padding: '12px', flex: 1 }}
                                onClick={() => setShowPrintConfirm(true)}
                            >
                                Print Final Bill
                            </button>
                        </div>
                        <div style={{ ...styles.modalActions, marginTop: '12px' }}>
                            <button
                                style={{ padding: '12px', flex: 1, border: '1px solid var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                onClick={async () => {
                                    if (window.confirm('Are you sure you want to CANCEL this active order completely?')) {
                                        try {
                                            await api.post('/orders/cancel', {
                                                table_number: selectedOrderData.table_number,
                                                items: selectedOrderData.items,
                                                cancel_reason: 'Cancelled active order from Table View',
                                                total_amount: selectedOrderData.grand_total
                                            });
                                            // Normally you'd want to also update the active order status to 'cancelled' in DB
                                            await api.put(`/orders/${selectedOrderData.order_id}/status`, { status: 'cancelled' });
                                            await api.put(`/tables/${selectedOrderData.table_id}/status`, { status: 'available' });

                                            setShowOrderModal(false);
                                            setSelectedOrderData(null);
                                            fetchTables();
                                        } catch (err) {
                                            console.error('Failed to cancel active order', err);
                                            alert('Error cancelling order');
                                        }
                                    }
                                }}
                            >
                                Cancel Entire Order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Confirmation Modal */}
            {showPrintConfirm && (
                <div style={{ ...styles.modalOverlay, zIndex: 200 }}>
                    <div className="card" style={{ ...styles.modalContent, maxWidth: '400px', textAlign: 'center' }}>
                        <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Print and Settle Bill?</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px' }}>
                            Are you sure you want to print the final bill? This action will permanently close the order and set Table {selectedOrderData?.table_number} back to Available.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
                                onClick={() => setShowPrintConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="gold-btn"
                                style={{ padding: '10px 20px', borderRadius: '8px' }}
                                onClick={printBill}
                                disabled={printingOption}
                            >
                                {printingOption ? 'Printing...' : 'Yes, Print & Settle'}
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
    legend: {
        display: 'flex',
        gap: '24px',
        backgroundColor: 'var(--bg-card)',
        padding: '12px 24px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)'
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '500',
        color: 'var(--text-primary)'
    },
    legendColor: {
        width: '12px',
        height: '12px',
        borderRadius: '50%'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '24px'
    },
    tableCard: {
        padding: '20px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        minHeight: '160px'
    },
    tableHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    tableNumber: {
        fontSize: '24px',
        fontWeight: '700',
        color: 'var(--text-primary)'
    },
    statusBadge: {
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '700',
        letterSpacing: '0.5px'
    },
    tableBody: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginTop: '8px'
    },
    infoRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--text-secondary)',
        fontSize: '14px',
        fontWeight: '500'
    },
    tableFooter: {
        borderTop: '1px solid var(--border-color)',
        paddingTop: '16px',
        textAlign: 'center'
    },
    clickHint: {
        fontSize: '13px',
        color: 'var(--text-secondary)',
        fontStyle: 'italic'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100
    },
    modalContent: {
        width: '100%',
        maxWidth: '500px',
        padding: '24px',
        backgroundColor: 'var(--bg-card)'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '12px'
    },
    closeBtn: {
        fontSize: '28px',
        color: 'var(--text-secondary)',
        background: 'none',
        border: 'none',
        cursor: 'pointer'
    },
    orderSummary: {
        backgroundColor: 'var(--bg-secondary)',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    modalActions: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
    },
    actionBtn: {
        padding: '12px',
        flex: 1,
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '14px',
        minWidth: '120px'
    }
};

export default Tables;
