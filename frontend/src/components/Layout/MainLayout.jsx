import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layout, Menu, Breadcrumb, theme, Button, Dropdown, Space, Avatar } from 'antd';
import {
    DesktopOutlined,
    PieChartOutlined,
    TeamOutlined,
    FileOutlined,
    LogoutOutlined,
    UserOutlined,
    // SunOutlined, MoonOutlined (không dùng, nên bỏ)
    BarChartOutlined, // 💡 IMPORT ICON MỚI CHO WORKLOAD
} from '@ant-design/icons';
import NotificationBell from '../Notifications/NotificationBell';

const { Header, Content, Footer, Sider } = Layout;

function getItem(label, key, icon, children) {
    return { key, icon, children, label };
}

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const navigate = useNavigate();
    const location = useLocation();

    // --- GET AUTH CONTEXT ---
    const { user, logout } = useAuth();
    // 💡 BỔ SUNG: Kiểm tra quyền
    const isLeader = user?.role === 'leader';
    // -------------------------

    // --- LOGOUT HANDLER ---
    const handleLogout = () => {
        logout(); // Clear token & user state
        navigate('/login'); // Redirect to login page
    };

    // 💡 BỔ SUNG: Xây dựng menu items dựa trên quyền
    const items = [
        getItem('Dashboard', '/dashboard', <PieChartOutlined />),
        getItem('Projects', '/projects', <DesktopOutlined />),
        getItem('Team', '/team', <TeamOutlined />),
        getItem('Documents', '/docs', <FileOutlined />),
    ];

    if (isLeader) {
        // Thêm mục Global Workload chỉ khi người dùng là Leader
        items.push(
            getItem('Global Workload', '/workload-summary', <BarChartOutlined />)
        );
    }
    // --------------------------------------------------

    // User dropdown menu
    const userMenuItems = [
        getItem(<Space>{user?.name || 'User'}</Space>, 'profile', <UserOutlined />),
        {
            key: 'divider',
            type: 'divider',
        },
        getItem(
            <span onClick={handleLogout} style={{ color: 'red' }}>
                Logout
            </span>,
            'logout',
            <LogoutOutlined style={{ color: 'red' }} />
        ),
    ];

    // Basic breadcrumb logic (static demo)
    const breadcrumbItems = location.pathname
        .split('/')
        .filter(i => i)
        .map((segment, index, array) => ({
            title: segment.charAt(0).toUpperCase() + segment.slice(1),
            href: array.slice(0, index + 1).join('/') || '/',
        }));

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider collapsible collapsed={collapsed} onCollapse={value => setCollapsed(value)}>
                <div
                    className="demo-logo-vertical"
                    style={{
                        height: 32,
                        margin: 16,
                        background: 'rgba(255, 255, 255, 0.2)',
                    }}
                />
                <Menu
                    theme="dark"
                    defaultSelectedKeys={[location.pathname]}
                    mode="inline"
                    items={items} // 💡 SỬ DỤNG MẢNG ITEMS ĐÃ CẬP NHẬT
                    onClick={({ key }) => navigate(key)}
                />
            </Sider>

            <Layout>
                <Header
                    style={{
                        padding: '0 24px 0 0',
                        background: colorBgContainer,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: '10px',
                    }}
                >
                    <NotificationBell />
                    {/* --- USER INFO & LOGOUT --- */}
                    <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
                        <a onClick={e => e.preventDefault()}>
                            <Space>
                                <Avatar
                                    size="small"
                                    icon={<UserOutlined />}
                                    style={{ backgroundColor: '#1890ff' }}
                                />
                                <span style={{ fontWeight: 'bold' }}>{user?.name || 'User'}</span>
                            </Space>
                        </a>
                    </Dropdown>
                    {/* -------------------------------------- */}
                </Header>

                <Content style={{ margin: '0 16px' }}>

                    <div
                        style={{
                            padding: 24,
                            minHeight: 360,
                            background: colorBgContainer,
                            borderRadius: borderRadiusLG,
                        }}
                    >
                        <Outlet />
                    </div>
                </Content>

                <Footer style={{ textAlign: 'center' }}>
                    Smart Task Manager ©{new Date().getFullYear()} Created by UIT23730118 & UIT23730110 Using Ant Design
                </Footer>
            </Layout>
        </Layout>
    );
};

export default MainLayout;