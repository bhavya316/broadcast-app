import api from "./axios";

export const getTeachers = async () => {
  const res = await api.get("/admin/teachers");
  return res.data;
};

export const deleteTeacher = async (id) => {
  return api.delete(`/admin/teachers/${id}`);
};