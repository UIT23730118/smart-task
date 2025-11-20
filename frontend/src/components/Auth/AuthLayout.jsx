// /src/components/Auth/AuthLayout.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaTasks } from 'react-icons/fa';

// `children` sẽ là SigninForm hoặc SignupForm
const AuthLayout = ({ children, isLogin = true }) => {
    return (
        <div className="auth-wrapper">
            <div className="auth-container">

                {/* Logo Section */}
                <div className="auth-logo-section">
                    <FaTasks size={32} className="text-primary" />
                    <h2 className="logo-text mt-2">SmartTask</h2>
                    <p className="tagline">Quản lý dự án thông minh của bạn</p>
                </div>

                {/* Tabs (Login/Register) */}
                <div className="auth-tabs">
                    <NavLink to="/" className="auth-tab-item">
                        <button className={isLogin ? 'active' : ''}>
                            Đăng nhập
                        </button>
                    </NavLink>
                    <NavLink to="/register" className="auth-tab-item">
                        <button className={!isLogin ? 'active' : ''}>
                            Đăng ký
                        </button>
                    </NavLink>
                </div>

                {/* Form Content */}
                {children}
            </div>
        </div>
    );
};

export default AuthLayout;