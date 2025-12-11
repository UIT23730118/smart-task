import React, { useState, useEffect, useMemo } from "react";
import {
  Modal, Form, Input, Select, DatePicker, Slider,
  Button, Row, Col, Avatar, List, message, Tag, Divider,
  Tabs, Upload, Popconfirm, InputNumber, Checkbox, Typography
} from "antd";
import {
  UserOutlined, SendOutlined,
  CheckCircleOutlined, PaperClipOutlined,
  InboxOutlined, FileTextOutlined,
  DeleteOutlined, DownloadOutlined,
  RobotOutlined, CheckOutlined, PlusOutlined, UnorderedListOutlined,
  MinusCircleOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";

// Import isSameOrAfter plugin cho Day.js
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

import TaskService from "../../api/task.service";
import { useAuth } from "../../context/AuthContext";
dayjs.extend(isSameOrAfter);

const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;

const TaskModal = ({
  taskId,
  projectId,
  members = [],
  statuses = [],
  onClose,
  onTaskChanged,
  onTaskRefreshed,
}) => {
  const { user } = useAuth();
  const isEditMode = !!taskId;

  // 1. KHAI BÁO FORM HOOK
  const [form] = Form.useForm();

  // --- STATE ---
  const [formData, setFormData] = useState({
    suggestedAssigneeId: undefined,
  });

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [taskAttachments, setTaskAttachments] = useState([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);


  // --- LOAD DATA & SET FORM VALUES ---
  const fetchTaskAttachments = async () => {
    if (!isEditMode) return;
    try {
      const res = await TaskService.getTaskAttachments(taskId);
      const formattedFiles = res.data.map(f => ({
        ...f,
        uid: f.id,
        name: f.fileName,
        status: 'done',
        // Đảm bảo đường dẫn này khớp với cấu hình server
        url: `/public/uploads/attachments/${f.filePath.split('/').pop()}`,
        user: { id: f.userId, name: "User name" },
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

          // ==========================================================
          // 💡 LOGIC TẢI: CHUỖI TEXT -> MẢNG (GIỮ NGUYÊN VÀ ĐÃ ĐƯỢC XÁC NHẬN ĐÚNG)
          // ==========================================================
          let requiredSkillsArray = [];
          if (t.requiredSkills) {
            if (Array.isArray(t.requiredSkills)) {
              requiredSkillsArray = t.requiredSkills;
            } else if (typeof t.requiredSkills === 'string') {
              try {
                // Cố gắng parse JSON nếu đã đổi sang Sequelize.JSON
                requiredSkillsArray = JSON.parse(t.requiredSkills);
                if (!Array.isArray(requiredSkillsArray)) {
                  requiredSkillsArray = [];
                }
              } catch (e) {
                // Nếu không phải JSON hợp lệ (chuỗi tags cũ), xử lý như chuỗi tags:
                requiredSkillsArray = t.requiredSkills
                  .split(/[\s,]+/)
                  .map(s => s.trim())
                  .filter(s => s.length > 0);
              }
            }
          }
          // ==========================================================

          // SET GIÁ TRỊ VÀO FORM (Day.js objects)
          form.setFieldsValue({
            title: t.title,
            description: t.description || "",
            assigneeId: assignedId,
            priority: t.priority || "Minor",
            statusId: t.statusId || (statuses.length > 0 ? statuses[0].id : undefined),
            startDate: t.startDate ? dayjs(t.startDate) : null,
            dueDate: t.dueDate ? dayjs(t.dueDate) : null,
            progress: t.progress || 0,
            subtasks: parsedSubtasks,
            requiredSkills: requiredSkillsArray, // PHẢI LÀ MẢNG
            workloadWeight: t.workloadWeight || 1,
          });

          // Cập nhật state phụ
          setFormData(prev => ({
            ...prev,
            suggestedAssigneeId: t.suggestedAssigneeId || undefined,
          }));

          setComments(t.comments || []);
          fetchTaskAttachments();
        })
        .catch((err) => {
          message.error("Error loading task: " + (err.response?.data?.message || err.message));
        })
        .finally(() => setLoading(false));
    } else {
      // Thiết lập giá trị mặc định khi tạo mới
      const defaultValues = {
        statusId: statuses.length > 0 ? statuses[0].id : undefined,
        priority: "Minor",
        progress: 0,
        subtasks: [],
        workloadWeight: 1,
      };
      form.setFieldsValue(defaultValues);
      setFormData(prev => ({ ...prev, suggestedAssigneeId: undefined }));
    }
  }, [taskId, isEditMode, statuses, form, members]);

  // --- HANDLERS ---

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // 1. Lấy giá trị gốc từ Form (values.requiredSkills là MẢNG hoặc null/undefined)
      const values = await form.validateFields();

      // 2. CHUYỂN ĐỔI MẢNG TAGS TỪ FORM SANG CHUỖI TEXT CHO DB
      let skillsPayload = values.requiredSkills; // (Đây là một MẢNG từ Select mode="tags")

      // Chỉ xử lý nếu nó là mảng
      if (Array.isArray(skillsPayload)) {
        // Chuyển MẢNG sang CHUỖI TEXT, nối bằng dấu phẩy
        skillsPayload = skillsPayload
          .filter(s => s.trim().length > 0)
          .join(',');
      }

      // Nếu kết quả là chuỗi rỗng sau khi join, đặt là null
      if (skillsPayload === "") {
        skillsPayload = null;
      }

      // 3. KIỂM TRA VALIDATION NGÀY THÁNG
      const startDateObj = values.startDate ? dayjs(values.startDate) : null;
      const dueDateObj = values.dueDate ? dayjs(values.dueDate) : null;

      if (startDateObj && dueDateObj) {
        if (startDateObj.isSameOrAfter(dueDateObj)) {
          message.error("The Due Date must be later than the Start Date.");
          setLoading(false);
          return; // Dừng lại nếu validation thất bại
        }
      }

      // ==========================================================
      // 💡 FIX CỐT LÕI: SỬ DỤNG DESTRUCTURING ĐỂ LOẠI BỎ requiredSkills GỐC
      // ==========================================================
      const {
        requiredSkills, // Loại bỏ trường này khỏi values gốc
        suggestedAssigneeId, // Loại bỏ trường này khỏi values gốc
        startDate,
        dueDate,
        assigneeId,
        ...rest // Lấy tất cả các trường còn lại (title, description, priority, progress, statusId...)
      } = values;

      const payload = {
        // Gán các trường còn lại
        ...rest,
        projectId,

        // Gán các trường đã được xử lý/chuẩn hóa
        startDate: startDate ? startDate.toISOString() : null,
        dueDate: dueDate ? dueDate.toISOString() : null,
        assigneeId: assigneeId || null,

        // GÁN CHẮC CHẮN GIÁ TRỊ ĐÃ XỬ LÝ (CHUỖI TEXT HOẶC null)
        requiredSkills: skillsPayload,

        // Gán giá trị mặc định cho suggestedAssigneeId
        suggestedAssigneeId: undefined,
      };

      if (isEditMode) await TaskService.updateTask(taskId, payload);
      else await TaskService.createTask(payload);

      message.success(isEditMode ? "Task updated successfully!" : "Task created successfully!");
      onTaskChanged();
      if (onTaskRefreshed) {
        onTaskRefreshed();
      }
      onClose();
    } catch (err) {
      if (err.errorFields) {
        message.error("Please fill in all required fields correctly.");
      } else {
        message.error(err.response?.data?.message || err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ADDED: DELETE HANDLER (from the second file)
  const handleDelete = async () => {
    setLoading(true);
    try {
      await TaskService.deleteTask(taskId);
      message.success("Task deleted successfully.");
      onTaskChanged();
      if (onTaskRefreshed) {
        onTaskRefreshed();
      }
      onClose();
    } catch (err) {
      message.error("Error deleting task: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // ... (Các hàm khác: handleAddComment, getPriorityColor, handleSuggestAssignee, handleAcceptSuggestion, handleTaskUploadChange, handleTaskDeleteFile, taskUploadProps) ...
  // [Phần còn lại của code (handleAddComment -> taskUploadProps) được giữ nguyên không thay đổi logic so với file bạn gửi]
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

  // --- AUTO ASSIGNMENT HANDLERS (Sử dụng form.getFieldValue) ---
  const currentAssigneeId = Form.useWatch('assigneeId', form);
  const currentRequiredSkills = Form.useWatch('requiredSkills', form);
  const suggestedAssignee = members.find(m => m.id === formData.suggestedAssigneeId);

  const handleSuggestAssignee = async () => {
    if (!taskId) return message.warning("Please save the task before requesting a suggestion.");

    setLoadingSuggest(true);
    try {
      const response = await TaskService.suggestTaskAssignment(taskId);

      if (response.data.suggestedAssignee) {
        const suggested = response.data.suggestedAssignee;
        message.success(`System suggests: ${suggested.name} (${suggested.score} points).`);

        setFormData(prev => ({
          ...prev,
          suggestedAssigneeId: suggested.id
        }));
        if (onTaskRefreshed) {
          onTaskRefreshed();
        }
      } else {
        message.info(response.data.message);
      }

    } catch (error) {
      message.error(error.response?.data?.message || 'Error generating suggestion.');
    } finally {
      setLoadingSuggest(false);
    }
  };

  const handleAcceptSuggestion = () => {
    if (suggestedAssignee) {
      form.setFieldsValue({ assigneeId: suggestedAssignee.id });
      setFormData(prev => ({
        ...prev,
        suggestedAssigneeId: undefined
      }));
      message.info(`Accepted ${suggestedAssignee.name} as the assignee.`);
    }
  };

  // --- UPLOAD HANDLERS (Retained) ---
  const handleTaskUploadChange = async ({ file: fileInfo }) => {
    const file = fileInfo.originFileObj;
    if (fileInfo.status === 'uploading') return;

    if (fileInfo.status === 'done' || file) {
      try {
        const res = await TaskService.uploadAttachment(taskId, file);
        const newAttachment = res.data.attachment;

        message.success(`${newAttachment.fileName} uploaded successfully.`);

        const uploadedFile = {
          ...newAttachment,
          uid: newAttachment.id,
          name: newAttachment.fileName,
          status: 'done',
          url: `/public/uploads/attachments/${newAttachment.filePath.split('/').pop()}`,
          user: { name: user.name, id: user.id },
        };

        setTaskAttachments(prev => [uploadedFile, ...prev]);

      } catch (err) {
        message.error(err.response?.data?.message || `Upload failed: ${fileInfo.name}`);
      }
    }
  };

  const handleTaskDeleteFile = async (id, fileName) => {
    try {
      message.loading(`Deleting ${fileName}...`, 0.5);
      await TaskService.deleteAttachment(id);
      setTaskAttachments(taskAttachments.filter(item => item.id !== id));
      message.success("File deleted successfully.");
    } catch (err) {
      message.error(err.response?.data?.message || "Error deleting file.");
    }
  };

  const taskUploadProps = {
    name: 'attachment',
    multiple: true,
    showUploadList: false,
    onChange: handleTaskUploadChange,
    customRequest: async (options) => {
      const { file } = options;
      try {
        await handleTaskUploadChange({ file: { originFileObj: file, status: 'done', name: file.name } });
      } catch (e) {
        options.onError(e);
      }
    }
  };

  // --- SUBTASKS COMPONENT
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

  // --- ATTACHMENTS TAB (Wrapped in useMemo) ---
  const TaskAttachmentsTab = useMemo(() => () => (
    <div style={{ paddingTop: '10px' }}>
      <Dragger {...taskUploadProps} style={{ marginBottom: 20, background: '#fafafa' }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined style={{ color: '#1890ff' }} />
        </p>
        <p className="ant-upload-text">Drag or click to attach files to this task</p>
        <p className="ant-upload-hint">Files will be linked directly to this task.</p>
      </Dragger>

      <h4 style={{ marginBottom: 15 }}>Attached Files ({taskAttachments.length})</h4>
      <List
        itemLayout="horizontal"
        dataSource={taskAttachments}
        locale={{ emptyText: "No attachments yet." }}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button type="text" icon={<DownloadOutlined />} href={item.url} target="_blank">Download</Button>,
              <Popconfirm title="Are you sure you want to delete this file?" onConfirm={() => handleTaskDeleteFile(item.id, item.name)}>
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ]}
          >
            <List.Item.Meta
              avatar={<FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
              title={<a href={item.url} target="_blank">{item.name}</a>}
              description={`Size: ${(item.fileSize / 1024).toFixed(0)} KB • Uploaded by: ${item.user?.name || 'Unknown'}`}
            />
          </List.Item>
        )}
      />
    </div>
  ), [taskAttachments, user.name, taskUploadProps]);

  // --- TASK INFO TAB (SỬ DỤNG FORM HOOK & GỘP FORM) ---
  const TaskInfoTab = () => (
    <Form
      form={form}
      layout="vertical"
    >
      <Row gutter={[24, 24]}>
        {/* Left Column (Main Info & Comments) */}
        <Col xs={24} md={16}>
          <Form.Item
            label={<b>Title</b>}
            name="title"
            rules={[{ required: true, message: 'Please input the task title!' }]}
          >
            <Input size="large" placeholder="Enter task title..." />
          </Form.Item>

          <Form.Item label={<b>Description</b>} name="description">
            <TextArea rows={6} placeholder="Detailed description..." />
          </Form.Item>

          <Divider orientation="left" plain><UnorderedListOutlined /> Subtasks</Divider>
          <SubtasksList />

          {/* COMMENTS (GIỮ NGUYÊN) */}
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
                        avatar={<Avatar style={{ backgroundColor: '#87d068' }}>{item.user?.name?.charAt(0)?.toUpperCase() || <UserOutlined />}</Avatar>}
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 'bold' }}>{item.user?.name || "Unknown User"}</span>
                            <span style={{ fontSize: '12px', color: '#999' }}>
                              {dayjs(item.createdAt).format("MMM D, YYYY HH:mm")}
                            </span>
                          </div>
                        }
                        description={
                          <div style={{ backgroundColor: '#f5f5f5', padding: '8px 12px', borderRadius: '8px', marginTop: '4px', color: '#333' }}>
                            {item.message}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                <Input placeholder="Write a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onPressEnter={handleAddComment} />
                <Button type="primary" icon={<SendOutlined />} onClick={handleAddComment} loading={commentLoading}>
                  Send
                </Button>
              </div>
            </div>
          )}
        </Col>

        {/* Right Column (Meta Data - Bây giờ chỉ chứa Form.Item) */}
        <Col xs={24} md={8} style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '24px' }}>

          <Form.Item label="Status" name="statusId">
            <Select placeholder="Select status">
              {statuses?.map((s) => (<Option key={s.id} value={s.id}>{s.name}</Option>))}
            </Select>
          </Form.Item>

          <Form.Item label="Assignee" name="assigneeId">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flexGrow: 1 }}>
                <Select
                  placeholder="-- Unassigned --"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  value={currentAssigneeId}
                  onChange={(value) => {
                    form.setFieldsValue({ assigneeId: value });
                  }}>
                  {members?.map((m) => (
                    <Option key={m.id} value={m.id}>
                      <Avatar size="small" style={{ marginRight: 8, backgroundColor: '#1890ff' }}>{m.name?.charAt(0)}</Avatar>
                      {m.name}
                    </Option>
                  ))}
                </Select>
              </div>

              {/* Suggest Button */}
              {isEditMode && (
                <Button
                  type="dashed"
                  icon={<RobotOutlined />}
                  onClick={handleSuggestAssignee}
                  loading={loadingSuggest}
                  title="System assignment suggestion"
                  htmlType="button"
                />
              )}
            </div>

            {/* Suggestion Result */}
            {suggestedAssignee && currentAssigneeId !== suggestedAssignee.id && (
              <div style={{ marginTop: 10, padding: 8, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
                <Tag color="green" icon={<RobotOutlined />}>Suggestion:</Tag>
                <span style={{ fontWeight: 'bold' }}>{suggestedAssignee.name}</span>
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  style={{ marginLeft: 10, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  onClick={handleAcceptSuggestion}
                >
                  Accept
                </Button>
              </div>
            )}
          </Form.Item>

          <Form.Item label="Priority" name="priority">
            <Select>
              {["Minor", "Major", "Critical", "Blocker"].map(p => (
                <Option key={p} value={p}>
                  <Tag color={getPriorityColor(p)}>{p}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* REQUIRED SKILLS */}
          <Form.Item label="Required Skills" name="requiredSkills">
            <Select
              mode="tags"
              value={currentRequiredSkills}
              style={{ width: '100%' }}
              placeholder="Enter skills (e.g., React, Testing, DB Design)"
              onChange={(value) => form.setFieldsValue({ requiredSkills: value })}
            // Cho phép nhập tự do, không cần options
            />
            <p style={{ fontSize: '12px', color: '#999', marginTop: 5 }}>Enter skills separated by commas or pressing Enter.</p>
          </Form.Item>

          <Form.Item label="Workload Weight (Point(s))" 
             tooltip="Estimate the complexity/time for this Task (Scale 1-10)"
             name="workloadWeight" // Gán name ở đây
             rules={[{ required: true, message: 'Please enter workload weight' }]}
          >
            <InputNumber
              min={1}
              max={10}
              style={{ width: '100%' }}
              onChange={(value) => form.setFieldsValue({ workloadWeight: value })}
            />
          </Form.Item>

          <Divider />

          <Form.Item label="Start Date" name="startDate">
            <DatePicker
              style={{ width: '100%' }}
              showTime
              format="YYYY-MM-DD HH:mm"
              placeholder="Select date and time"
            />
          </Form.Item>

          <Form.Item label="Due Date" name="dueDate">
            <DatePicker
              style={{ width: '100%' }}
              showTime
              format="YYYY-MM-DD HH:mm"
              placeholder="Select date and time"
            />
          </Form.Item>

          {/* Slider cần phải được wrap bởi Form.Item và có `name` */}
          <Form.Item
            label={`Progress: ${form.getFieldValue('progress') || 0}%`}
            name="progress"
            // Thêm normalize để Slider không bị re-render do thay đổi label
            normalize={value => value === undefined ? 0 : value}
          >
            <Slider min={0} max={100} />
          </Form.Item>

        </Col>
      </Row>
    </Form>
  );

  // --- TABS ---
  const modalItems = [
    {
      key: 'info',
      label: 'Task Details',
      children: <TaskInfoTab />,
    },
    ...(isEditMode ? [{
      key: 'attachments',
      label: <><PaperClipOutlined /> Attachments ({taskAttachments.length})</>,
      children: <TaskAttachmentsTab />
    }] : [])
  ];

  return (
    <Modal
      key={taskId}
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
      onOk={handleSubmit} // Main Save/Update function
      confirmLoading={loading}
      width="90%"
      style={{ top: 20}}
      maskClosable={false}

      footer={[
        isEditMode && (
          <Popconfirm
            key="delete"
            title="Are you sure you want to delete this task?"
            onConfirm={handleDelete}
            okText="Yes"
            cancelText="No"
          >
            <Button type="primary" danger icon={<MinusCircleOutlined />} loading={loading}>
              Delete Task
            </Button>
          </Popconfirm>
        ),
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
          Save
        </Button>,
      ]}
    >
      <Tabs defaultActiveKey="info" items={modalItems} style={{ minHeight: '400px' }} />
    </Modal>
  );
};

export default TaskModal;