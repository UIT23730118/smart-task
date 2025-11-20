// /src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../api/auth.service';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/Auth/AuthLayout'; // 1. Import Layout

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false); // Thêm loading
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const userData = await AuthService.login(email, password);
            login(userData);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng nhập thất bại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        // 2. Sử dụng AuthLayout
        <AuthLayout isLogin={true}>
            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
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

                {error && <div className="alert alert-danger">{error}</div>}

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                    {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
            </form>
        </AuthLayout>
    );
};

export default Login;