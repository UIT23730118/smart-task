// /src/api/auth.service.js
import api from './axios';

// Gọi API đăng ký
const register = (name, email, password) => {
    return api.post('/auth/signup', {
        name,
        email,
        password,
    });
};

// Gọi API đăng nhập
const login = (email, password) => {
    return api
        .post('/auth/signin', {
            email,
            password,
        })
        .then((response) => {
            // Nếu đăng nhập thành công, lưu thông tin user (và token)
            // vào Local Storage
            if (response.data.accessToken) {
                localStorage.setItem('user', JSON.stringify(response.data));
            }
            return response.data;
        });
};

// Xóa user khỏi Local Storage
const logout = () => {
    localStorage.removeItem('user');
};

const AuthService = {
    register,
    login,
    logout,
};

export default AuthService;