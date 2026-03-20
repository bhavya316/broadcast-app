import api from "./axios";

export const getStudents = async () => {
  const res = await api.get("/admin/students");
  return res.data;
};

export const deleteStudent = async (id) => {
  return api.delete(`/admin/students/${id}`);
};