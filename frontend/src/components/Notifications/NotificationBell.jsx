// src/components/Notifications/NotificationBell.jsx
import React, { useState, useEffect } from 'react';
import { Badge, Popover, List, Button, Typography, Tabs, Empty } from 'antd';
import { BellOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios'; // <--- Chỉ cần import axios trực tiếp

const { Text } = Typography;

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    // --- CẤU HÌNH API TRỰC TIẾP TẠI ĐÂY ---
    const API_URL = "http://localhost:8080/api/notifications";

    // Hàm lấy Header chứa Token xác thực
    const getAuthHeader = () => {
        const user = JSON.parse(localStorage.getItem("user"));
        return user && user.accessToken ? { "Authorization": "Bearer " + user.accessToken } : {};
    };

    // 1. Hàm gọi API lấy danh sách
    const fetchNotifications = async () => {
        setLoading(true);
        try {
            // Gọi trực tiếp bằng axios thay vì qua Service
            const res = await axios.get(API_URL, { headers: getAuthHeader() });

            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.isRead).length);
        } catch (error) {
            console.error("Lỗi lấy thông báo:", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Hàm gọi API đánh dấu đã đọc
    const handleMarkAsRead = async (id) => {
        try {
            await axios.put(`${API_URL}/${id}/read`, {}, { headers: getAuthHeader() });

            // Cập nhật giao diện ngay lập tức
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Lỗi đánh dấu đã đọc:", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Tự động check tin mới mỗi 60 giây
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // --- PHẦN GIAO DIỆN GIỮ NGUYÊN NHƯ CŨ ---
    const NotificationList = ({ data }) => {
        if (data.length === 0) return <Empty description="No new notifications" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

        return (
            <List
                dataSource={data}
                renderItem={item => (
                    <List.Item
                        actions={[
                            !item.isRead && (
                                <Button
                                    type="text"
                                    icon={<CheckCircleOutlined />}
                                    onClick={() => handleMarkAsRead(item.id)}
                                    title="Đánh dấu đã đọc"
                                />
                            )
                        ]}
                        style={{
                            background: item.isRead ? '#fff' : '#e6f7ff',
                            padding: '10px 15px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0'
                        }}
                    >
                        <List.Item.Meta
                            title={
                                <Text style={{ fontSize: '13px', fontWeight: item.isRead ? 'normal' : 'bold' }}>
                                    {/* Hiện tên Task nếu có */}
                                    {item.task ? `[${item.task.title}] ` : ''}
                                    {item.message}
                                </Text>
                            }
                            description={
                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                                </Text>
                            }
                        />
                    </List.Item>
                )}
                style={{ maxHeight: 400, overflowY: 'auto' }}
            />
        );
    };

    const popoverContent = (
        <div style={{ width: 350 }}>
            <Tabs defaultActiveKey="1" centered>
                <Tabs.TabPane tab={`Not read (${unreadCount})`} key="1">
                    <NotificationList data={notifications.filter(n => !n.isRead)} />
                </Tabs.TabPane>
                <Tabs.TabPane tab="All" key="2">
                    <NotificationList data={notifications} />
                </Tabs.TabPane>
            </Tabs>
        </div>
    );

    return (
        <Popover
            content={popoverContent}
            trigger="click"
            placement="bottomRight"
            overlayInnerStyle={{ padding: 0 }}
        >
            <Badge count={unreadCount} overflowCount={99} size="small">
                {/* Đổi màu icon thành đen để dễ nhìn nếu chưa có biến CSS */}
                <BellOutlined style={{ fontSize: '20px', color: '#000', cursor: 'pointer' }} />
            </Badge>
        </Popover>
    );
};

export default NotificationBell;