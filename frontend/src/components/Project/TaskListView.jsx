import React from "react";
// Cần cài: npm install react-icons
import { FaBug, FaCheckSquare, FaBookmark, FaBolt } from "react-icons/fa";
// Import các component Ant Design cần thiết
import { Table, Tag, Avatar } from "antd";
import { UserOutlined } from '@ant-design/icons';


const TaskListView = ({ tasks, onTaskClick }) => {

  // Helper chọn icon theo Type
  const getTypeIcon = (typeId) => {
    // Giả sử: 1=Task, 2=Bug, 3=Story
    switch (typeId) {
      case 2:
        return <FaBug color="#dc3545" title="Bug" />;
      case 3:
        return <FaBookmark color="#28a745" title="Story" />;
      case 4:
        return <FaBolt color="#ffc107" title="Epic" />;
      default:
        return <FaCheckSquare color="#4bade8" title="Task" />;
    }
  };

  // Helper màu Priority
  const getPriorityColor = (p) => {
    switch (p) {
      case "Critical":
        return "red";
      case "Major":
      case "High":
        return "orange";
      case "Medium":
        return "gold";
      default:
        return "default"; // Minor/Low
    }
  };

  // Helper màu Status tag
  const getStatusTagColor = (statusName) => {
    const name = statusName.toLowerCase();
    if (
      name.includes("done") ||
      name.includes("closed") ||
      name.includes("resolved")
    )
      return "success";
    if (name.includes("progress")) return "processing";
    if (name.includes("todo") || name.includes("open")) return "default";
    return "default";
  };

  // Helper để phân tích Required Skills thành mảng tags
  const getRequiredSkillsTags = (requiredSkills) => {
    if (!requiredSkills) return [];

    return String(requiredSkills)
      .split(/[\s,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  // --- CẤU HÌNH CÁC CỘT CHO ANT DESIGN TABLE ---
  const columns = [
    {
      title: 'T',
      dataIndex: 'typeId',
      key: 'typeId',
      width: 40,
      align: 'center',
      render: getTypeIcon,
    },
    {
      title: 'Key',
      dataIndex: 'id',
      key: 'key',
      width: 80,
      render: (id) => <span style={{ color: "#007bff", fontWeight: 500 }}>TSK-{id}</span>,
    },
    {
      title: 'Summary',
      dataIndex: 'title',
      key: 'title',
      // Dùng ellipsis để cắt nếu tiêu đề quá dài
      ellipsis: true,
      sorter: (a, b) => a.title.localeCompare(b.title),
    },
    {
      title: 'Status',
      dataIndex: ['status', 'name'],
      key: 'status',
      width: 120,
      render: (statusName) => (
        <Tag color={getStatusTagColor(statusName || "")}>
          {(statusName || "Unknown").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Required Skills',
      dataIndex: 'requiredSkills',
      key: 'requiredSkills',
      width: 150,
      render: (skills) => {
        const skillsArray = getRequiredSkillsTags(skills);
        const displayedSkills = skillsArray.slice(0, 2);
        const remainingCount = skillsArray.length - 2;

        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {displayedSkills.map((skill, index) => (
              <Tag key={index} color="blue">
                {skill}
              </Tag>
            ))}
            {remainingCount > 0 && <Tag>+{remainingCount}</Tag>}
          </div>
        );
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority) => (
        <Tag color={getPriorityColor(priority)}>
          {priority}
        </Tag>
      ),
    },
    {
      title: 'Assignee',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 150,
      render: (assignee) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {assignee ? (
            <>
              <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
                {assignee.name.charAt(0).toUpperCase()}
              </Avatar>
              <span>{assignee.name}</span>
            </>
          ) : (
            <span style={{ color: "#999", fontStyle: "italic" }}>Unassigned</span>
          )}
        </div>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (dueDate) => (
        dueDate
          ? new Date(dueDate).toLocaleDateString("en-US")
          : ''
      ),
    },
  ];

  // --- ANT DESIGN TABLE RENDER ---
  return (
    <Table
      // Thêm key là ID cho mỗi task để Ant Design xử lý hiệu quả
      rowKey="id"
      dataSource={tasks}
      columns={columns}
      pagination={false} // Tùy chọn: Có thể bật phân trang nếu tasks lớn
      locale={{ emptyText: "No tasks found." }}
      // Xử lý sự kiện click vào hàng
      onRow={(record) => ({
        onClick: () => onTaskClick(record),
        style: { cursor: 'pointer' },
      })}
      style={{ border: '1px solid #ddd', borderRadius: '4px' }}
      size="middle"
      // Cấu hình để Table không bị lệch khi có ít hàng
      scroll={{ x: 'max-content' }}
    />
  );
};

export default TaskListView;