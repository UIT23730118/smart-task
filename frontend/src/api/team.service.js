// frontend/src/api/team.service.js

import axios from "axios";
import authHeader from "./auth.header";

// Đảm bảo URL này đúng với port backend của bạn (thường là 8080)
const API_URL = "http://localhost:8080/api/";

const getTeamsByProject = (projectId) => {
  return axios.get(API_URL + `projects/${projectId}/teams`, { headers: authHeader() });
};

const createTeam = (data) => {
  return axios.post(API_URL + "teams", data, { headers: authHeader() });
};

const deleteTeam = (teamId) => {
  return axios.delete(API_URL + `teams/${teamId}`, { headers: authHeader() });
};

const addMemberToTeam = (data) => {
  return axios.post(API_URL + "teams/add-member", data, { headers: authHeader() });
};

const removeMember = (memberId) => {
  return axios.delete(API_URL + `team-members/${memberId}`, { headers: authHeader() });
};

const TeamService = {
  getTeamsByProject,
  createTeam,
  deleteTeam,
  addMemberToTeam,
  removeMember
};

export default TeamService;