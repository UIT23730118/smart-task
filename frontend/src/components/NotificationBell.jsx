// src/components/Notifications/NotificationBell.jsx
import React, { useState, useEffect } from 'react';
import { Badge, Popover, List, Button, Typography, Tabs, Empty } from 'antd';
import { BellOutlined, CheckCircleOutlined } from '@ant-design/icons';
import NotificationService from '../api/notification.service';

const { Text } = Typography;

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    // const navigate = useNavigate();

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await NotificationService.getNotifications();
            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.isRead).length);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Tự động check mỗi 1 phút
        return () => clearInterval(interval);
    }, []);

    const handleMarkAsRead = async (id) => {
        try {
            await NotificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error(error);
        }
    };

    // Component render danh sách (tái sử dụng cho các Tab)
    const NotificationList = ({ data }) => {
        if (data.length === 0) return <Empty description="No Notification" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

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
                                    title="Mark as read"
                                />
                            )
                        ]}
                        style={{
                            background: item.isRead ? '#fff' : '#e6f7ff', // Xanh nhạt nếu chưa đọc
                            padding: '10px 15px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0'
                        }}
                    >
                        <List.Item.Meta
                            title={
                                <Text style={{ fontSize: '13px', fontWeight: item.isRead ? 'normal' : 'bold' }}>
                                    {item.message}
                                </Text>
                            }
                            description={
                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                    {new Date(item.createdAt).toLocaleString('en-US')}
                                </Text>
                            }
                        />
                    </List.Item>
                )}
                style={{ maxHeight: 400, overflowY: 'auto' }}
            />
        );
    };

    // Nội dung Tabs
    const popoverContent = (
        <div style={{ width: 350 }}>
            <Tabs defaultActiveKey="1" centered>
                <Tabs.TabPane tab={`Unread (${unreadCount})`} key="1">
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
            overlayInnerStyle={{ padding: 0 }} // Xóa padding mặc định của Popover để Tab đẹp hơn
        >
            <Badge count={unreadCount} overflowCount={99} size="small">
                <BellOutlined style={{ fontSize: '20px', color: 'var(--text-color)', cursor: 'pointer' }} />
            </Badge>
        </Popover>
    );
};

export default NotificationBell;