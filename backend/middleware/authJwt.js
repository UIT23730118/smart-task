// /middleware/authJwt.js
const jwt = require('jsonwebtoken');
const config = require('../config/auth.config.js');
// (Không cần db trong file này nữa)

verifyToken = (req, res, next) => {
    let token = req.headers['authorization'];
    if (!token) {
        return res.status(403).send({ message: 'No token provided!' });
    }

    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }

    jwt.verify(token, config.secret, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized! Invalid Token.' });
        }
        req.userId = decoded.id;
        req.userRole = decoded.role; // Lấy role từ token
        next();
    });
};

// --- HÀM MỚI ---
// Kiểm tra xem user có role 'leader' (global) hay không
isLeader = (req, res, next) => {
    // req.userRole được gán từ verifyToken
    if (req.userRole && req.userRole === 'leader') {
        next();
        return;
    }

    res.status(403).send({ message: 'Require Leader Role!' });
};
// --- KẾT THÚC HÀM MỚI ---

const authJwt = {
    verifyToken: verifyToken,
    isLeader: isLeader // Thêm export
};
module.exports = authJwt;