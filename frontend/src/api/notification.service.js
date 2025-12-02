import axios from 'axios';
import authHeader from './auth.header';

// Cập nhật địa chỉ API chính xác của bạn
// **Chú ý: Đảm bảo đây là địa chỉ gốc của API Server**
const BASE_API_URL = "http://localhost:8080/api";

const NotificationService = {
  /**
   * Lấy danh sách 50 thông báo gần nhất của user đang login.
   * API: GET /api/notifications
   */
  getNotifications() {
    return axios.get(`${BASE_API_URL}/notifications`, { headers: authHeader() });
  },

  /**
   * Đánh dấu một thông báo là đã đọc (Mark as Read).
   * API: PUT /api/notifications/:id/read
   */
  markAsRead(id) {
    return axios.put(`${BASE_API_URL}/notifications/${id}/read`, {}, { headers: authHeader() });
  },
  
  /**
   * (Tùy chọn) Đánh dấu tất cả thông báo là đã đọc.
   * API: PUT /api/notifications/mark-all-read
   */
  markAllAsRead() {
    return axios.put(`${BASE_API_URL}/notifications/mark-all-read`, {}, { headers: authHeader() });
  }
};

export default NotificationService;