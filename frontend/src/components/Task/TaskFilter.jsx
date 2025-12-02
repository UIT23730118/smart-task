import React from 'react';
import { Form, Input, Select, DatePicker, Button, Row, Col } from 'antd';
import { SearchOutlined, ClearOutlined, FilterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs'; 

const { Option } = Select;

const TaskFilter = ({ onSearch, projectData }) => {
    const [form] = Form.useForm();
    
    const assigneeOptions = [
        { label: "All Assignees", value: undefined }, 
        ...(projectData?.members || []).map((m) => ({
            label: m.name,
            value: Number(m.id) 
        }))
    ];

    const handleFinish = (values) => {
        const filters = {
            ...values,
            dueDate: values.dueDate ? dayjs(values.dueDate).format('YYYY-MM-DD') : undefined,
            assigneeId: values.assigneeId ? Number(values.assigneeId) : undefined,
        };
        
        Object.keys(filters).forEach(key => {
            if (filters[key] === undefined || filters[key] === null || filters[key] === "") {
                 delete filters[key];
            }
        });

        onSearch(filters);
    };

    const handleReset = () => {
        form.resetFields();
        onSearch({});
    };

    return (
        <Form
            form={form}
            // Thay đổi layout thành 'default' (hoặc inline) và dùng style để căn chỉnh
            layout="vertical"
            onFinish={handleFinish}
            style={{ 
                background: 'var(--bg-white)', 
                padding: '20px', 
                borderRadius: '8px', 
                marginBottom: '20px', 
                border: '1px solid var(--border-color)',
                width: '100%' // Đảm bảo chiếm đủ chiều rộng
            }}
            initialValues={{ assigneeId: undefined }} 
        >
            <Row gutter={[16, 16]} style={{ alignItems: 'end' }}> {/* Căn chỉnh Row theo bottom */}
                
                {/* 1. Search Term (Key/Summary) */}
                <Col xs={24} md={6}>
                    {/* Giữ label nhưng giảm margin-bottom của Form.Item */}
                    <Form.Item name="key" label="Search Key/Summary" style={{ marginBottom: 0 }}>
                        <Input placeholder="Type task name or description..." prefix={<SearchOutlined />} allowClear />
                    </Form.Item>
                </Col>

                {/* 2. Priority */}
                <Col xs={12} md={4}>
                    <Form.Item name="priority" label="Priority" style={{ marginBottom: 0 }}>
                        <Select placeholder="Select priority" allowClear>
                            <Option value="Minor">Minor</Option>
                            <Option value="Major">Major</Option>
                            <Option value="Critical">Critical</Option>
                            <Option value="Blocker">Blocker</Option>
                        </Select>
                    </Form.Item>
                </Col>

                {/* 3. Assignee */}
                <Col xs={12} md={5}>
                    <Form.Item name="assigneeId" label="Assignee" style={{ marginBottom: 0 }}>
                        <Select 
                            placeholder="Select assignee" 
                            allowClear
                            options={assigneeOptions}
                            prefix={<FilterOutlined />}
                        />
                    </Form.Item>
                </Col>

                {/* 4. Due Date */}
                <Col xs={12} md={5}>
                    <Form.Item name="dueDate" label="Deadline" style={{ marginBottom: 0 }}>
                        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" allowClear />
                    </Form.Item>
                </Col>

                {/* Buttons (Căn chỉnh theo bottom của Col) */}
                <Col xs={24} md={4} style={{ display: 'flex', alignItems: 'end', gap: '10px' }}>
                    {/* Giữ lại Form.Item chỉ để căn chỉnh ngang hàng với các Input khác */}
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                            Search
                        </Button>
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button onClick={handleReset} icon={<ClearOutlined />}>
                            Reset
                        </Button>
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
};

export default TaskFilter;