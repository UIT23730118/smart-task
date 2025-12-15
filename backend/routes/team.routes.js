const controller = require("../controllers/team.controller");
const authJwt = require("../middleware/authJwt");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Headers", "x-access-token, Origin, Content-Type, Accept");
    next();
  });

  // Lấy danh sách tổ của dự án
  app.get("/api/projects/:projectId/teams", [authJwt.verifyToken], controller.getTeamsByProject);

  // Tạo tổ mới
  app.post("/api/teams", [authJwt.verifyToken], controller.createTeam);

  // Xóa tổ
  app.delete("/api/teams/:id", [authJwt.verifyToken], controller.deleteTeam);

  // Thêm thành viên vào tổ
  app.post("/api/teams/add-member", [authJwt.verifyToken], controller.addMemberToTeam);

  // Xóa thành viên khỏi tổ (dùng ID của bảng team_members)
  app.delete("/api/team-members/:id", [authJwt.verifyToken], controller.removeMember);
};