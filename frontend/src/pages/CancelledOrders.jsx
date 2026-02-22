import React, { useState, useEffect } from 'react';
import { Trash2, Calendar, User, ShoppingBag } from 'lucide-react';
import api from '../api/axios';
import { motion } from 'framer-motion';

const CancelledOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCancelledOrders();
    }, []);

    const fetchCancelledOrders = async () => {
        try {
            const { data } = await api.get('/orders/cancelled');
            // Parse items string back to JSON objects for displaying
            const parsedOrders = data.map(order => ({
                ...order,
                items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
            }));
            setOrders(parsedOrders);
        } catch (error) {
            console.error('Failed to fetch cancelled orders', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ padding: '40px' }}>Loading Deleted Records...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div>
                    <h1 style={styles.pageTitle}>Deleted Draft Orders</h1>
                    <p style={styles.pageSubtitle}>Log of all discarded cart sessions</p>
                </div>
                <div style={styles.stats}>
                    <div style={styles.statCard}>
                        <h4 style={styles.statLabel}>Total Cleared</h4>
                        <p style={styles.statValue}>{orders.length}</p>
                    </div>
                </div>
            </header>

            <div style={styles.grid}>
                {orders.length === 0 ? (
                    <div className="card" style={styles.emptyCard}>
                        <Trash2 size={48} color="var(--text-secondary)" style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <h3>No Deleted Orders Logged</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>There are currently no discarded table drafts to display.</p>
                    </div>
                ) : (
                    orders.map((order, i) => (
                        <motion.div
                            key={order.cancel_id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="card"
                            style={styles.logCard}
                        >
                            <div style={styles.cardHeader}>
                                <div>
                                    <h3 style={styles.tableRef}>Table {order.table_number}</h3>
                                    <div style={styles.metaRow}>
                                        <Calendar size={12} />
                                        <span>{new Date(order.cancelled_at).toLocaleString()}</span>
                                    </div>
                                    <div style={styles.metaRow}>
                                        <User size={12} />
                                        <span>Discarded By: {order.waiter_name}</span>
                                    </div>
                                </div>
                                <div style={styles.badge}>
                                    Discarded
                                </div>
                            </div>

                            <div style={styles.divider} />

                            <div style={styles.itemsList}>
                                <div style={{ ...styles.metaRow, color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 'bold' }}>
                                    <ShoppingBag size={14} />
                                    <span>Discarded Cart Items:</span>
                                </div>
                                {order.items && order.items.length > 0 ? (
                                    order.items.map((item, idx) => (
                                        <div key={idx} style={styles.itemRow}>
                                            <span>{item.quantity}x {item.name}</span>
                                            <span style={{ color: 'var(--text-secondary)' }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Cart was empty when deleted.</p>
                                )}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
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
        borderLeft: '4px solid var(--danger)'
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
        borderLeft: '4px solid var(--danger)',
        padding: '0' // Handled natively by card class usually, but overwriting for tight layout
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
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        color: 'var(--danger)',
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
    itemsList: {
        padding: '20px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottomLeftRadius: 'var(--radius-lg)',
        borderBottomRightRadius: 'var(--radius-lg)'
    },
    itemRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '13px',
        color: 'var(--text-primary)',
        padding: '6px 0',
        borderBottom: '1px dashed var(--border-color)'
    }
};

export default CancelledOrders;
