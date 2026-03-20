import api from "./axios";

export const getAssignments = async () => {
  const res = await api.get("/admin/subjects");
  return res.data;
};

export const updateTeachers = async (batchId, teacher_ids) => {
  return api.put(`/admin/subjects/${batchId}`, {
    teacher_ids
  });
};