// /src/components/Layout/MainLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

const MainLayout = () => {
    return (
        <div>
            <Header />
            <main className="main-content">
                <div className="container">
                    <Outlet /> {/* Đây là nơi nội dung trang con (Dashboard, ...) sẽ hiển thị */}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;