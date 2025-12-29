import { Tabs, Table, Tag, Progress, Empty } from 'antd';
import dayjs from 'dayjs';

const isOverdue = (task) => {
    if (!task.dueDate) return false;
    if (['Done', 'Completed', 'Closed'].includes(task.status?.name)) return false;
    return dayjs(task.dueDate).isBefore(dayjs(), 'day');
};

const TaskTable = ({ tasks }) => {

    if (!tasks || tasks.length === 0) {
        return <Empty description="No tasks" />;
    }

    const columns = [
        {
            title: 'Task',
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => (
                <>
                    <b>{text}</b>
                    {isOverdue(record) && (
                        <Tag color="red" style={{ marginLeft: 8 }}>
                            OVERDUE
                        </Tag>
                    )}
                </>
            )
        },
        {
            title: 'Project',
            dataIndex: ['project', 'name'],
            key: 'project'
        },
        {
            title: 'Status',
            dataIndex: ['status', 'name'],
            key: 'status',
            render: (text, record) => (
                <Tag color={record.status?.color || 'default'}>
                    {text}
                </Tag>
            )
        },
        {
            title: 'Progress',
            dataIndex: 'progress',
            key: 'progress',
            width: 140,
            render: (progress) => (
                <Progress
                    percent={progress || 0}
                    size="small"
                    status={progress === 100 ? 'success' : 'active'}
                />
            )
        },
        {
            title: 'Deadline',
            dataIndex: 'dueDate',
            key: 'dueDate',
            render: (date) =>
                date ? dayjs(date).format('DD/MM/YYYY') : '-'
        }
    ];

    return (
        <Table
            columns={columns}
            dataSource={tasks}
            pagination={false}
            size="small"
            rowKey="taskId"
            rowClassName={(record) =>
                isOverdue(record) ? 'overdue-row' : ''
            }
        />
    );
};

const UserTaskTabs = ({ currentTasks = [], completedTasks = [] }) => {
    return (
        <Tabs
            defaultActiveKey="1"
            items={[
                {
                    key: '1',
                    label: `Pending (${currentTasks.length})`,
                    children: <TaskTable tasks={currentTasks} />
                },
                {
                    key: '2',
                    label: `Completed (${completedTasks.length})`,
                    children: <TaskTable tasks={completedTasks} />
                }
            ]}
        />
    );
};

export default UserTaskTabs;
