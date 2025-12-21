// /components/Project/TaskListView.jsx

import React from "react";
// Cần cài: npm install react-icons
import { FaBug, FaCheckSquare, FaBookmark, FaBolt } from "react-icons/fa";
// Import các component Ant Design cần thiết
import { Table, Tag, Avatar, Tooltip } from "antd";
import { UserOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';

const TaskListView = ({ tasks, onTaskClick, statuses }) => {

  // Helper chọn icon theo Type (GIỮ NGUYÊN)
  const getTypeIcon = (typeId) => {
    switch (typeId) {
      case 2: return <FaBug color="#dc3545" title="Bug" />;
      case 3: return <FaBookmark color="#28a745" title="Story" />;
      case 4: return <FaBolt color="#ffc107" title="Epic" />;
      default: return <FaCheckSquare color="#4bade8" title="Task" />;
    }
  };

  // Helper màu Priority (GIỮ NGUYÊN)
  const getPriorityColor = (p) => {
    switch (p) {
      case "Critical": return "red";
      case "Major":
      case "High": return "orange";
      case "Medium": return "gold";
      default: return "default";
    }
  };

  // Helper màu Status tag
  const getStatusTagColor = (statusName) => {
    if (!statusName) return "default";
    const name = statusName.toLowerCase();
    if (name.includes("done") || name.includes("closed") || name.includes("resolved")) return "success";
    if (name.includes("in progress") || name.includes("developing")) return "processing";
    if (name.includes("todo") || name.includes("open")) return "default";
    return "warning";
  };

  // Helper màu cho Slack (Độ trễ)
  const getSlackColor = (slack) => {
    if (slack === 0 || slack === undefined) return "red"; // Critical
    if (slack <= 2) return "orange"; // Nguy hiểm
    return "green"; // An toàn
  };

  const getRequiredSkillsTags = (requiredSkills) => {
    if (!requiredSkills) return [];
    return String(requiredSkills).split(/[\s,]+/).map(s => s.trim()).filter(s => s.length > 0);
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
      width: 70,
      render: (id) => <span style={{ color: "#007bff", fontWeight: 500 }}>#{id}</span>,
    },
    {
      title: 'Summary',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
      sorter: (a, b) => a.title.localeCompare(b.title),
      render: (text, record) => (
        <Tooltip title={text}>
          <span style={{ fontWeight: record.isCritical ? 'bold' : 'normal' }}>{text}</span>
        </Tooltip>
      )
    },
    // 🔥 CỘT MỚI: DEPENDENCIES (Task phụ thuộc)
    {
      title: 'Prev Task',
      key: 'deps',
      width: 100,
      render: (_, record) => (
        <div>
          {record.Predecessors && record.Predecessors.length > 0 ? (
            record.Predecessors.map(p => (
              <Tag key={p.id} color="geekblue" style={{ marginRight: 2 }}>#{p.id}</Tag>
            ))
          ) : (
            <span style={{ color: '#ccc', fontSize: '11px' }}>—</span>
          )}
        </div>
      )
    },
    // 🔥 CỘT MỚI: CPM INFO (ES/EF/LS/LF)
    {
      title: 'CPM (Days)',
      key: 'cpm',
      width: 160,
      render: (_, record) => (
        <div style={{ fontSize: '11px', lineHeight: '1.4', fontFamily: 'monospace' }}>
          <div style={{ color: '#1890ff' }}>
            ES:{record.es ?? '?'} ➝ EF:{record.ef ?? '?'}
          </div>
          <div style={{ color: '#722ed1' }}>
            LS:{record.ls ?? '?'} ➝ LF:{record.lf ?? '?'}
          </div>
        </div>
      )
    },
    // 🔥 CỘT MỚI: SLACK (Độ trễ cho phép)
    {
      title: 'Slack',
      dataIndex: 'slack',
      key: 'slack',
      width: 90,
      align: 'center',
      render: (slack, record) => (
        <Tag color={getSlackColor(record.isCritical ? 0 : slack)}>
          {record.isCritical ? "CRITICAL" : `${slack}d`}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'statusId',
      key: 'statusId',
      width: 100,
      render: (statusId) => {
        const statusObject = statuses?.find(s => s.id === statusId);
        const statusName = statusObject ? statusObject.name : "Unknown";
        return <Tag color={getStatusTagColor(statusName)}>{statusName.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (priority) => <Tag color={getPriorityColor(priority)}>{priority}</Tag>,
    },
    {
      title: 'Assignee',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 130,
      render: (assignee) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {assignee ? (
            <>
              <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>{assignee.name.charAt(0).toUpperCase()}</Avatar>
              <span style={{ fontSize: '12px' }}>{assignee.name}</span>
            </>
          ) : (
            <span style={{ color: "#999", fontStyle: "italic", fontSize: '12px' }}>Unassigned</span>
          )}
        </div>
      ),
    },
  ];

  // --- ANT DESIGN TABLE RENDER ---
  return (
    <Table
      rowKey="id"
      dataSource={tasks}
      columns={columns}
      pagination={false}
      locale={{ emptyText: "No tasks found." }}

      // 🔥 Xử lý highlight dòng CRITICAL
      rowClassName={(record) => record.isCritical ? "critical-row-highlight" : ""}

      onRow={(record) => ({
        onClick: () => onTaskClick(record),
        style: { cursor: 'pointer' },
      })}
      style={{ border: '1px solid #ddd', borderRadius: '4px' }}
      size="small"
      scroll={{ x: 'max-content' }}
    />
  );
};

export default TaskListView;