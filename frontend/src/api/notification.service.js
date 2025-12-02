// src/api/notification.service.js

import axios from 'axios';
import authHeader from './auth.header';

// Cập nhật địa chỉ API chính xác của bạn
const API_URL = "http://localhost:8080/api/notifications";

const NotificationService = {
  /**
   * Lấy danh sách 50 thông báo gần nhất của user đang login.
   */
  getNotifications() {
    return axios.get(API_URL, { headers: authHeader() });
  },

  /**
   * Đánh dấu một thông báo là đã đọc (Mark as Read).
   */
  markAsRead(id) {
    // API: PUT /api/notifications/:id/read
    return axios.put(`${API_URL}/${id}/read`, {}, { headers: authHeader() });
  },
};

export default NotificationService;