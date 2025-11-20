// /src/context/AuthContext.js
import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // Lấy user từ localStorage nếu có
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

    // Hàm login (sẽ được gọi sau khi API thành công)
    const login = (userData) => {
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    // Hàm logout
    const logout = () => {
        localStorage.removeItem('user');
        setUser(null);
    };

    const value = {
        user,
        login,
        logout,
        isAuthenticated: user ? true : false,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook tiện lợi
export const useAuth = () => {
    return useContext(AuthContext);
};