import React from 'react';
import { Card, Typography, Space, Alert } from 'antd';
import { FaChartBar } from 'react-icons/fa'; 
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Import the table component
import GlobalWorkloadSummary from '../../components/Admin/GlobalWorkloadSummary'; 

const { Title } = Typography;

const GlobalWorkloadPage = () => {
    // 1. Get user context and navigation function
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    
    // 2. Role Check
    const isLeader = user?.role === 'leader';
    
    // Display loading state while user data is fetched
    if (loading) {
        return <Alert message="Loading user data..." type="info" showIcon />;
    }
    
    // 3. Handle Access Denial (Not a Leader)
    if (!isLeader) {
        return (
            <Space direction="vertical" size="large" style={{ display: 'flex', padding: '24px', width: '100%' }}>
                <Title level={2}>🚫 Access Denied</Title>
                <Alert
                    message="Access Denied"
                    description="You do not have permission to view the Global Workload Summary page. Only Leaders are allowed."
                    type="error"
                    showIcon
                    action={
                        <a onClick={() => navigate('/dashboard')} style={{ color: '#c20000' }}>
                           Go to Dashboard
                        </a>
                    }
                />
            </Space>
        );
    }

    // 4. Page Content (Rendered only if the user is a Leader)
    // NOTE: This component is wrapped by <MainLayout /> in App.js, 
    // so we only return the content here (no duplicate <MainLayout> tag).
    return (
        <Space direction="vertical" size="large" style={{ display: 'flex', width: '100%' }}>
            <Title level={2} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaChartBar /> Global Workload Management
            </Title>
            
            <Card 
                title="🌍 Pending Global Workload Summary Table" 
                bordered={true}
                style={{ width: '100%' }}
                // Remove padding from card body for a cleaner table display
                bodyStyle={{ padding: 0 }} 
            >
                {/* The main table component */}
                <GlobalWorkloadSummary />
            </Card>
        </Space>
    );
};

export default GlobalWorkloadPage;