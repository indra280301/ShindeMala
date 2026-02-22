import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Edit2, Key, CheckCircle, XCircle, MapPin, Grid, Shield } from 'lucide-react';
import api from '../api/axios';

const StaffManagement = () => {
    const [staff, setStaff] = useState([]);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showTableModal, setShowTableModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const [formData, setFormData] = useState({
        username: '',
        phone: '',
        role: 'waiter',
        password: '',
        profile_photo: null
    });

    const [passwordData, setPasswordData] = useState({
        new_password: ''
    });

    const [assignedTables, setAssignedTables] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [staffRes, tablesRes] = await Promise.all([
                api.get('/staff'),
                api.get('/tables')
            ]);
            setStaff(staffRes.data);
            setTables(tablesRes.data);
        } catch (error) {
            console.error('Error fetching staff data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (userId) => {
        try {
            await api.put(`/staff/${userId}/toggle-active`);
            fetchData();
        } catch (error) {
            console.error('Error toggling active status', error);
        }
    };

    const handleSaveStaff = async () => {
        try {
            const data = new FormData();
            data.append('full_name', formData.full_name);
            data.append('phone', formData.phone);
            data.append('role', formData.role);
            if (formData.profile_photo) {
                data.append('profile_photo', formData.profile_photo);
            }

            if (selectedUser) {
                await api.put(`/staff/${selectedUser.user_id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                data.append('username', formData.username);
                data.append('password', formData.password);
                await api.post('/staff', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving staff', error);
            alert(error.response?.data?.error || 'Failed to save staff');
        }
    };

    const handleUpdatePassword = async () => {
        try {
            await api.put(`/staff/${selectedUser.user_id}/password`, {
                password: passwordData.new_password
            });
            setShowPasswordModal(false);
            alert('Password updated successfully');
        } catch (error) {
            console.error('Error updating password', error);
            alert(error.response?.data?.error || 'Failed to update password');
        }
    };

    const handleSaveTables = async () => {
        try {
            await api.post(`/staff/${selectedUser.user_id}/tables`, {
                table_ids: assignedTables
            });
            setShowTableModal(false);
            alert('Tables assigned successfully');
        } catch (error) {
            console.error('Error assigning tables', error);
            alert(error.response?.data?.error || 'Failed to assign tables');
        }
    };

    const openCreateModal = () => {
        setSelectedUser(null);
        setFormData({ username: '', full_name: '', phone: '', role: 'waiter', password: '', profile_photo: null });
        setShowModal(true);
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({ username: user.username, full_name: user.full_name, phone: user.phone || '', role: user.role, password: '', profile_photo: null });
        setShowModal(true);
    };

    const openPasswordModal = (user) => {
        setSelectedUser(user);
        setPasswordData({ new_password: '' });
        setShowPasswordModal(true);
    };

    const openTableModal = async (user) => {
        setSelectedUser(user);
        try {
            const res = await api.get(`/staff/${user.user_id}/tables`);
            setAssignedTables(res.data);
            setShowTableModal(true);
        } catch (error) {
            console.error('Error fetching assigned tables', error);
        }
    };

    const toggleTableSelection = (tableId) => {
        if (assignedTables.includes(tableId)) {
            setAssignedTables(prev => prev.filter(id => id !== tableId));
        } else {
            setAssignedTables(prev => [...prev, tableId]);
        }
    };

    const toggleSectionSelection = (sectionName) => {
        const sectionTables = tables.filter(t => t.section === sectionName).map(t => t.table_id);
        const allAssigned = sectionTables.every(id => assignedTables.includes(id));

        if (allAssigned) {
            // Deselect all
            setAssignedTables(prev => prev.filter(id => !sectionTables.includes(id)));
        } else {
            // Select all
            const newAssigned = [...assignedTables];
            sectionTables.forEach(id => {
                if (!newAssigned.includes(id)) newAssigned.push(id);
            });
            setAssignedTables(newAssigned);
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin': return '#ff4444';
            case 'manager': return '#ffbb33';
            case 'waiter': return '#00C851';
            case 'kitchen': return '#33b5e5';
            case 'cashier': return '#aa66cc';
            default: return '#ffffff';
        }
    };

    return (
        <div className="admin-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '28px', color: 'var(--text-primary)' }}>Staff Management</h1>
                    <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)' }}>Manage roles, access, and specific table assignments</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="primary-btn"
                    style={{ background: 'var(--gold-accent)', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                    <Plus size={20} /> Add Staff
                </button>
            </div>

            {loading ? (
                <div style={{ color: 'var(--text-primary)', textAlign: 'center', marginTop: '40px' }}>Loading staff...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                    {staff.map(user => (
                        <motion.div
                            key={user.user_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '16px',
                                padding: '24px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: 'var(--gold-accent)', overflow: 'hidden' }}>
                                        {user.profile_photo ? <img src={user.profile_photo} alt={user.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Users />}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px' }}>{user.full_name}</h3>
                                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>@{user.username}</span>
                                    </div>
                                </div>
                                <div
                                    onClick={() => handleToggleActive(user.user_id)}
                                    style={{
                                        width: '12px', height: '12px', borderRadius: '50%',
                                        background: user.is_active ? 'var(--success-color)' : 'var(--danger-color)',
                                        cursor: 'pointer',
                                        boxShadow: `0 0 10px ${user.is_active ? 'var(--success-color)' : 'var(--danger-color)'}`
                                    }}
                                    title={user.is_active ? "Active - Click to Deactivate" : "Inactive - Click to Activate"}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <span style={{
                                    display: 'inline-block',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: '#000',
                                    background: getRoleColor(user.role),
                                    textTransform: 'uppercase'
                                }}>
                                    {user.role}
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                <button onClick={() => openEditModal(user)} style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                                    <Edit2 size={16} /> Edit
                                </button>
                                <button onClick={() => openPasswordModal(user)} style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                                    <Key size={16} /> Pass
                                </button>
                                {(user.role === 'waiter') && (
                                    <button onClick={() => openTableModal(user)} style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid var(--gold-accent)', color: 'var(--gold-accent)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                                        <MapPin size={16} /> Tables
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Profile Modal */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '400px', border: '1px solid var(--border-color)' }}>
                        <h2 style={{ color: 'var(--text-primary)', marginTop: 0 }}>{selectedUser ? 'Edit Staff Details' : 'Create New Staff'}</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Profile Photo (Optional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => setFormData({ ...formData, profile_photo: e.target.files[0] })}
                                    style={{ color: 'var(--text-primary)' }}
                                />
                            </div>
                            <input
                                placeholder="Full Name"
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                            {!selectedUser && (
                                <input
                                    placeholder="Username"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            )}
                            <input
                                placeholder="Phone Number"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                            {!selectedUser && (
                                <input
                                    placeholder="Password"
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            )}
                            <select
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            >
                                <option value="waiter">Waiter</option>
                                <option value="kitchen">Kitchen Staff</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleSaveStaff} style={{ flex: 1, padding: '12px', background: 'var(--gold-accent)', border: 'none', color: '#000', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {
                showPasswordModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '400px', border: '1px solid var(--border-color)' }}>
                            <h2 style={{ color: 'var(--text-primary)', marginTop: 0 }}>Reset Password for {selectedUser?.full_name}</h2>
                            <div style={{ marginTop: '24px' }}>
                                <input
                                    placeholder="New Password"
                                    type="password"
                                    value={passwordData.new_password}
                                    onChange={e => setPasswordData({ new_password: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button onClick={() => setShowPasswordModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleUpdatePassword} style={{ flex: 1, padding: '12px', background: 'var(--danger-color)', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Reset</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Table Mapping Modal */}
            {
                showTableModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '600px', border: '1px solid var(--border-color)', maxHeight: '80vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h2 style={{ color: 'var(--text-primary)', marginTop: 0 }}>Assign Tables to {selectedUser?.full_name}</h2>
                                <button onClick={() => setShowTableModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><XCircle size={24} /></button>
                            </div>

                            {['AC', 'Non-AC', 'Family'].map(section => {
                                const sectionTables = tables.filter(t => t.section === section);
                                if (sectionTables.length === 0) return null;
                                const allAssigned = sectionTables.every(t => assignedTables.includes(t.table_id));

                                return (
                                    <div key={section} style={{ marginTop: '24px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <h3 style={{ margin: 0, color: 'var(--gold-accent)' }}>{section} Section</h3>
                                            <button onClick={() => toggleSectionSelection(section)} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid var(--gold-accent)', color: 'var(--gold-accent)', borderRadius: '12px', fontSize: '12px', cursor: 'pointer' }}>
                                                {allAssigned ? 'Deselect All' : 'Select All'}
                                            </button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                            {sectionTables.map(t => {
                                                const isSelected = assignedTables.includes(t.table_id);
                                                return (
                                                    <div
                                                        key={t.table_id}
                                                        onClick={() => toggleTableSelection(t.table_id)}
                                                        style={{
                                                            border: `1px solid ${isSelected ? 'var(--gold-accent)' : 'var(--border-color)'}`,
                                                            background: isSelected ? 'rgba(212,175,55,0.1)' : 'var(--bg-primary)',
                                                            color: isSelected ? 'var(--gold-accent)' : 'var(--text-primary)',
                                                            padding: '12px',
                                                            borderRadius: '8px',
                                                            textAlign: 'center',
                                                            cursor: 'pointer',
                                                            fontWeight: 'bold',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {t.table_number}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                                <button onClick={() => setShowTableModal(false)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleSaveTables} style={{ flex: 1, padding: '14px', background: 'var(--gold-accent)', border: 'none', color: '#000', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Save Table Access</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default StaffManagement;
