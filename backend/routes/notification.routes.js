// backend/routes/notification.routes.js
const controller = require("../controllers/notification.controller");
const authJwt = require("../middleware/authJwt");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Headers","x-access-token, Authorization, Origin, Content-Type, Accept");
    next();
  });

  // GET /api/notifications (Lấy danh sách thông báo của user hiện tại)
  app.get("/api/notifications", [authJwt.verifyToken], controller.getMyNotifications);

  // PUT /api/notifications/:id/read (Đánh dấu là đã đọc)
  app.put("/api/notifications/:id/read", [authJwt.verifyToken], controller.markAsRead);
};