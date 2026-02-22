import React, { useState } from 'react';
import { FileBarChart, Download, Calendar, DollarSign, IndianRupee, Users } from 'lucide-react';
import api from '../api/axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const AdminPanel = () => {
    const defaultEnd = new Date().toISOString().split('T')[0];
    const defaultStart = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(defaultEnd);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const generateReport = async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await api.post('/reports', { startDate, endDate });
            setReportData(data);
        } catch (err) {
            setError('Failed to generate report. Make sure you have admin rights.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = () => {
        if (!reportData) return;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.text('Shinde Mala - POS Activity Report', 14, 20);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Period: ${startDate} to ${endDate}`, 14, 30);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);

        // Core Financial Summary
        doc.autoTable({
            startY: 45,
            head: [['Metric', 'Value']],
            body: [
                ['Total Orders Completed', reportData.summary.total_orders],
                ['Total Subtotal', `Rs ${parseFloat(reportData.summary.total_subtotal).toFixed(2)}`],
                ['Total Tax (CGST + SGST + VAT)', `Rs ${(parseFloat(reportData.summary.total_cgst) + parseFloat(reportData.summary.total_sgst) + parseFloat(reportData.summary.total_vat)).toFixed(2)}`],
                ['Discounts Given', `Rs ${parseFloat(reportData.summary.total_discounts).toFixed(2)}`],
                ['Final Collected Revenue', `Rs ${parseFloat(reportData.summary.final_revenue).toFixed(2)}`],
                ['Orders Cancelled (Loss)', `${reportData.summary.cancel_count} (Rs ${parseFloat(reportData.summary.cancel_loss).toFixed(2)})`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [212, 175, 55] },
            styles: { fontSize: 10 }
        });

        const finalY = doc.lastAutoTable.finalY || 45;

        // Item Sales
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Item Sales Breakdown', 14, finalY + 15);

        const itemsBody = reportData.items.map(i => [
            i.name,
            i.qty_sold,
            `Rs ${parseFloat(i.revenue_generated).toFixed(2)}`
        ]);

        doc.autoTable({
            startY: finalY + 20,
            head: [['Item Name', 'Qty Sold', 'Revenue Generated']],
            body: itemsBody,
            theme: 'striped',
            headStyles: { fillColor: [40, 40, 40] },
            styles: { fontSize: 9 }
        });

        const nextY = doc.lastAutoTable.finalY || finalY + 20;

        // Waiter Performance
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Waiter Performance', 14, nextY + 15);

        const waitersBody = reportData.waiters.map(w => [
            w.full_name,
            w.tables_served,
            `Rs ${parseFloat(w.revenue_driven).toFixed(2)}`
        ]);

        doc.autoTable({
            startY: nextY + 20,
            head: [['Staff Name', 'Tables Served', 'Revenue Driven']],
            body: waitersBody,
            theme: 'striped',
            headStyles: { fillColor: [40, 40, 40] },
            styles: { fontSize: 9 }
        });

        doc.save(`ShindeMala_Report_${startDate}_${endDate}.pdf`);
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div>
                    <h1 style={styles.pageTitle}>Analytics & Reports</h1>
                    <p style={styles.pageSubtitle}>Generate comprehensive summaries for accounting and management.</p>
                </div>
            </header>

            <div className="card" style={styles.controlsPanel}>
                <div style={styles.inputsGroup}>
                    <div style={styles.inputWrapper}>
                        <label style={styles.label}>Start Date</label>
                        <div style={styles.inputBox}>
                            <Calendar size={18} color="var(--text-secondary)" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={styles.dateInput}
                            />
                        </div>
                    </div>

                    <div style={styles.inputWrapper}>
                        <label style={styles.label}>End Date</label>
                        <div style={styles.inputBox}>
                            <Calendar size={18} color="var(--text-secondary)" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate}
                                style={styles.dateInput}
                            />
                        </div>
                    </div>
                </div>

                <div style={styles.actionsGroup}>
                    <button
                        className="gold-btn"
                        onClick={generateReport}
                        disabled={loading}
                        style={{ padding: '12px 24px' }}
                    >
                        <FileBarChart size={18} />
                        {loading ? 'Crunching Data...' : 'Run Report'}
                    </button>

                    {reportData && (
                        <button
                            className="btn-outline"
                            onClick={downloadPDF}
                            style={{ padding: '12px 24px', display: 'flex', gap: '8px', alignItems: 'center' }}
                        >
                            <Download size={18} />
                            Export PDF
                        </button>
                    )}
                </div>
            </div>

            {error && <div style={{ color: 'var(--danger)', padding: '12px', background: 'rgba(231,76,60,0.1)', borderRadius: '8px', marginBottom: '20px' }}>{error}</div>}

            {reportData && (
                <div style={styles.reportPreview}>
                    <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IndianRupee size={20} color="var(--gold-accent)" />
                        Financial Summary
                    </h2>

                    <div style={styles.summaryGrid}>
                        <div style={styles.summaryCard}>
                            <span style={styles.summaryLabel}>Total Revenue</span>
                            <h3 style={styles.summaryValue}>₹{parseFloat(reportData.summary.final_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div style={styles.summaryCard}>
                            <span style={styles.summaryLabel}>Orders Processed</span>
                            <h3 style={styles.summaryValue}>{reportData.summary.total_orders}</h3>
                        </div>
                        <div style={styles.summaryCard}>
                            <span style={styles.summaryLabel}>Total Tax (CGST/SGST/VAT)</span>
                            <h3 style={styles.summaryValue}>₹{(parseFloat(reportData.summary.total_cgst) + parseFloat(reportData.summary.total_sgst) + parseFloat(reportData.summary.total_vat)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div style={styles.summaryCard}>
                            <span style={styles.summaryLabel}>Cancelled Order Revenue Lost</span>
                            <h3 style={{ ...styles.summaryValue, color: 'var(--danger)' }}>₹{parseFloat(reportData.summary.cancel_loss).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '24px' }}>
                        <div className="card" style={{ flex: 1, minWidth: '300px' }}>
                            <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-secondary)' }}>Top Selling Items</h3>
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                <table style={styles.dataTable}>
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th style={{ textAlign: 'right' }}>Qty</th>
                                            <th style={{ textAlign: 'right' }}>Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.items.slice(0, 10).map((item, idx) => (
                                            <tr key={idx}>
                                                <td>{item.name}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{item.qty_sold}</td>
                                                <td style={{ textAlign: 'right', color: 'var(--success)' }}>₹{parseFloat(item.revenue_generated).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="card" style={{ flex: 1, minWidth: '300px' }}>
                            <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-secondary)' }}>Staff Performance</h3>
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                <table style={styles.dataTable}>
                                    <thead>
                                        <tr>
                                            <th>Waiter</th>
                                            <th style={{ textAlign: 'center' }}>Tables</th>
                                            <th style={{ textAlign: 'right' }}>Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.waiters.map((w, idx) => (
                                            <tr key={idx}>
                                                <td>{w.full_name}</td>
                                                <td style={{ textAlign: 'center' }}>{w.tables_served}</td>
                                                <td style={{ textAlign: 'right', color: 'var(--success)' }}>₹{parseFloat(w.revenue_driven).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        padding: '24px',
        maxWidth: '1200px',
        margin: '0 auto'
    },
    header: {
        marginBottom: '24px'
    },
    pageTitle: {
        fontSize: '24px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        margin: '0 0 4px 0'
    },
    pageSubtitle: {
        fontSize: '14px',
        color: 'var(--text-secondary)',
        margin: 0
    },
    controlsPanel: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: '20px',
        padding: '20px',
        marginBottom: '24px'
    },
    inputsGroup: {
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap'
    },
    inputWrapper: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    label: {
        fontSize: '13px',
        fontWeight: '600',
        color: 'var(--text-secondary)'
    },
    inputBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        padding: '10px 16px',
        borderRadius: '8px',
        width: '200px'
    },
    dateInput: {
        border: 'none',
        background: 'transparent',
        color: 'var(--text-primary)',
        outline: 'none',
        width: '100%',
        fontFamily: 'inherit',
        fontSize: '14px'
    },
    actionsGroup: {
        display: 'flex',
        gap: '12px'
    },
    reportPreview: {
        animation: 'fadeIn 0.3s ease'
    },
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px'
    },
    summaryCard: {
        backgroundColor: 'var(--bg-card)',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)'
    },
    summaryLabel: {
        fontSize: '13px',
        color: 'var(--text-secondary)',
        display: 'block',
        marginBottom: '8px',
        fontWeight: '500'
    },
    summaryValue: {
        fontSize: '28px',
        margin: 0,
        color: 'var(--text-primary)'
    },
    dataTable: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '14px'
    }
};

export default AdminPanel;
