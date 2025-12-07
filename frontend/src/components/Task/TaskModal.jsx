import React, { useState, useEffect, useMemo } from "react";
import {
  Modal, Form, Input, Select, DatePicker, Slider,
  Button, Row, Col, Avatar, List, message, Tag, Divider,
  Tabs, Upload, Popconfirm, Checkbox, Typography
} from "antd";
import {
  InboxOutlined, FileTextOutlined,
  DeleteOutlined, DownloadOutlined,
  CheckCircleOutlined,
  PlusOutlined, UnorderedListOutlined,
  SendOutlined, MinusCircleOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

import TaskService from "../../api/task.service";
import { useAuth } from "../../context/AuthContext";

dayjs.extend(isSameOrAfter);

const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;
const { Text } = Typography;

const TaskModal = ({
  taskId,
  projectId,
  members = [], // Fix lỗi undefined
  statuses = [], // Fix lỗi undefined
  onClose,
  onTaskChanged,
}) => {
  const { user } = useAuth();
  const isEditMode = !!taskId;

  const [form] = Form.useForm();

  // --- STATE ---
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [taskAttachments, setTaskAttachments] = useState([]);

  // --- LOAD DATA ---
  const fetchTaskAttachments = async () => {
    if (!isEditMode) return;
    try {
      const res = await TaskService.getTaskAttachments(taskId);
      const formattedFiles = res.data.map(f => ({
        ...f,
        uid: f.id,
        name: f.fileName,
        status: 'done',
        url: `/public/uploads/attachments/${f.filePath.split('/').pop()}`,
        user: { id: f.userId, name: "User" },
      }));
      setTaskAttachments(formattedFiles);
    } catch (err) {
      console.error("Error loading attachments:", err);
    }
  }

  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      TaskService.getTaskDetails(taskId)
        .then((res) => {
          const t = res.data;

          let assignedId = t.assigneeId;
          if (assignedId !== null && assignedId !== undefined) {
            const numId = Number(assignedId);
            assignedId = isNaN(numId) ? undefined : numId;
          } else {
            assignedId = undefined;
          }

          // Xử lý Subtasks
          let parsedSubtasks = [];
          try {
            if (typeof t.subtasksTemplate === 'string') {
              parsedSubtasks = JSON.parse(t.subtasksTemplate);
            } else if (Array.isArray(t.subtasksTemplate)) {
              parsedSubtasks = t.subtasksTemplate;
            }
          } catch (e) {
            console.error("Error parsing subtasks:", e);
          }

          form.setFieldsValue({
            title: t.title,
            description: t.description || "",
            assigneeId: assignedId,
            priority: t.priority || "Minor",
            statusId: t.statusId || (statuses?.length > 0 ? statuses[0].id : undefined),
            startDate: t.startDate ? dayjs(t.startDate) : null,
            dueDate: t.dueDate ? dayjs(t.dueDate) : null,
            progress: t.progress || 0,
            subtasks: parsedSubtasks, // Load subtasks
          });

          setComments(t.comments || []);
          fetchTaskAttachments();
        })
        .catch((err) => {
          console.error(err);
          message.error("Failed to load task details.");
        })
        .finally(() => setLoading(false));
    } else {
      const defaultValues = {
        statusId: statuses?.length > 0 ? statuses[0].id : undefined,
        priority: "Minor",
        progress: 0,
        subtasks: []
      };
      form.setFieldsValue(defaultValues);
    }
  }, [taskId, isEditMode, statuses, form]);

  // --- HANDLERS ---
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();

      const startDateObj = values.startDate ? dayjs(values.startDate) : null;
      const dueDateObj = values.dueDate ? dayjs(values.dueDate) : null;

      if (startDateObj && dueDateObj) {
        if (startDateObj.isSameOrAfter(dueDateObj)) {
          message.error("Due Date must be later than Start Date.");
          setLoading(false);
          return;
        }
      }

      let payload = {
        ...values,
        projectId,
        startDate: values.startDate ? values.startDate.toISOString() : null,
        dueDate: values.dueDate ? values.dueDate.toISOString() : null,
        assigneeId: values.assigneeId || null,
        subtasksTemplate: values.subtasks || [], // Lưu subtasks vào DB
      };

      delete payload.subtasks; // Xóa field tạm
      const { id, taskId: rogueTaskId, ...cleanPayload } = payload;

      if (isEditMode) {
        await TaskService.updateTask(taskId, cleanPayload);
        message.success("Task updated successfully!");
      } else {
        await TaskService.createTask(cleanPayload);
        message.success("Task created successfully!");
      }

      onTaskChanged();
      onClose();
    } catch (err) {
      console.error("Submit error:", err);
      if (err.errorFields) {
        message.error("Please fill in all required fields.");
      } else {
        message.error("An error occurred while saving.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await TaskService.deleteTask(taskId);
      message.success("Task deleted successfully.");
      onTaskChanged();
      onClose();
    } catch (err) {
      console.error(err);
      message.error("Failed to delete task.");
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
      console.error(err);
      message.error("Failed to post comment.");
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

  // --- UPLOAD HANDLERS ---
  const handleTaskUploadChange = async ({ file: fileInfo }) => {
    const file = fileInfo.originFileObj;
    if (fileInfo.status === 'uploading') return;
    if (fileInfo.status === 'done' || file) {
      try {
        const res = await TaskService.uploadAttachment(taskId, file);
        const newAttachment = res.data.attachment;
        message.success(`${newAttachment.fileName} uploaded.`);
        setTaskAttachments(prev => [{
          ...newAttachment,
          uid: newAttachment.id,
          name: newAttachment.fileName,
          status: 'done',
          url: `/public/uploads/attachments/${newAttachment.filePath.split('/').pop()}`,
          user: { name: user.name, id: user.id },
        }, ...prev]);
      } catch (err) {
        console.error(err);
        message.error("Upload failed.");
      }
    }
  };

  const handleTaskDeleteFile = async (id) => {
    try {
      await TaskService.deleteAttachment(id);
      setTaskAttachments(taskAttachments.filter(item => item.id !== id));
      message.success("File deleted.");
    } catch (err) {
      console.error(err);
      message.error("Failed to delete file.");
    }
  };

  const taskUploadProps = {
    name: 'attachment',
    multiple: true,
    showUploadList: false,
    customRequest: async (options) => {
      const { file } = options;
      try {
        await handleTaskUploadChange({ file: { originFileObj: file, status: 'done', name: file.name } });
      } catch (e) { options.onError(e); }
    }
  };

  // --- SUBTASKS COMPONENT (Phần bạn yêu cầu) ---
  const SubtasksList = () => (
    <Form.List name="subtasks">
      {(fields, { add, remove }) => (
        <div style={{ marginTop: 10 }}>
          {fields.map(({ key, name, ...restField }) => (
            <Row key={key} style={{ marginBottom: 8 }} align="middle" gutter={8}>
              <Col flex="30px" style={{ textAlign: 'center' }}>
                <Form.Item
                  {...restField}
                  name={[name, 'completed']}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox />
                </Form.Item>
              </Col>
              <Col flex="auto">
                <Form.Item
                  {...restField}
                  name={[name, 'title']}
                  noStyle
                  rules={[{ required: true, message: 'Missing subtask title' }]}
                >
                  <Input placeholder="Subtask title..." bordered={false} style={{ borderBottom: '1px solid #f0f0f0' }} />
                </Form.Item>
              </Col>
              <Col flex="30px">
                <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f', cursor: 'pointer' }} />
              </Col>
            </Row>
          ))}
          <Form.Item>
            <Button type="dashed" onClick={() => add({ completed: false, title: '' })} block icon={<PlusOutlined />}>
              Add Subtask
            </Button>
          </Form.Item>
        </div>
      )}
    </Form.List>
  );

  // --- TABS CONTENT ---
  const TaskInfoTab = () => (
    <Form form={form} layout="vertical">
      <Row gutter={[24, 24]}>
        {/* Left Column */}
        <Col xs={24} md={16}>
          <Form.Item label={<b>Title</b>} name="title" rules={[{ required: true, message: 'Please input title!' }]}>
            <Input size="large" placeholder="What needs to be done?" />
          </Form.Item>

          <Form.Item label={<b>Description</b>} name="description">
            <TextArea rows={5} placeholder="Add more details..." />
          </Form.Item>

          {/* Subtask Section */}
          <Divider orientation="left" plain><UnorderedListOutlined /> Subtasks</Divider>
          <SubtasksList />

          {isEditMode && (
            <div style={{ marginTop: 30 }}>
              <Divider orientation="left">Comments</Divider>
              <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: 15 }}>
                <List
                  itemLayout="horizontal"
                  dataSource={comments}
                  locale={{ emptyText: "No comments yet." }}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar style={{ backgroundColor: '#87d068' }}>{item.user?.name?.charAt(0) || 'U'}</Avatar>}
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600 }}>{item.user?.name || "User"}</span>
                            <span style={{ fontSize: '12px', color: '#999' }}>{dayjs(item.createdAt).format("MMM D, HH:mm")}</span>
                          </div>
                        }
                        description={<div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '6px', marginTop: 4 }}>{item.message}</div>}
                      />
                    </List.Item>
                  )}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Input placeholder="Write a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onPressEnter={handleAddComment} />
                <Button type="primary" icon={<SendOutlined />} onClick={handleAddComment} loading={commentLoading}>Send</Button>
              </div>
            </div>
          )}
        </Col>

        {/* Right Column */}
        <Col xs={24} md={8} style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '24px' }}>
          <Form.Item label="Status" name="statusId">
            <Select placeholder="Select status">
              {statuses?.map((s) => (<Option key={s.id} value={s.id}>{s.name}</Option>))}
            </Select>
          </Form.Item>

          <Form.Item label="Assignee" name="assigneeId">
              <Select
                placeholder="Unassigned"
                allowClear
                showSearch
                optionFilterProp="children"
                onChange={(val) => form.setFieldsValue({ assigneeId: val })}
              >
                {members?.map((m) => (
                  <Option key={m.id} value={m.id}>
                    <Avatar size="small" style={{ marginRight: 8, backgroundColor: '#1890ff' }}>{m.name?.charAt(0)}</Avatar>
                    {m.name}
                  </Option>
                ))}
              </Select>
          </Form.Item>

          <Form.Item label="Priority" name="priority">
            <Select>
              {["Minor", "Major", "Critical", "Blocker"].map(p => (
                <Option key={p} value={p}><Tag color={getPriorityColor(p)}>{p}</Tag></Option>
              ))}
            </Select>
          </Form.Item>

          <Divider />

          <Form.Item label="Start Date" name="startDate">
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} placeholder="Select date" />
          </Form.Item>

          <Form.Item label="Due Date" name="dueDate">
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} placeholder="Select date" />
          </Form.Item>

          <Form.Item label={`Progress: ${form.getFieldValue('progress') || 0}%`} name="progress" normalize={v => v || 0}>
            <Slider min={0} max={100} />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );

  const AttachmentsTab = useMemo(() => () => (
    <div style={{ paddingTop: 10 }}>
      <Dragger {...taskUploadProps} style={{ marginBottom: 20, background: '#fafafa' }}>
        <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#1890ff' }} /></p>
        <p className="ant-upload-text">Click or drag file to this area to upload</p>
      </Dragger>
      <h4>Attached Files ({taskAttachments.length})</h4>
      <List
        itemLayout="horizontal"
        dataSource={taskAttachments}
        locale={{ emptyText: "No attachments." }}
        renderItem={(item) => (
          <List.Item actions={[
            <Button type="text" icon={<DownloadOutlined />} href={item.url} target="_blank">Download</Button>,
            <Popconfirm title="Delete this file?" onConfirm={() => handleTaskDeleteFile(item.id)}>
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          ]}>
            <List.Item.Meta
              avatar={<FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
              title={<a href={item.url} target="_blank">{item.name}</a>}
              description={`${(item.fileSize / 1024).toFixed(0)} KB • ${dayjs(item.uploadedAt).format("YYYY-MM-DD")}`}
            />
          </List.Item>
        )}
      />
    </div>
  ), [taskAttachments, user.name]);

  const items = [
    { key: 'info', label: 'Details', children: <TaskInfoTab /> },
    ...(isEditMode ? [{ key: 'files', label: `Attachments (${taskAttachments.length})`, children: <AttachmentsTab /> }] : [])
  ];

  return (
    <Modal
      open={true}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isEditMode ? <CheckCircleOutlined style={{ color: '#1890ff' }} /> : <PlusOutlined />}
          <span>{isEditMode ? `Edit Task #${taskId}` : "Create New Task"}</span>
        </div>
      }
      onCancel={onClose}
      onOk={handleSubmit}
      width={900}
      confirmLoading={loading}
      maskClosable={false}
      style={{ top: 20, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}
      bodyStyle={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}
      footer={[
        isEditMode && (
          <Popconfirm key="del" title="Delete this task?" description="This action cannot be undone." onConfirm={handleDelete} okText="Yes" cancelText="No">
            <Button danger icon={<DeleteOutlined />} style={{ float: 'left' }}>Delete</Button>
          </Popconfirm>
        ),
        <Button key="cancel" onClick={onClose}>Cancel</Button>,
        <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>Save</Button>,
      ]}
    >
      <Tabs defaultActiveKey="info" items={items} />
    </Modal>
  );
};

export default TaskModal;