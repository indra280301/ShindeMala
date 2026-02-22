import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Home, ShoppingCart, Grid, ChefHat, GlassWater, Users, Menu as MenuIcon, Package, FileBarChart, Settings, LogOut, Moon, Sun, Trash2, History, Layout } from 'lucide-react';
import logoImage from '../assets/shinde_mala_logo_yellow.png';

const DashboardLayout = () => {
    const { user, logout, theme, toggleTheme, setSelectedTable } = useStore();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const allMenuItems = [
        { name: 'Dashboard', path: '/', icon: <Home size={20} />, roles: ['admin'] },
        { name: 'Orders / POS', path: '/orders', icon: <ShoppingCart size={20} />, roles: ['admin', 'waiter'] },
        { name: 'Table Management', path: '/tables', icon: <Grid size={20} />, roles: ['admin', 'waiter'] },
        { name: 'Table Layout', path: '/table-layout', icon: <Layout size={20} />, roles: ['admin'] },
        { name: 'Orders History', path: '/history', icon: <History size={20} />, roles: ['admin'] },
        { name: 'Kitchen Panel', path: '/kitchen', icon: <ChefHat size={20} />, roles: ['admin', 'kitchen'] },
        { name: 'Staff Management', path: '/staff', icon: <Users size={20} />, roles: ['admin'] },
        { name: 'Menu Management', path: '/menu', icon: <MenuIcon size={20} />, roles: ['admin'] },
        { name: 'Reports', path: '/reports', icon: <FileBarChart size={20} />, roles: ['admin'] },
        { name: 'Deleted Orders', path: '/cancelled-orders', icon: <Trash2 size={20} />, roles: ['admin'] },
        { name: 'My Profile', path: '/profile', icon: <Settings size={20} />, roles: ['waiter', 'kitchen', 'admin'] },
    ];

    const menuItems = allMenuItems.filter(item => item.roles.includes(user?.role));

    return (
        <div style={styles.container}>
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="mobile-overlay"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`dashboard-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`} style={styles.sidebar}>
                <div style={styles.logoContainer}>
                    <img src={logoImage} alt="Shinde Mala Logo" style={{ maxWidth: '180px', height: 'auto', marginBottom: '8px' }} onError={(e) => {
                        e.target.style.display = 'none';
                        document.getElementById('fallback-dashboard-title').style.display = 'block';
                    }} />
                    <h2 id="fallback-dashboard-title" style={{ ...styles.logoText, display: 'none' }}>Shinde Mala</h2>
                    <span style={styles.userRole}>{user?.role?.toUpperCase()}</span>
                </div>

                <nav style={styles.nav}>
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                if (item.path === '/orders') {
                                    setSelectedTable(null);
                                }
                            }}
                            style={({ isActive }) => ({
                                ...styles.navItem,
                                ...(isActive ? styles.navItemActive : {})
                            })}
                        >
                            {item.icon}
                            <span style={styles.navText}>{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                <div style={styles.footer}>
                    <button style={styles.actionBtn} onClick={toggleTheme}>
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} color="#d4af37" />}
                        <span style={styles.actionText}>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                    </button>

                    <button style={{ ...styles.actionBtn, color: 'var(--danger)' }} onClick={handleLogout}>
                        <LogOut size={20} />
                        <span style={styles.actionText}>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={styles.main}>
                <header className="dashboard-topbar" style={styles.topbar}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            className="hamburger-btn"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <MenuIcon size={24} />
                        </button>
                        <div style={styles.greeting} className="greeting">
                            <h2>Welcome back, {user?.full_name}</h2>
                        </div>
                    </div>
                    <div style={styles.topActions}>
                        <div style={{ ...styles.avatar, overflow: 'hidden' }}>
                            {user?.profile_photo ? (
                                <img src={user.profile_photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                user?.full_name?.charAt(0) || 'U'
                            )}
                        </div>
                    </div>
                </header>

                <div className="dashboard-content" style={styles.content}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-secondary)',
    },
    sidebar: {
        // Core flex properties retained, positional overrides handled by .dashboard-sidebar in index.css
        display: 'flex',
        flexDirection: 'column',
        transition: 'var(--transition-smooth)',
    },
    logoContainer: {
        padding: '30px 24px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    logoText: {
        color: 'var(--gold-accent)',
        fontSize: '24px',
        fontWeight: '700',
        letterSpacing: '0.5px'
    },
    userRole: {
        fontSize: '12px',
        color: 'var(--text-secondary)',
        fontWeight: '600'
    },
    nav: {
        flex: 1,
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        overflowY: 'auto'
    },
    navItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-secondary)',
        transition: 'var(--transition-smooth)',
        fontSize: '15px',
        fontWeight: '500'
    },
    navItemActive: {
        backgroundColor: 'var(--gold-accent)',
        color: '#fff',
        boxShadow: '0 4px 12px var(--shadow-glow)'
    },
    navText: {
        marginTop: '2px'
    },
    footer: {
        padding: '24px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    actionBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: 'var(--text-secondary)',
        padding: '8px 0',
        fontSize: '15px',
        fontWeight: '500'
    },
    actionText: {
        marginTop: '2px'
    },
    main: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    topbar: {
        height: '80px',
        padding: '0 32px',
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)'
    },
    greeting: {
        color: 'var(--text-primary)'
    },
    topActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    avatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: 'var(--gold-accent)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        fontWeight: '600',
        boxShadow: '0 2px 8px var(--shadow-glow)'
    },
    content: {
        flex: 1,
        padding: '32px',
        overflowY: 'auto'
    }
};

export default DashboardLayout;
