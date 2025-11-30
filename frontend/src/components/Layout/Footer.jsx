// /src/components/Layout/Footer.jsx
import React from 'react';
import { Layout, Typography, Space } from 'antd';
import { HeartFilled, GithubOutlined } from '@ant-design/icons'; // Sử dụng Ant Icons

const { Footer: AntFooter } = Layout; // Đổi tên để tránh trùng lặp
const { Text } = Typography;

const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    // Sử dụng component Footer của Ant Design
    <AntFooter style={{
      textAlign: 'center',
      padding: '15px 20px',
      backgroundColor: '#f0f2f5', // Màu nền nhẹ của Ant Design
      borderTop: '1px solid #e8e8e8',
    }}>
      <Space direction="vertical" size={4}>
        <Text type="secondary" style={{ fontSize: '13px' }}>
          &copy; {currentYear} Smart Task Management. All Rights Reserved.
        </Text>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Built with <HeartFilled style={{ color: '#eb2f96', margin: '0 4px' }} /> using Ant Design.
        </Text>
      </Space>
    </AntFooter>
  );
};

export default Footer;