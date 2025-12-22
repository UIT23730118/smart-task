// /components/Project/TaskListView.jsx

import React from "react";
// Cần cài: npm install react-icons
import { FaBug, FaCheckSquare, FaBookmark, FaBolt } from "react-icons/fa";
// Import các component Ant Design cần thiết
import { Table, Tag, Avatar, Tooltip } from "antd";
import { UserOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';

const useSystemDarkMode = () => {
  const [isDark, setIsDark] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const matcher = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setIsDark(e.matches);

    matcher.addEventListener('change', onChange);
    return () => matcher.removeEventListener('change', onChange);
  }, []);

  return isDark;
};

const TaskListView = ({ tasks, onTaskClick, statuses }) => {

  const isDarkMode = useSystemDarkMode();

  // Helper chọn icon theo Type (GIỮ NGUYÊN)
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

  // Helper màu Priority (GIỮ NGUYÊN)
  const getPriorityColor = (p, isDarkMode) => {
    const colors = {
      Critical: isDarkMode ? "#FF5252" : "#D32F2F",
      Major: isDarkMode ? "#FF9800" : "#E65100",
      High: isDarkMode ? "#FF9800" : "#E65100",
      Medium: isDarkMode ? "#FFD740" : "#A18800",
      Default: isDarkMode ? "#90A4AE" : "#546E7A",
    };

    return colors[p] || colors.Default;
  };

  // 💡 CẬP NHẬT: Helper màu Status tag
  const getStatusTagColor = (statusName) => {
    if (!statusName) return "default";

    const name = statusName.toLowerCase();

    // Trạng thái HOÀN THÀNH (success: Xanh lá)
    if (name.includes("done") || name.includes("closed") || name.includes("resolved")) {
      return "success";
    }

    // Trạng thái ĐANG LÀM/TIẾN HÀNH (processing: Xanh dương)
    if (name.includes("in progress") || name.includes("developing") || name.includes("testing")) {
      return "processing";
    }

    // Trạng thái CHƯA LÀM (default: Xám)
    if (name.includes("todo") || name.includes("open") || name.includes("backlog")) {
      return "default";
    }

    // Trạng thái khác (warning: Vàng)
    return "default";
  };

  // Helper màu cho Slack (Độ trễ)
  const getSlackColor = (slack, isDarkMode) => {
    // Ưu tiên xử lý trường hợp Critical (Đường găng)
    if (slack === 0 || slack === undefined) {
      return isDarkMode ? "#ff4d4f" : "#cf1322"; // Đỏ tươi : Đỏ đậm
    }

    // Trường hợp nguy hiểm (Slack thấp)
    if (slack <= 2) {
      return isDarkMode ? "#ffa940" : "#d46b08"; // Cam sáng : Cam cháy
    }

    // Trường hợp an toàn
    return isDarkMode ? "#73d13d" : "#389e0d"; // Xanh lá sáng : Xanh lá đậm
  };


  // Helper để phân tích Required Skills thành mảng tags (GIỮ NGUYÊN)
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
      render: (text, record) => (
        <Tooltip title={text}>
          <span style={{ fontWeight: record.isCritical ? 'bold' : 'normal' }}>{text}</span>
        </Tooltip>
      ),
    },
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
      render: (_, record) => {
        // Tự động tính toán mã màu dựa trên mode của máy tính
        const colorES = isDarkMode ? '#4fd1c5' : '#007291'; // Cyan sáng vs Teal đậm
        const colorLS = isDarkMode ? '#ffb000' : '#b93a00'; // Amber sáng vs Cam cháy

        return (
          <div style={{
            fontSize: '11px',
            lineHeight: '1.5',
            fontFamily: 'monospace',
            fontWeight: '700' // Tăng lên 700 để chữ cực kỳ rõ nét
          }}>
            <div style={{ color: colorES }}>
              ES:{record.es ?? '?'} ➝ EF:{record.ef ?? '?'}
            </div>
            <div style={{ color: colorLS }}>
              LS:{record.ls ?? '?'} ➝ LF:{record.lf ?? '?'}
            </div>
          </div>
        );
      }
    },
    // 🔥 CỘT MỚI: SLACK (Độ trễ cho phép)
    {
      title: 'Slack',
      dataIndex: 'slack',
      key: 'slack',
      width: 90,
      align: 'center',
      render: (slack, record) => (
        <Tag color={getSlackColor((record.isCritical ? 0 : slack), isDarkMode)}>
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
      render: (priority) => <Tag color={getPriorityColor(priority, isDarkMode)}>{priority}</Tag>,
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