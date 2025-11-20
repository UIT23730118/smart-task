// /src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardService from '../api/dashboard.service';
import { FaTasks, FaSpinner, FaExclamationCircle, FaChartBar } from 'react-icons/fa';

// Import thư viện Gantt
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';

const Dashboard = () => {
	const { user } = useAuth();
	const [stats, setStats] = useState({ totalTasks: 0, inProgressTasks: 0, overdueTasks: 0 });
	const [ganttTasks, setGanttTasks] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadData = async () => {
			setLoading(true);
			try {
				const statsRes = await DashboardService.getDashboardStats();
				setStats(statsRes.data);

				const ganttRes = await DashboardService.getGanttTasks();
				// Chuyển đổi chuỗi ngày thành Date object (API trả về string JSON)
				const formattedTasks = ganttRes.data.map((t) => ({
					...t,
					start: new Date(t.start),
					end: new Date(t.end),
				}));
				setGanttTasks(formattedTasks);
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		};
		loadData();
	}, []);

	return (
		<>
			<div className="page-header">
				<h1>Dashboard</h1>
				<p>Welcome back, {user.name}! Overview of your work.</p>
			</div>

			{/* 1. Stats Grid */}
			<div className="dashboard-stats-grid">
				<div className="stat-card">
					<div className="icon-wrapper" style={{ color: '#007bff' }}>
						<FaTasks />
					</div>
					<div>
						<div className="stat-value">{stats.totalTasks}</div>
						<div className="stat-label">Total Tasks</div>
					</div>
				</div>
				<div className="stat-card">
					<div className="icon-wrapper" style={{ color: '#ffc107' }}>
						<FaSpinner />
					</div>
					<div>
						<div className="stat-value">{stats.inProgressTasks}</div>
						<div className="stat-label">In Progress</div>
					</div>
				</div>
				<div className="stat-card">
					<div className="icon-wrapper" style={{ color: '#dc3545' }}>
						<FaExclamationCircle />
					</div>
					<div>
						<div className="stat-value">{stats.overdueTasks}</div>
						<div className="stat-label">Overdue</div>
					</div>
				</div>
			</div>

			{/* 2. Gantt Chart Section */}
			<div
				style={{
					marginTop: '30px',
					background: 'white',
					padding: '20px',
					borderRadius: '8px',
					boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
					<FaChartBar size={20} color="#007bff" />
					<h3 style={{ margin: 0 }}>Work Timeline (Gantt Chart)</h3>
				</div>

				{loading ? (
					<p>Loading chart...</p>
				) : ganttTasks.length > 0 ? (
					<div style={{ overflowX: 'auto' }}>
						<Gantt
							tasks={ganttTasks}
							viewMode={ViewMode.Day} // Xem theo ngày
							columnWidth={60}
							listCellWidth="155px"
							barBackgroundColor="#007bff"
							barProgressColor="#0056b3"
							labelColor="#333"
							fontSize="12px"
							barFill={60}
						/>
					</div>
				) : (
					<div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
						<p>Chưa có task nào để hiển thị biểu đồ.</p>
					</div>
				)}
			</div>
		</>
	);
};

export default Dashboard;
