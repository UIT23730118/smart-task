// src/components/Task/TaskFilter.jsx
import React, { useState, useEffect } from 'react';
import { Form, Input, Select, DatePicker, Button, Row, Col } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import ProjectService from '../../api/project.service'; // Để lấy list member nếu cần

const { Option } = Select;

const TaskFilter = ({ onSearch }) => {
    const [form] = Form.useForm();
    // (Tuỳ chọn) Nếu muốn load danh sách assignee vào dropdown, bạn cần gọi API lấy users/members ở đây

    const handleFinish = (values) => {
        // Format lại dữ liệu trước khi gửi (đặc biệt là Date)
        const filters = {
            ...values,
            dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
        };
        // Xóa các field undefined/null/rỗng
        Object.keys(filters).forEach(key => {
            if (!filters[key]) delete filters[key];
        });

        onSearch(filters);
    };

    const handleReset = () => {
        form.resetFields();
        onSearch({}); // Gọi search rỗng để load lại tất cả
    };

    return (
        <Form
            form={form}
            layout="vertical" // Hoặc 'inline' nếu muốn hàng ngang
            onFinish={handleFinish}
            style={{ background: 'var(--bg-white)', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border-color)' }}
        >
            <Row gutter={[16, 16]}>
                {/* 1. Key & Summary */}
                <Col xs={24} md={6}>
                    <Form.Item name="key" label="Key letter (Key/Summary)">
                        <Input placeholder="Type task name or description..." prefix={<SearchOutlined />} />
                    </Form.Item>
                </Col>

                {/* 2. Priority */}
                <Col xs={12} md={4}>
                    <Form.Item name="priority" label="Độ ưu tiên">
                        <Select placeholder="Chọn độ ưu tiên" allowClear>
                            <Option value="Minor">Minor</Option>
                            <Option value="Major">Major</Option>
                            <Option value="Critical">Critical</Option>
                            <Option value="Blocker">Blocker</Option>
                        </Select>
                    </Form.Item>
                </Col>

                {/* 3. Assignee (Ở đây nhập ID hoặc làm dropdown dynamic) */}
                <Col xs={12} md={5}>
                    <Form.Item name="assigneeId" label="Người thực hiện">
                         {/* Nếu có list members, dùng map để render Option */}
                        <Input placeholder="Nhập ID User" />
                        {/* Sau này nâng cấp thành Select Member */}
                    </Form.Item>
                </Col>

                {/* 4. Due Date */}
                <Col xs={12} md={5}>
                    <Form.Item name="dueDate" label="Deadline">
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                </Col>

                {/* Buttons */}
                <Col xs={24} md={4} style={{ display: 'flex', alignItems: 'end', gap: '10px' }}>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                            Search
                        </Button>
                    </Form.Item>
                    <Form.Item>
                        <Button onClick={handleReset} icon={<ClearOutlined />}>
                            Delete
                        </Button>
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
};

export default TaskFilter;