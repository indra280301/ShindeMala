import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Save, Layout, Settings, Users } from 'lucide-react';
import api from '../api/axios';

const SECTIONS = ['AC', 'Non-AC', 'Family'];
const GRID_ROWS = 8;
const GRID_COLS = 12;

const TableLayoutBuilder = () => {
    const [activeSection, setActiveSection] = useState('AC');
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal & Form State
    const [showModal, setShowModal] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null); // { r, c }
    const [formData, setFormData] = useState({
        table_id: null,
        table_number: '',
        capacity: 4,
        shape: 'square'
    });

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        try {
            const { data } = await api.get('/tables');
            setTables(data);
        } catch (error) {
            console.error('Failed to fetch tables', error);
        } finally {
            setLoading(false);
        }
    };

    const sectionTables = tables.filter(t => t.section === activeSection);

    const handleCellClick = (r, c) => {
        const existingTable = sectionTables.find(t => Number(t.grid_row) === r && Number(t.grid_col) === c);
        setSelectedCell({ r, c });
        if (existingTable) {
            setFormData({
                table_id: existingTable.table_id,
                table_number: existingTable.table_number,
                capacity: existingTable.capacity,
                shape: existingTable.shape || 'square'
            });
        } else {
            setFormData({
                table_id: null,
                table_number: `T${tables.length + 1}`,
                capacity: 4,
                shape: 'square'
            });
        }
        setShowConfirmDelete(false);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.table_number) return alert('Table number required');

        const payload = {
            table_number: formData.table_number,
            capacity: formData.capacity,
            section: activeSection,
            shape: formData.shape,
            grid_row: selectedCell.r,
            grid_col: selectedCell.c
        };

        try {
            if (formData.table_id) {
                await api.put(`/tables/${formData.table_id}`, payload);
            } else {
                await api.post('/tables', payload);
            }
            setShowModal(false);
            fetchTables();
        } catch (error) {
            console.error('Error saving table:', error);
            alert('Failed to save table.');
        }
    };

    const handleDeleteRequest = () => {
        if (!formData.table_id) return;
        setShowConfirmDelete(true);
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`/tables/${formData.table_id}`);
            setShowConfirmDelete(false);
            setShowModal(false);
            fetchTables();
        } catch (error) {
            console.error('Error deleting table:', error);
            alert(error.response?.data?.error || 'Failed to delete table. Make sure it has no active orders.');
            setShowConfirmDelete(false);
        }
    };

    // Render Grid
    const renderGrid = () => {
        const grid = [];
        const occupiedSet = new Set();

        // Pre-calculate occupied cells to prevent CSS auto-flow shifts
        sectionTables.forEach(t => {
            const tr = Number(t.grid_row);
            const tc = Number(t.grid_col);
            occupiedSet.add(`${tr}-${tc}`);
            if (t.shape === 'horizontal') occupiedSet.add(`${tr}-${tc + 1}`);
            if (t.shape === 'vertical') occupiedSet.add(`${tr + 1}-${tc}`);
        });

        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < Math.floor(GRID_COLS); c++) {
                const cellRow = r;
                const cellCol = c;

                const table = sectionTables.find(t => Number(t.grid_row) === cellRow && Number(t.grid_col) === cellCol);

                if (!table && occupiedSet.has(`${cellRow}-${cellCol}`)) {
                    continue; // Skip rendering an empty block if covered by a spanned table
                }

                let shapeStyle = {};
                const rowSpan = table && table.shape === 'vertical' ? 2 : 1;
                const colSpan = table && table.shape === 'horizontal' ? 2 : 1;

                if (table && table.shape === 'circle') {
                    shapeStyle = { borderRadius: '50%' };
                }

                grid.push(
                    <motion.div
                        key={`${cellRow}-${cellCol}`}
                        whileHover={{ scale: 0.95 }}
                        className={`grid-cell ${table ? 'filled' : 'empty'} ${table ? table.shape : ''}`}
                        style={{
                            ...shapeStyle,
                            gridRow: `${cellRow + 1} / span ${rowSpan}`,
                            gridColumn: `${cellCol + 1} / span ${colSpan}`
                        }}
                        onClick={() => handleCellClick(cellRow, cellCol)}
                    >
                        {table ? (
                            <div className="cell-content">
                                <strong>{table.table_number}</strong>
                                <span>{table.capacity} <Users size={10} /></span>
                            </div>
                        ) : (
                            <Plus size={16} className="add-icon" />
                        )}
                    </motion.div>
                );
            }
        }
        return grid;
    };

    if (loading) return <div style={{ padding: '40px' }}>Loading Builder...</div>;

    return (
        <div className="layout-builder-container">
            {/* Header */}
            <header className="builder-header">
                <div>
                    <h1>Table Structure Management</h1>
                    <p>Design and deploy restaurant sections</p>
                </div>
            </header>

            <div className="builder-main">
                {/* Left Area: Grid Canvas */}
                <div className="canvas-area">
                    <div className="canvas-header">
                        <h2>{activeSection} Area Layout</h2>
                        <span className="badge">{sectionTables.length} Tables</span>
                    </div>

                    <div className="grid-canvas">
                        <div className="grid-container" style={{
                            gridTemplateRows: `repeat(${GRID_ROWS}, 80px)`,
                            gridTemplateColumns: `repeat(${GRID_COLS}, 80px)`,
                            backgroundImage: 'radial-gradient(var(--border-color) 1px, transparent 1px)',
                            backgroundSize: '20px 20px'
                        }}>
                            {renderGrid()}
                        </div>
                    </div>
                </div>

                {/* Right Area: Vertical Side Panel Selector */}
                <div className="side-panel">
                    <h3>Sections</h3>
                    <div className="section-selector">
                        {SECTIONS.map(sec => (
                            <motion.button
                                key={sec}
                                className={`section-btn ${activeSection === sec ? 'active' : ''}`}
                                onClick={() => setActiveSection(sec)}
                                whileHover={{ x: 5 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Layout size={18} />
                                {sec}
                                {activeSection === sec && (
                                    <motion.div layoutId="activeInd" className="active-indicator" />
                                )}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Config Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="modal-overlay">
                        <motion.div
                            className="builder-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="modal-header">
                                <h3>{formData.table_id ? 'Edit Table Configuration' : 'Create New Table'}</h3>
                                <button onClick={() => setShowModal(false)} className="close-btn"><X size={20} /></button>
                            </div>

                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Table Name / Ref Number</label>
                                    <input
                                        type="text"
                                        value={formData.table_number}
                                        onChange={e => setFormData({ ...formData, table_number: e.target.value })}
                                        placeholder="e.g. T5 or Family-1"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Seating Capacity</label>
                                    <input
                                        type="number"
                                        value={formData.capacity}
                                        onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                                        min="1"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Table Matrix Shape</label>
                                    <div className="shape-selector">
                                        {['square', 'horizontal', 'vertical', 'circle'].map(s => (
                                            <button
                                                key={s}
                                                className={`shape-btn ${formData.shape === s ? 'active' : ''}`}
                                                onClick={() => setFormData({ ...formData, shape: s })}
                                            >
                                                <div className={`shape-preview ${s}`} />
                                                <span className="capitalize">{s}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                {formData.table_id && (
                                    <button className="del-btn" onClick={handleDeleteRequest} title="Remove this table and turn back into an empty slot">
                                        <Trash2 size={16} /> Vanish Table
                                    </button>
                                )}
                                <div className="spacer" style={{ flex: 1 }}></div>
                                <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button className="save-btn" onClick={handleSave}><Save size={16} /> Save Table</button>
                            </div>

                            {/* Inner Delete Confirmation Modal */}
                            <AnimatePresence>
                                {showConfirmDelete && (
                                    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.8)', zIndex: 1100 }}>
                                        <motion.div
                                            className="builder-modal"
                                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                                            animate={{ scale: 1, y: 0, opacity: 1 }}
                                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                                            style={{ maxWidth: '400px', borderTop: '4px solid var(--danger)' }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div style={{ padding: '24px', textAlign: 'center' }}>
                                                <Trash2 size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
                                                <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>Are you absolutely sure?</h3>
                                                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px', lineHeight: '1.5' }}>
                                                    This will permanently remove <strong>{formData.table_number}</strong> from the floor layout. This action cannot be undone.
                                                </p>
                                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => setShowConfirmDelete(false)}
                                                        style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 600 }}
                                                    >
                                                        No, Keep It
                                                    </button>
                                                    <button
                                                        onClick={confirmDelete}
                                                        style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
                                                    >
                                                        Yes, Vanish Table
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TableLayoutBuilder;
