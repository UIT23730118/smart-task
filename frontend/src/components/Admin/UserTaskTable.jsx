import { Table, Tag, Progress } from 'antd';

const UserTaskTable = ({ tasks }) => {

    const columns = [
        {
            title: 'Task',
            dataIndex: 'title',
            key: 'title',
            render: (text) => <b>{text}</b>
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
                <Progress percent={progress || 0} size="small" />
            )
        },
        {
            title: 'Deadline',
            dataIndex: 'dueDate',
            key: 'dueDate',
            render: (date) =>
                date ? new Date(date).toLocaleDateString() : '-'
        }
    ];

    return (
        <Table
            columns={columns}
            dataSource={tasks}
            pagination={false}
            size="small"
            rowKey="taskId"
        />
    );
};

export default UserTaskTable;
