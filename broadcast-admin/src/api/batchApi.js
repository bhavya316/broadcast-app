import api from "./axios";

export const createBatch = async (name) => {
  const res = await api.post("/admin/batches", { name });
  return res.data;
};

export const deleteBatch = async (batchId) => {
  const res = await api.delete(`/admin/batches/${batchId}`);
  return res.data;
};

export const getAllBatches = async () => {
  const res = await api.get("/admin/batches");
  return res.data;
};

export const getBatchStudents = async (batchId) => {
  const res = await api.get(`/admin/batches/${batchId}/students`);
  return res.data;
};

export const assignStudentsToBatch = async (batchId, studentIds) => {
  const res = await api.post(`/admin/batches/${batchId}/students`, {
    student_ids: studentIds,
  });
  return res.data;
};

export const removeStudentFromBatch = async (batchId, studentId) => {
  const res = await api.delete(`/admin/batches/${batchId}/students/${studentId}`);
  return res.data;
};