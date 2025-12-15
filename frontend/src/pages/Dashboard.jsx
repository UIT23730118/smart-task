// /src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
// 💡 Đảm bảo bạn đã đổi tên hàm gọi trong service (ví dụ: dashboard.service.js)
import DashboardService from '../api/dashboard.service'; 

// Ant Design & Icons
import { Typography, Row, Col, Card, Statistic, Spin, Empty, Segmented } from 'antd';
import {
    ProjectOutlined, BarChartOutlined, PieChartOutlined,
    SyncOutlined, WarningOutlined, LockOutlined 
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
    
    // 💡 STATE: Danh sách Project duy nhất và thành viên liên quan
    const [uniqueProjects, setUniqueProjects] = useState([]); 

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
                    // 💡 GỌI API MỚI đã được thiết lập ở Backend để lấy member IDs
                    DashboardService.getGanttTasksWithMembers() 
                ]);

                setStats(statsRes.data);

                // 💡 LẤY DỮ LIỆU TỪ CẤU TRÚC RESPONSE MỚI
                const rawTasks = ganttRes.data.ganttTasks || [];
                // Danh sách Project kèm memberIds (Chính xác là `projects` từ Backend)
                const projectsList = ganttRes.data.projects || []; 
                console.log("ganttRes {}", ganttRes.data);

                if (rawTasks.length > 0) {
                    
                    const formattedGantt = rawTasks.map(t => ({
                        // Spread các thuộc tính đã được format từ Backend
                        ...t,
                        // Cấu hình lại các trường cho thư viện Gantt
                        id: String(t.id),
                        name: `[${t.project}] ${t.name}`, // Gộp tên Project vào tên Task
                        start: new Date(t.start),
                        end: new Date(t.end),
                        // progress đã được Backend chuẩn hóa thành 0-1, 
                        // nhưng nếu Backend trả về 0-100, cần chia cho 100 ở đây.
                        // Giả định Backend đã chuẩn hóa về 0-1 (như trong controller đã thiết lập)
                        progress: t.progress, 
                        type: 'task', // Đặt type mặc định là 'task'
                    }));
                    
                    setGanttTasks(formattedGantt);
                    // 💡 CẬP NHẬT: uniqueProjects đã có memberIds chính xác
                    setUniqueProjects(projectsList); 

                    // 2. Generate chart data from task list
                    processCharts(formattedGantt, statsRes.data);
                } else {
                    setGanttTasks([]);
                    setUniqueProjects([]);
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
    }, [user.id]); // Thêm user.id vào dependency nếu getStats/getGanttTasks phụ thuộc vào user đang đăng nhập

    // Generate data for charts
    const processCharts = (tasks) => {
        // --- Pie Chart (Status Distribution) ---
        const statusCount = {};
        tasks.forEach(t => {
            // Lưu ý: t.status là tên status (string) từ Backend
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
            const pName = t.project || 'No Project'; // t.project là tên project
            projCount[pName] = (projCount[pName] || 0) + 1;
        });

        const barData = Object.keys(projCount).map(k => ({
            name: k,
            tasks: projCount[k]
        }));
        setProjectChartData(barData);
    };

    // 💡 HÀM KIỂM TRA QUYỀN XEM
    const canViewProject = (project) => {
        // 1. Kiểm tra quyền Leader (Leader có thể xem tất cả)
        const isLeader = user && user.role === 'leader'; 

        // 2. Kiểm tra quyền Thành viên
        // project là object từ uniqueProjects { name: "...", memberIds: [...] }
        const memberIds = project.memberIds || []; 
        const isMember = user && user.id && memberIds.includes(user.id);

        return isLeader || isMember;
    };


    if (loading) return (
        <div style={{ height: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Spin size="large" tip="Loading data..." />
        </div>
    );
    
    // Tăng chiều rộng cột tên Task để hiển thị tên Project đã gộp
    const listWidth = "350px"; 

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
            {ganttTasks.length > 0 && (
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
            )}

            {/* 3. Gantt Charts Section (Chia theo Project và Phân quyền) */}
            {ganttTasks.length > 0 ? (
                <>
                    <Title level={3} style={{ marginTop: '40px' }}><ProjectOutlined /> Project Timelines</Title>
                    
                    {/* Segmented cho tất cả các Chart */}
                    <Segmented
                        options={[
                            { label: 'Day', value: ViewMode.Day },
                            { label: 'Week', value: ViewMode.Week },
                            { label: 'Month', value: ViewMode.Month }
                        ]}
                        value={ganttView}
                        onChange={setGanttView}
                        style={{ marginBottom: '16px' }}
                    />

                    {/* LẶP QUA TỪNG PROJECT VÀ ÁP DỤNG PHÂN QUYỀN */}
                    {uniqueProjects.map((project) => {
                        const canView = canViewProject(project);
                        // Lọc tasks chỉ thuộc về project này
                        const projectTasks = ganttTasks.filter(t => t.project === project.name); 
                        
                        // Chỉ render Card nếu có Task thuộc Project này (dù có thể bị khóa)
                        if (projectTasks.length === 0) return null;

                        return (
                            <Card
                                key={project.name}
                                style={{ marginTop: '24px', borderLeft: '5px solid #1890ff' }}
                                title={<Title level={4} style={{ margin: 0 }}>Project: {project.name}</Title>}
                                bordered={true}
                            >
                                {canView ? (
                                    <div style={{ overflowX: 'auto' }}>
                                        <Gantt
                                            tasks={projectTasks} // Dữ liệu đã lọc
                                            viewMode={ganttView}
                                            columnWidth={ganttView === ViewMode.Month ? 300 : 65}
                                            listCellWidth={listWidth} // Sử dụng chiều rộng đã tăng
                                            
                                            barBackgroundColor="#1890ff"
                                            barProgressColor="#096dd9"
                                            labelColor="#333"
                                            fontSize="12px"
                                            barFill={60}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#ff4d4f', border: '1px dashed #ffccc7' }}>
                                        <LockOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                                        <Text strong type="danger">Access Denied</Text><br />
                                        <Text type="secondary">Bạn không phải là thành viên hoặc quản trị viên của dự án này để xem tiến độ.</Text>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
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