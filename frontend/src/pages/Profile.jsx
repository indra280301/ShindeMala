import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { User, Phone, Save } from 'lucide-react';
import api from '../api/axios';

const Profile = () => {
    const user = useStore(state => state.user);
    const setUser = useStore(state => state.setUser);

    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        phone: user?.phone || '',
        profile_photo: user?.profile_photo || ''
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Hydrate from latest user object in condition store might be stale
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                phone: user.phone || '',
                profile_photo: user.profile_photo || ''
            });
        }
    }, [user]);

    const handleSave = async () => {
        try {
            setLoading(true);
            await api.put('/staff/profile', formData);

            // Update local Zustand store
            setUser({ ...user, ...formData });

            alert('Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '32px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h1 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '24px', fontSize: '24px' }}>My Profile</h1>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', color: 'var(--gold-accent)', overflow: 'hidden', border: '2px solid var(--gold-accent)' }}>
                        {formData.profile_photo ? (
                            <img src={formData.profile_photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <User size={48} />
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>Username (Cannot be changed)</label>
                        <input
                            value={user?.username || ''}
                            disabled
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'not-allowed', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>Role</label>
                        <input
                            value={(user?.role || '').toUpperCase()}
                            disabled
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'not-allowed', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 'bold' }}>Full Name</label>
                        <input
                            value={formData.full_name}
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                            placeholder="Enter your full name"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 'bold' }}>Phone Number</label>
                        <input
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Enter contact number"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 'bold' }}>Profile Photo URL</label>
                        <input
                            value={formData.profile_photo}
                            onChange={e => setFormData({ ...formData, profile_photo: e.target.value })}
                            placeholder="Enter a public image URL"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }}
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                            marginTop: '16px',
                            padding: '14px',
                            background: 'var(--gold-accent)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '16px',
                            transition: 'opacity 0.2s',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        <Save size={20} />
                        {loading ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;
