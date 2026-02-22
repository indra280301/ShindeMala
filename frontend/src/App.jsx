import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useStore } from './store/useStore';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Tables from './pages/Tables';
import KDS from './pages/KDS';
import AdminPanel from './pages/AdminPanel';
import StaffManagement from './pages/StaffManagement';
import MenuManagement from './pages/MenuManagement';
import CancelledOrders from './pages/CancelledOrders';
import OrdersHistory from './pages/OrdersHistory';
import TableLayoutBuilder from './pages/TableLayoutBuilder';
import Profile from './pages/Profile';

const ProtectedRoute = ({ children }) => {
  const token = useStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const WaiterBouncer = ({ children }) => {
  const user = useStore((state) => state.user);
  if (user?.role === 'waiter') return <Navigate to="/orders" replace />;
  return children;
};

const KitchenBouncer = ({ children }) => {
  const user = useStore((state) => state.user);
  if (user?.role === 'kitchen') return <Navigate to="/kitchen" replace />;
  return children;
};

const App = () => {
  const theme = useStore((state) => state.theme);
  const triggerRefresh = useStore((state) => state.triggerRefresh);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5001';
    const socket = io(backendUrl);

    socket.on('connect', () => {
      console.log('Connected to real-time sync server');
    });

    socket.on('order_updated', () => {
      triggerRefresh();
    });

    socket.on('table_updated', () => {
      triggerRefresh();
    });

    return () => {
      socket.disconnect();
    };
  }, [triggerRefresh]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={
            <KitchenBouncer>
              <WaiterBouncer>
                <Dashboard />
              </WaiterBouncer>
            </KitchenBouncer>
          } />
          <Route path="orders" element={<POS />} />
          <Route path="tables" element={<Tables />} />
          <Route path="table-layout" element={<TableLayoutBuilder />} />
          <Route path="kitchen" element={<KDS isBar={false} />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="history" element={<OrdersHistory />} />
          <Route path="cancelled-orders" element={<CancelledOrders />} />
          <Route path="reports" element={<AdminPanel module="Reports" />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
