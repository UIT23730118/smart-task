// /src/components/Task/TaskModal.jsx
import React, { useState, useEffect } from "react";
import { 
  Modal, Form, Input, Select, DatePicker, Slider, 
  Button, Row, Col, Avatar, List, message, Tag, Divider 
} from "antd";
import { 
  UserOutlined, SendOutlined, 
  CheckCircleOutlined 
} from "@ant-design/icons";
import dayjs from "dayjs"; 

import TaskService from "../../api/task.service";
import { useAuth } from "../../context/AuthContext";

const { TextArea } = Input;
const { Option } = Select;

const TaskModal = ({
  taskId,
  projectId,
  members,
  statuses,
  onClose,
  onTaskChanged,
}) => {
  const { user } = useAuth();
  const isEditMode = !!taskId;

  // --- STATE ---
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigneeId: undefined,
    statusId: undefined,
    priority: "Minor",
    startDate: null,
    dueDate: null,
    progress: 0,
  });

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  // --- LOAD DATA ---
  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      TaskService.getTaskDetails(taskId)
        .then((res) => {
          const t = res.data;
          setFormData({
            title: t.title,
            description: t.description || "",
            assigneeId: t.assigneeId || undefined,
            priority: t.priority || "Minor",
            statusId: t.statusId || (statuses.length > 0 ? statuses[0].id : undefined),
            startDate: t.startDate ? dayjs(t.startDate) : null,
            dueDate: t.dueDate ? dayjs(t.dueDate) : null,
            progress: t.progress || 0,
          });
          setComments(t.comments || []);
        })
        .catch((err) => {
          message.error("Error loading task: " + (err.response?.data?.message || err.message));
        })
        .finally(() => setLoading(false));
    } else {
      // Create Mode
      if (statuses.length > 0) {
        setFormData((prev) => ({ ...prev, statusId: statuses[0].id }));
      }
    }
  }, [taskId, isEditMode, statuses]);

  // --- HANDLERS ---

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (e) => {
    updateField(e.target.name, e.target.value);
  };

  const handleSubmit = async () => {
    // Basic Validation
    if (!formData.title.trim()) {
      message.error("Please enter the task title");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        projectId,
        startDate: formData.startDate ? formData.startDate.format("YYYY-MM-DD") : null,
        dueDate: formData.dueDate ? formData.dueDate.format("YYYY-MM-DD") : null,
        assigneeId: formData.assigneeId || null,
      };

      if (isEditMode) await TaskService.updateTask(taskId, payload);
      else await TaskService.createTask(payload);

      message.success(isEditMode ? "Task updated successfully!" : "Task created successfully!");
      onTaskChanged();
      onClose();
    } catch (err) {
      message.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setCommentLoading(true);
    try {
      const res = await TaskService.addComment(taskId, newComment);
      const addedComment = {
        ...res.data,
        user: { name: user.name, id: user.id },
        createdAt: new Date().toISOString(),
      };
      setComments([...comments, addedComment]);
      setNewComment("");
    } catch (err) {
      message.error("Error sending comment: " + err.message);
    } finally {
      setCommentLoading(false);
    }
  };

  const getPriorityColor = (p) => {
    switch (p) {
      case "Blocker": return "red";
      case "Critical": return "orange";
      case "Major": return "blue";
      default: return "green";
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isEditMode ? <CheckCircleOutlined style={{ color: '#1890ff' }} /> : null}
          <span style={{ fontSize: '1.2rem' }}>
            {isEditMode ? `Task #${taskId}` : "Create New Task"}
          </span>
        </div>
      }
      open={true}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width="90%"
      style={{ top: 20 }}
      okText="Save"
      cancelText="Cancel"
      maskClosable={false}
    >
      <Row gutter={[24, 24]}>
        {/* --- LEFT COLUMN: MAIN INFO --- */}
        <Col xs={24} md={16}>
          <Form layout="vertical">
            <Form.Item label={<b>Title</b>} required>
              <Input
                size="large"
                name="title"
                placeholder="Enter task title..."
                value={formData.title}
                onChange={handleInputChange}
              />
            </Form.Item>

            <Form.Item label={<b>Description</b>}>
              <TextArea
                rows={6}
                name="description"
                placeholder="Detailed description..."
                value={formData.description}
                onChange={handleInputChange}
              />
            </Form.Item>
          </Form>

          {/* --- COMMENTS SECTION (Only Edit Mode) --- */}
          {isEditMode && (
            <div style={{ marginTop: 30 }}>
              <Divider orientation="left">Comments</Divider>
              
              <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '10px' }}>
                <List
                  itemLayout="horizontal"
                  dataSource={comments}
                  locale={{ emptyText: "No comments yet." }}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Avatar style={{ backgroundColor: '#87d068' }}>
                            {item.user?.name?.charAt(0)?.toUpperCase() || <UserOutlined />}
                          </Avatar>
                        }
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 'bold' }}>{item.user?.name || "Unknown User"}</span>
                            <span style={{ fontSize: '12px', color: '#999' }}>
                              {dayjs(item.createdAt).format("MMM D, YYYY HH:mm")}
                            </span>
                          </div>
                        }
                        description={
                          <div style={{ 
                            backgroundColor: '#f5f5f5', 
                            padding: '8px 12px', 
                            borderRadius: '8px',
                            marginTop: '4px',
                            color: '#333'
                          }}>
                            {item.message}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                <Input 
                  placeholder="Write a comment..." 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onPressEnter={handleAddComment}
                />
                <Button 
                  type="primary" 
                  icon={<SendOutlined />} 
                  onClick={handleAddComment}
                  loading={commentLoading}
                >
                  Send
                </Button>
              </div>
            </div>
          )}
        </Col>

        {/* --- RIGHT COLUMN: METADATA --- */}
        <Col xs={24} md={8} style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '24px' }}>
          <Form layout="vertical">
            
            <Form.Item label="Status">
              <Select
                value={formData.statusId}
                onChange={(val) => updateField("statusId", val)}
                placeholder="Select status"
              >
                {statuses?.map((s) => (
                  <Option key={s.id} value={s.id}>{s.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Assignee">
              <Select
                value={formData.assigneeId}
                onChange={(val) => updateField("assigneeId", val)}
                placeholder="-- Unassigned --"
                allowClear
              >
                {members?.map((m) => (
                  <Option key={m.id} value={m.id}>
                    <Avatar size="small" style={{ marginRight: 8, backgroundColor: '#1890ff' }}>
                      {m.name?.charAt(0)}
                    </Avatar>
                    {m.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Priority">
              <Select
                value={formData.priority}
                onChange={(val) => updateField("priority", val)}
              >
                {["Minor", "Major", "Critical", "Blocker"].map(p => (
                  <Option key={p} value={p}>
                    <Tag color={getPriorityColor(p)}>{p}</Tag>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Divider />

            <Form.Item label="Start Date">
              <DatePicker 
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                value={formData.startDate}
                onChange={(date) => updateField("startDate", date)}
                placeholder="Select date"
              />
            </Form.Item>

            <Form.Item label="Due Date">
              <DatePicker 
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                value={formData.dueDate}
                onChange={(date) => updateField("dueDate", date)}
                placeholder="Select date"
              />
            </Form.Item>

            <Form.Item label={`Progress: ${formData.progress}%`}>
              <Slider
                min={0}
                max={100}
                value={formData.progress}
                onChange={(val) => updateField("progress", val)}
              />
            </Form.Item>
          </Form>
        </Col>
      </Row>
    </Modal>
  );
};

export default TaskModal;