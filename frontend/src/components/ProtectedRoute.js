// /src/components/ProtectedRoute.js
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

const ProtectedRoute = () => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    // Kiểm tra xem trang hiện tại có phải là trang auth không
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    if (isAuthPage) {
        // Nếu ĐÃ đăng nhập và đang ở trang Login/Register
        if (isAuthenticated) {
            // Chuyển hướng về Dashboard
            return <Navigate to="/dashboard" replace />;
        }
        // Nếu CHƯA đăng nhập và ở trang Login/Register, cho phép truy cập
        return <Outlet />;
    }

    // --- Đây là logic bảo vệ trang ---
    // Nếu CHƯA đăng nhập và KHÔNG ở trang auth
    if (!isAuthenticated) {
        // Chuyển về trang Login
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Nếu ĐÃ đăng nhập, cho phép truy cập
    return <Outlet />;
};

export default ProtectedRoute;