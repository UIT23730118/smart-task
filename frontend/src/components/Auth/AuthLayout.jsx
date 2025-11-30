import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaTasks } from 'react-icons/fa';

// `children` will be SigninForm or SignupForm
const AuthLayout = ({ children, isLogin = true }) => {
    return (
        <div className="auth-wrapper">
            <div className="auth-container">

                {/* Logo Section */}
                <div className="auth-logo-section">
                    <FaTasks size={32} className="text-primary" />
                    <h2 className="logo-text mt-2">SmartTask</h2>
                    <p className="tagline">Your intelligent project management</p>
                </div>

                {/* Tabs (Login/Register) */}
                <div className="auth-tabs">
                    <NavLink to="/" className="auth-tab-item">
                        <button className={isLogin ? 'active' : ''}>
                            Login
                        </button>
                    </NavLink>
                    <NavLink to="/register" className="auth-tab-item">
                        <button className={!isLogin ? 'active' : ''}>
                            Register
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
