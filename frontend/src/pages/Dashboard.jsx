import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, ShoppingBag, Grid, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import api from '../api/axios';
import { useStore } from '../store/useStore';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';

const Dashboard = () => {
    const draftCarts = useStore(state => state.draftCarts);
    const refreshTrigger = useStore((state) => state.refreshTrigger);
    const [showRevenue, setShowRevenue] = useState(false);
    const [data, setData] = useState({
        todaysSales: 0,
        activeOrdersCount: 0,
        tablesOccupied: '0 / 0',
        recentOrders: [],
        topItems: [],
        graphData: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMetrics();
    }, [refreshTrigger]);

    const fetchMetrics = async () => {
        try {
            const res = await api.get('/dashboard/metrics');
            setData(res.data);
        } catch (error) {
            console.error('Failed to load dashboard metrics', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ padding: '40px' }}>Loading Dashboard Metrics...</div>;

    // Calculate real numbers by combining DB data and local draftCarts
    const draftTableKeys = Object.keys(draftCarts).filter(k => k.startsWith('table_') && draftCarts[k].length > 0);
    const draftTakeaways = draftCarts['takeaway'] && draftCarts['takeaway'].length > 0 ? 1 : 0;

    const dbTablesOccupied = parseInt(data.tablesOccupied.split(' / ')[0] || '0');
    const dbTotalTables = data.tablesOccupied.split(' / ')[1] || '0';

    const realTablesOccupied = new Set([...Array(dbTablesOccupied).keys(), ...draftTableKeys]).size; // Rough approximation

    // Total Active Orders = Occupied Tables + (Any Draft Takeaways OR the DB active takeaways count)
    const activeDbTakeaways = data.activeOrdersCount - dbTablesOccupied; // isolate takeaway count from backend
    const realTakeawayCount = Math.max(draftTakeaways, activeDbTakeaways);
    const realActiveOrdersCount = realTablesOccupied + realTakeawayCount;

    const metrics = [
        {
            title: "Today's Sales (10 AM - 10 AM)",
            value: `₹ ${data.todaysSales.toFixed(2)}`,
            icon: <IndianRupee size={24} color="var(--gold-accent)" />,
            isRevenue: true
        },
        {
            title: "Active Orders",
            value: realActiveOrdersCount,
            icon: <ShoppingBag size={24} color="var(--gold-accent)" />
        },
        {
            title: "Tables Occupied",
            value: `${Math.max(dbTablesOccupied, draftTableKeys.length)} / ${dbTotalTables}`,
            icon: <Grid size={24} color="var(--gold-accent)" />
        }
    ];

    return (
        <div style={styles.container}>
            <header className="dashboard-header" style={styles.header}>
                <div>
                    <h1 style={styles.pageTitle}>Dashboard overview</h1>
                    <p style={styles.pageSubtitle}>Monitor your restaurant's performance</p>
                </div>

                <div className="dashboard-live-clock" style={styles.liveClock}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </header>

            <div className="dashboard-metrics-grid" style={styles.metricsGrid}>
                {metrics.map((metric, index) => (
                    <motion.div
                        key={metric.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="card"
                        style={styles.metricCard}
                    >
                        <div style={styles.metricHeader}>
                            <span style={styles.metricTitle}>{metric.title}</span>
                            {metric.icon}
                        </div>

                        <div style={styles.metricBody}>
                            {metric.isRevenue ? (
                                <div style={styles.revenueContainer}>
                                    <h2 className="dashboard-metric-value" style={styles.metricValue}>
                                        {showRevenue ? metric.value : "₹ *****.**"}
                                    </h2>
                                    <button onClick={() => setShowRevenue(!showRevenue)} style={styles.eyeBtn}>
                                        {showRevenue ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            ) : (
                                <h2 className="dashboard-metric-value" style={styles.metricValue}>{metric.value}</h2>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="dashboard-charts-grid" style={styles.chartsGrid}>
                <div className="card dashboard-chart-card" style={styles.chartCard}>
                    <h3 style={styles.chartTitle}>7-Day Earnings Trend</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={data.graphData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--gold-accent)" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="var(--gold-accent)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} />
                                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Area type="monotone" dataKey="earnings" stroke="var(--gold-accent)" fillOpacity={1} fill="url(#colorEarnings)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card dashboard-chart-card" style={styles.chartCard}>
                    <h3 style={styles.chartTitle}>Top 5 Selling Items</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={data.topItems} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                                <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} />
                                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={11} width={100} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                                />
                                <Bar dataKey="total_sold" fill="var(--gold-accent)" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="dashboard-charts-grid" style={{ ...styles.chartsGrid, marginTop: '24px' }}>
                <div className="card dashboard-chart-card" style={styles.chartCard}>
                    <div style={styles.chartHeaderRow}>
                        <h3 style={styles.chartTitle}>Recent Orders</h3>
                    </div>
                    <div style={styles.ordersList}>
                        {data.recentOrders.length === 0 ? (
                            <p style={styles.placeholder}>No recent orders</p>
                        ) : (
                            data.recentOrders.map((order, i) => (
                                <div key={i} style={styles.orderRow}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                            Order #{order.order_id}
                                            <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '13px', marginLeft: '8px' }}>
                                                ({order.table_number ? `Tb ${order.table_number}` : 'Takeaway'})
                                            </span>
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={12} /> {new Date(order.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                        <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>₹{parseFloat(order.grand_total).toFixed(2)}</span>
                                        <span style={{
                                            fontSize: '11px',
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            backgroundColor: order.order_status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(212, 175, 55, 0.1)',
                                            color: order.order_status === 'completed' ? 'var(--success)' : 'var(--gold-accent)',
                                            textTransform: 'uppercase'
                                        }}>
                                            {order.order_status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="card dashboard-chart-card" style={styles.chartCard}>
                    <h3 style={styles.chartTitle}>Daily Order Volume</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={data.graphData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} />
                                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Bar dataKey="orders" fill="var(--text-secondary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
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
    liveClock: {
        backgroundColor: 'var(--bg-card)',
        padding: '12px 24px',
        borderRadius: 'var(--radius-lg)',
        fontSize: '20px',
        fontWeight: '600',
        color: 'var(--gold-accent)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border-color)'
    },
    metricsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px'
    },
    metricCard: {
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    metricHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    metricTitle: {
        color: 'var(--text-secondary)',
        fontSize: '15px',
        fontWeight: '500'
    },
    metricBody: {
        display: 'flex',
        alignItems: 'center'
    },
    revenueContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    eyeBtn: {
        color: 'var(--gold-accent)',
        fontSize: '13px',
        textDecoration: 'underline',
        background: 'none',
        border: 'none',
        cursor: 'pointer'
    },
    metricValue: {
        fontSize: '32px',
        color: 'var(--text-primary)',
        fontWeight: '700'
    },
    chartsGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px'
    },
    chartCard: {
        padding: '24px',
        minHeight: '350px',
        display: 'flex',
        flexDirection: 'column'
    },
    chartHeaderRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
    },
    chartTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: 'var(--text-primary)',
        margin: 0
    },
    ordersList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        flex: 1,
        overflowY: 'auto'
    },
    orderRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
    },
    placeholder: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
        fontStyle: 'italic',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)'
    }
};

export default Dashboard;
