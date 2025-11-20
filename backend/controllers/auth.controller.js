// /controllers/auth.controller.js
const db = require('../models');
const config = require('../config/auth.config');
const User = db.users;

const jwt = require('jsonwebtoken');

// Đăng ký (Sign Up)
exports.signup = async (req, res) => {
    try {
        const user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            role: req.body.role || 'member' // Mặc định là 'member'
        });

        res.status(201).send({ message: 'User registered successfully!' });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

// Đăng nhập (Sign In)
exports.signin = async (req, res) => {
    try {
        const user = await User.findOne({
            where: { email: req.body.email }
        });

        if (!user) {
            return res.status(404).send({ message: 'User Not found.' });
        }

        // Kiểm tra mật khẩu (dùng method ta đã thêm trong model)
        const passwordIsValid = await user.isValidPassword(req.body.password);

        if (!passwordIsValid) {
            return res.status(401).send({
                accessToken: null,
                message: 'Invalid Password!'
            });
        }

        // Nếu hợp lệ, tạo token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            config.secret,
            {
                expiresIn: 86400 // 24 giờ
            }
        );

        // Trả về thông tin user và token
        res.status(200).send({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            accessToken: token
        });

    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};