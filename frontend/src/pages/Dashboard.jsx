// /src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardService from '../api/dashboard.service';

// Ant Design & Icons
import { Typography, Row, Col, Card, Statistic, Spin, Empty, Segmented } from 'antd';
import {
    CheckCircleOutlined, SyncOutlined, WarningOutlined,
    ProjectOutlined, BarChartOutlined, PieChartOutlined
} from '@ant-design/icons';

// Recharts
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Gantt
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';

const { Title, Text } = Typography;
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ totalTasks: 0, inProgressTasks: 0, overdueTasks: 0 });
    const [ganttTasks, setGanttTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ganttView, setGanttView] = useState(ViewMode.Day);

    // Chart data
    const [projectChartData, setProjectChartData] = useState([]);
    const [statusChartData, setStatusChartData] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch dashboard data
                const [statsRes, ganttRes] = await Promise.all([
                    DashboardService.getDashboardStats(),
                    DashboardService.getGanttTasks()
                ]);

                setStats(statsRes.data);

                const rawTasks = ganttRes.data;
                if (rawTasks && rawTasks.length > 0) {
                    // 1. Format date values for Gantt chart
                    const formattedGantt = rawTasks.map(t => ({
                        ...t,
                        start: new Date(t.start),
                        end: new Date(t.end),
                    }));
                    setGanttTasks(formattedGantt);

                    // 2. Generate chart data from task list
                    processCharts(formattedGantt, statsRes.data);
                } else {
                    setGanttTasks([]);
                    setProjectChartData([]);
                    setStatusChartData([]);
                }

            } catch (err) {
                console.error("Dashboard Error:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Generate data for charts
    const processCharts = (tasks) => {
        // --- Pie Chart (Status Distribution) ---
        const statusCount = {};
        tasks.forEach(t => {
            const sName = t.status || 'Unknown';
            statusCount[sName] = (statusCount[sName] || 0) + 1;
        });

        const pieData = Object.keys(statusCount).map(key => ({
            name: key,
            value: statusCount[key]
        }));
        setStatusChartData(pieData);

        // --- Bar Chart (Tasks by Project) ---
        const projCount = {};
        tasks.forEach(t => {
            const pName = t.project || 'No Project';
            projCount[pName] = (projCount[pName] || 0) + 1;
        });

        const barData = Object.keys(projCount).map(k => ({
            name: k,
            tasks: projCount[k]
        }));
        setProjectChartData(barData);
    };

    if (loading) return (
        <div style={{ height: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Spin size="large" tip="Loading data..." />
        </div>
    );

    return (
        <div style={{ padding: '0 20px 40px 20px' }}>

            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <Title level={2} style={{ marginBottom: 0 }}>Dashboard Overview</Title>
                <Text type="secondary">Hello, {user.name}! Here is your real-time activity summary.</Text>
            </div>

            {/* 1. Statistics Cards */}
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                    <Card bordered={false} className="shadow-sm" hoverable>
                        <Statistic
                            title="Total Tasks" value={stats.totalTasks}
                            prefix={<ProjectOutlined />} valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card bordered={false} className="shadow-sm" hoverable>
                        <Statistic
                            title="In Progress" value={stats.inProgressTasks}
                            prefix={<SyncOutlined spin />} valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card bordered={false} className="shadow-sm" hoverable>
                        <Statistic
                            title="Overdue" value={stats.overdueTasks}
                            prefix={<WarningOutlined />} valueStyle={{ color: '#ff4d4f' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 2. Charts Section */}
            {ganttTasks.length > 0 ? (
                <>
                    <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
                        {/* Bar Chart */}
                        <Col xs={24} lg={16}>
                            <Card title={<span><BarChartOutlined /> Tasks by Project</span>} bordered={false}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={projectChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="tasks" name="Total Tasks" fill="#8884d8">
                                            {projectChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>

                        {/* Pie Chart */}
                        <Col xs={24} lg={8}>
                            <Card title={<span><PieChartOutlined /> Status Distribution</span>} bordered={false}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={statusChartData} cx="50%" cy="50%"
                                            innerRadius={60} outerRadius={80}
                                            paddingAngle={5} dataKey="value" label
                                        >
                                            {statusChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>
                    </Row>

                    {/* 3. Gantt Chart */}
                    <Card
                        style={{ marginTop: '24px' }}
                        title="Gantt Chart (Project Timeline)"
                        bordered={false}
                        extra={
                            <Segmented
                                options={[
                                    { label: 'Day', value: ViewMode.Day },
                                    { label: 'Week', value: ViewMode.Week },
                                    { label: 'Month', value: ViewMode.Month }
                                ]}
                                value={ganttView}
                                onChange={setGanttView}
                            />
                        }
                    >
                        <div style={{ overflowX: 'auto' }}>
                            <Gantt
                                tasks={ganttTasks}
                                viewMode={ganttView}
                                columnWidth={ganttView === ViewMode.Month ? 300 : 65}
                                listCellWidth="180px"
                                barBackgroundColor="#1890ff"
                                barProgressColor="#096dd9"
                                labelColor="#333"
                                fontSize="12px"
                                barFill={60}
                            />
                        </div>
                    </Card>
                </>
            ) : (
                <Empty
                    description="No tasks available. Create a project and tasks to view analytics."
                    style={{ marginTop: '50px' }}
                />
            )}
        </div>
    );
};

export default Dashboard;
