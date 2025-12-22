import React, { useState, useEffect } from 'react';
import { Table, Tag, Progress, Alert } from 'antd';
import UserService from '../../api/user.service';
import UserTaskTable from './UserTaskTable';

const GlobalWorkloadSummary = () => {
    const [summaryData, setSummaryData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await UserService.getGlobalWorkloadSummary();
                setSummaryData(response.data);
            } catch (err) {
                console.error("Failed to fetch global workload summary:", err);
                const errorMessage = err.response?.data?.message || err.message;
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getAssessmentColor = (assessment) => {
        switch (assessment) {
            case 'Highly Overloaded': return 'red';
            case 'Overloaded': return 'volcano';
            case 'Optimal': return 'green';
            case 'Underutilized': return 'blue';
            default: return 'default';
        }
    };

    const columns = [
        {
            title: 'Member',
            dataIndex: 'name',
            key: 'name',
            fixed: 'left',
            width: 150
        },
        {
            title: 'KPI: User Score',
            dataIndex: 'userScore',
            key: 'userScore',
            width: 110,
            sorter: (a, b) => a.userScore - b.userScore,
            render: (score) => (
                <Tag color={score >= 1.2 ? 'green' : (score < 1.0 ? 'red' : 'blue')}>
                    {score.toFixed(2)}x
                </Tag>
            )
        },
        {
            title: 'Tasks Done',
            dataIndex: 'totalTasksDone',
            key: 'totalTasksDone',
            width: 100,
            sorter: (a, b) => a.totalTasksDone - b.totalTasksDone,
            render: (count) => <Tag color="success">{count}</Tag>
        },
        {
            title: 'Total Projects',
            dataIndex: 'totalProjectsInvolved',
            key: 'totalProjectsInvolved',
            width: 100,
            sorter: (a, b) => a.totalProjectsInvolved - b.totalProjectsInvolved,
        },
        {
            title: 'Tasks Pending',
            dataIndex: 'globalTasksCount',
            key: 'globalTasksCount',
            width: 100,
            sorter: (a, b) => a.globalTasksCount - b.globalTasksCount,
        },
        {
            title: 'Adjusted Workload (Pts)',
            dataIndex: 'globalWorkload',
            key: 'globalWorkload',
            width: 150,
            sorter: (a, b) => a.globalWorkload - b.globalWorkload,
            render: (points) => <b>{points.toFixed(2)} Pts</b>
        },
        {
            title: 'KPI: Workload Assessment',
            dataIndex: 'workloadAssessment',
            key: 'workloadAssessment',
            width: 160,
            render: (assessment) => (
                <Tag color={getAssessmentColor(assessment)}>{assessment}</Tag>
            )
        },
        {
            title: 'W. Balance Index',
            dataIndex: 'workloadBalanceIndex',
            key: 'workloadBalanceIndex',
            width: 140,
            render: (index) => {
                const percentage = Math.min(150, index * 100);
                let status = 'normal';
                if (index > 1.5) status = 'exception';
                else if (index > 1.0) status = 'active';

                return (
                    <Progress
                        percent={percentage}
                        size="small"
                        status={status}
                        format={() => `${index.toFixed(2)}`}
                    />
                );
            }
        },
    ];

    return (
        <div style={{ padding: '24px 0' }}>
            {error && (
                <Alert
                    message="API Error"
                    description={`Error fetching workload data: ${error}. Check authentication and role.`}
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            <Alert
                // 💡 Cập nhật mô tả công thức
                message="KPI Metrics: (Task Weight × Project Factor × Time Urgency Factor) / User Score. Time Urgency dramatically increases Workload points for tasks with near deadlines."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <Table
                columns={columns}
                dataSource={summaryData}
                loading={loading}
                pagination={false}
                scroll={{ x: 1000 }}
                size="middle"
                expandable={{
                    expandedRowRender: (record) => {
                        if (!record.currentTasks || record.currentTasks.length === 0) {
                            return <i>No active tasks</i>;
                        }
                        return <UserTaskTable tasks={record.currentTasks} />;
                    },
                    rowExpandable: (record) =>
                        record.currentTasks && record.currentTasks.length > 0
                }}
            />
        </div>
    );
};

export default GlobalWorkloadSummary;