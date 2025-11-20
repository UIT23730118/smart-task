// /src/pages/Register.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../api/auth.service';
import AuthLayout from '../components/Auth/AuthLayout'; // 1. Import Layout

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false); // Thêm loading
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            await AuthService.register(name, email, password);
            setMessage('Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng ký thất bại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        // 2. Sử dụng AuthLayout
        <AuthLayout isLogin={false}>
            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                {message && <div className="alert alert-success">{message}</div>}
                {error && <div className="alert alert-danger">{error}</div>}

                <div className="form-group">
                    <label className="form-label" htmlFor="name">Tên của bạn</label>
                    <input
                        type="text"
                        id="name"
                        className="form-control"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="password">Mật khẩu</label>
                    <input
                        type="password"
                        id="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                    {loading ? 'Đang đăng ký...' : 'Đăng ký'}
                </button>
            </form>
        </AuthLayout>
    );
};

export default Register;