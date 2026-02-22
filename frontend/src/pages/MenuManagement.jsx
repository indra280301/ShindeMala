import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Settings } from 'lucide-react';
import api from '../api/axios';

const MenuManagement = () => {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newItemForm, setNewItemForm] = useState({
        name: '', category_id: '', price: '', cost_price: '0',
        cgst_rate: '0', sgst_rate: '0', vat_rate: '0', dietary_flag: 'veg'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [catRes, itemsRes] = await Promise.all([
                api.get('/menu/categories'),
                api.get('/menu/items')
            ]);
            setCategories(catRes.data);
            setItems(itemsRes.data);
        } catch (err) {
            console.error('Failed to load menu data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (item) => {
        setEditingId(item.item_id);
        setEditForm({
            price: item.price,
            cgst_rate: item.cgst_rate,
            sgst_rate: item.sgst_rate,
            vat_rate: item.vat_rate,
            is_available: item.is_available
        });
    };

    const handleSaveEdit = async (id) => {
        try {
            await api.put(`/menu/items/${id}`, editForm);
            setEditingId(null);
            fetchData();
        } catch (err) {
            console.error('Failed to update item', err);
            alert('Failed to update item');
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        try {
            await api.post('/menu/items', newItemForm);
            setShowAddModal(false);
            setNewItemForm({
                name: '', category_id: categories[0]?.category_id || '', price: '', cost_price: '0',
                cgst_rate: '2.5', sgst_rate: '2.5', vat_rate: '0', dietary_flag: 'veg'
            });
            fetchData();
        } catch (err) {
            console.error('Failed to add item', err);
            alert('Failed to add item. Fill all required fields!');
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const res = await api.post('/menu/categories', { category_name: newCategoryName });
            setNewCategoryName('');
            setShowAddCategory(false);
            await fetchData();
            setNewItemForm(prev => ({ ...prev, category_id: res.data.category_id }));
        } catch (err) {
            console.error('Failed to add category', err);
            alert('Failed to add category');
        }
    };

    const setTaxPreset = (preset) => {
        if (preset === 'food') {
            setNewItemForm({ ...newItemForm, cgst_rate: '2.5', sgst_rate: '2.5', vat_rate: '0' });
        } else if (preset === 'alcohol') {
            setNewItemForm({ ...newItemForm, cgst_rate: '0', sgst_rate: '0', vat_rate: '10' });
        }
    };

    if (loading) return <div style={{ padding: '40px' }}>Loading Menu Server...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div>
                    <h1 style={styles.pageTitle}>Menu & Tax Configuration</h1>
                    <p style={styles.pageSubtitle}>Manage items, prices, and tax rates (GST / VAT)</p>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px', width: '250px' }}
                    />
                    <button className="gold-btn" style={styles.btn} onClick={() => {
                        setNewItemForm({ ...newItemForm, category_id: categories[0]?.category_id || '' });
                        setShowAddModal(true);
                    }}>
                        <Plus size={18} /> Add New Item
                    </button>
                </div>
            </header>

            <div className="card" style={styles.tableCard}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Name</th>
                            <th style={styles.th}>Category</th>
                            <th style={styles.th}>Base Price (₹)</th>
                            <th style={styles.th}>CGST (%)</th>
                            <th style={styles.th}>SGST (%)</th>
                            <th style={styles.th}>VAT (%)</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.category_name && item.category_name.toLowerCase().includes(searchQuery.toLowerCase()))).map((item) => (
                            <tr key={item.item_id} style={styles.tr}>
                                <td style={styles.td}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={item.dietary_flag === 'veg' ? styles.vegDot : styles.nonVegDot} />
                                        {item.name}
                                    </div>
                                </td>
                                <td style={styles.td}>{item.category_name}</td>

                                {editingId === item.item_id ? (
                                    <>
                                        <td style={styles.td}><input type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} style={styles.editInput} /></td>
                                        <td style={styles.td}><input type="number" step="0.1" value={editForm.cgst_rate} onChange={e => setEditForm({ ...editForm, cgst_rate: e.target.value })} style={styles.editInputSmall} /></td>
                                        <td style={styles.td}><input type="number" step="0.1" value={editForm.sgst_rate} onChange={e => setEditForm({ ...editForm, sgst_rate: e.target.value })} style={styles.editInputSmall} /></td>
                                        <td style={styles.td}><input type="number" step="0.1" value={editForm.vat_rate} onChange={e => setEditForm({ ...editForm, vat_rate: e.target.value })} style={styles.editInputSmall} /></td>
                                        <td style={styles.td}>
                                            <select value={editForm.is_available ? 1 : 0} onChange={e => setEditForm({ ...editForm, is_available: e.target.value === '1' })} style={styles.editInput}>
                                                <option value={1}>Active</option>
                                                <option value={0}>Inactive</option>
                                            </select>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={styles.actionBtns}>
                                                <button style={{ color: 'var(--success)' }} onClick={() => handleSaveEdit(item.item_id)}><Save size={18} /></button>
                                                <button style={{ color: 'var(--danger)' }} onClick={handleCancelEdit}><X size={18} /></button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td style={styles.td}>{parseFloat(item.price).toFixed(2)}</td>
                                        <td style={styles.td}>{parseFloat(item.cgst_rate).toFixed(1)}%</td>
                                        <td style={styles.td}>{parseFloat(item.sgst_rate).toFixed(1)}%</td>
                                        <td style={styles.td}>{parseFloat(item.vat_rate).toFixed(1)}%</td>
                                        <td style={styles.td}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                                backgroundColor: item.is_available ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)',
                                                color: item.is_available ? 'var(--success)' : 'var(--danger)'
                                            }}>
                                                {item.is_available ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <button style={{ color: 'var(--gold-accent)' }} onClick={() => handleEditClick(item)}><Edit2 size={18} /></button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showAddModal && (
                <div style={styles.modalOverlay}>
                    <div className="card" style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h2>Add Menu Item</h2>
                            <button onClick={() => setShowAddModal(false)}><X size={24} color="var(--text-secondary)" /></button>
                        </div>
                        <form onSubmit={handleAddItem} style={styles.form}>
                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Name</label>
                                    <input required style={styles.input} value={newItemForm.name} onChange={e => setNewItemForm({ ...newItemForm, name: e.target.value })} />
                                </div>
                                <div style={styles.formGroup}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label style={styles.label}>Category</label>
                                        <button type="button" onClick={() => setShowAddCategory(!showAddCategory)} style={{ color: 'var(--gold-accent)', fontSize: '12px' }}>
                                            {showAddCategory ? 'Cancel' : '+ New Category'}
                                        </button>
                                    </div>
                                    {showAddCategory ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                style={styles.input}
                                                placeholder="Category Name"
                                                value={newCategoryName}
                                                onChange={e => setNewCategoryName(e.target.value)}
                                            />
                                            <button type="button" onClick={handleAddCategory} className="gold-btn" style={{ padding: '10px' }}>Add</button>
                                        </div>
                                    ) : (
                                        <select required style={styles.input} value={newItemForm.category_id} onChange={e => setNewItemForm({ ...newItemForm, category_id: e.target.value })}>
                                            {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                                        </select>
                                    )}
                                </div>
                            </div>
                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Base Price (₹)</label>
                                    <input type="number" required style={styles.input} value={newItemForm.price} onChange={e => setNewItemForm({ ...newItemForm, price: e.target.value })} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Type</label>
                                    <select style={styles.input} value={newItemForm.dietary_flag} onChange={e => setNewItemForm({ ...newItemForm, dietary_flag: e.target.value })}>
                                        <option value="veg">Veg</option>
                                        <option value="non-veg">Non-Veg</option>
                                        <option value="egg">Egg</option>
                                    </select>
                                </div>
                            </div>

                            <div style={styles.taxPresets}>
                                <button type="button" style={styles.presetBtn} onClick={() => setTaxPreset('food')}>Apply Food Tax (5% GST, 0% VAT)</button>
                                <button type="button" style={styles.presetBtn} onClick={() => setTaxPreset('alcohol')}>Apply Alcohol Tax (0% GST, 10% VAT)</button>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>CGST %</label>
                                    <input type="number" step="0.1" required style={styles.input} value={newItemForm.cgst_rate} onChange={e => setNewItemForm({ ...newItemForm, cgst_rate: e.target.value })} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>SGST %</label>
                                    <input type="number" step="0.1" required style={styles.input} value={newItemForm.sgst_rate} onChange={e => setNewItemForm({ ...newItemForm, sgst_rate: e.target.value })} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>VAT %</label>
                                    <input type="number" step="0.1" required style={styles.input} value={newItemForm.vat_rate} onChange={e => setNewItemForm({ ...newItemForm, vat_rate: e.target.value })} />
                                </div>
                            </div>

                            <button type="submit" className="gold-btn" style={{ marginTop: '16px', width: '100%', padding: '12px' }}>Save Item</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { display: 'flex', flexDirection: 'column', gap: '32px', height: '100%' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    pageTitle: { fontSize: '28px', color: 'var(--text-primary)', fontWeight: '700', marginBottom: '8px' },
    pageSubtitle: { color: 'var(--text-secondary)', fontSize: '15px' },
    btn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' },
    tableCard: { overflowX: 'auto', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    th: { padding: '16px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '14px' },
    tr: { borderBottom: '1px solid var(--border-color)', transition: 'var(--transition-smooth)' },
    td: { padding: '16px', color: 'var(--text-primary)', fontSize: '15px' },
    vegDot: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'green', display: 'inline-block' },
    nonVegDot: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'red', display: 'inline-block' },
    editInput: { padding: '6px', borderRadius: '4px', border: '1px solid var(--gold-accent)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', width: '80px' },
    editInputSmall: { padding: '6px', borderRadius: '4px', border: '1px solid var(--gold-accent)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', width: '60px' },
    actionBtns: { display: 'flex', gap: '12px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modalContent: { width: '100%', maxWidth: '600px', padding: '32px', backgroundColor: 'var(--bg-card)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    form: { display: 'flex', flexDirection: 'column', gap: '16px' },
    formRow: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '150px' },
    label: { fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' },
    input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px', width: '100%', minWidth: '0' },
    taxPresets: { display: 'flex', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)' },
    presetBtn: { fontSize: '13px', color: 'var(--gold-accent)', fontWeight: '500', padding: '6px 12px', border: '1px solid var(--gold-accent)', borderRadius: '4px' }
};

export default MenuManagement;
