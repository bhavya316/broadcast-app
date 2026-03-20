import { useEffect, useState } from "react";
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  Paper, Button, TextField, Typography, Box, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Checkbox, FormControlLabel, Chip, Avatar, CircularProgress
} from "@mui/material";
import api from "../../api/axios";

const BASE_URL = "http://localhost:5000";

function AssignTeacherDialog({ open, onClose, batch, teachers, onSaved }) {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (batch) setSelected(batch.Teachers?.map(t => t.id) || []);
  }, [batch]);

  const toggle = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/subjects/${batch.id}`, { teacher_ids: selected });
      onSaved();
      onClose();
    } catch {
      alert("Failed to update teachers.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Assign Teachers to "{batch?.name}"
      </DialogTitle>
      <DialogContent dividers>
        {teachers.length === 0 ? (
          <Typography color="text.secondary">No teachers registered yet.</Typography>
        ) : (
          <Box display="flex" flexDirection="column" gap={1}>
            {teachers.map(t => (
              <FormControlLabel
                key={t.id}
                control={
                  <Checkbox
                    checked={selected.includes(t.id)}
                    onChange={() => toggle(t.id)}
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar
                      src={t.profile_image ? `${BASE_URL}/${t.profile_image}` : undefined}
                      sx={{ width: 32, height: 32, fontSize: 14, bgcolor: "#5e35b1" }}
                    >
                      {t.name?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography fontSize={14} fontWeight={500}>{t.name}</Typography>
                      <Typography fontSize={12} color="text.secondary">{t.subject_taught}</Typography>
                    </Box>
                  </Box>
                }
                sx={{ py: 0.5, borderRadius: 1, px: 1, "&:hover": { background: "#f5f5f5" } }}
              />
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={18} color="inherit" /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function SubjectAssignment() {
  const [batches, setBatches]       = useState([]);
  const [teachers, setTeachers]     = useState([]);
  const [newBatchName, setNewBatchName] = useState("");
  const [uploadingFor, setUploadingFor] = useState(null);
  const [dialogBatch, setDialogBatch]   = useState(null);

  const loadData = async () => {
    try {
      const [batchRes, teacherRes] = await Promise.all([
        api.get("/admin/subjects"),
        api.get("/admin/teachers")
      ]);
      setBatches(batchRes.data);
      setTeachers(teacherRes.data);
    } catch {
      console.error("Failed to load data");
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateBatch = async () => {
    if (!newBatchName.trim()) return alert("Enter batch name");
    try {
      await api.post("/admin/batches", { name: newBatchName });
      setNewBatchName("");
      loadData();
    } catch {
      alert("Failed to create batch");
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm("Delete this batch?")) return;
    try {
      await api.delete(`/admin/batches/${batchId}`);
      loadData();
    } catch {
      alert("Failed to delete batch");
    }
  };

  const handleImageUpload = async (batchId, file) => {
    if (!file) return;
    setUploadingFor(batchId);
    try {
      const formData = new FormData();
      formData.append("image", file);
      await api.post(`/admin/batches/${batchId}/image`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      loadData();
    } catch {
      alert("Failed to upload image");
    } finally {
      setUploadingFor(null);
    }
  };

  return (
    <Paper style={{ padding: 24 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>Subject Assignment</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Create batches and assign teachers to them.
      </Typography>

      {/* Create Batch */}
      <Box display="flex" gap={2} mb={3} alignItems="center">
        <TextField
          label="New Batch Name"
          value={newBatchName}
          onChange={(e) => setNewBatchName(e.target.value)}
          size="small"
          onKeyDown={(e) => e.key === "Enter" && handleCreateBatch()}
        />
        <Button
          variant="contained"
          onClick={handleCreateBatch}
          style={{
            background: "radial-gradient(circle, #FFFF83, #C3AD00)",
            color: "#1a1a1a", fontWeight: 700,
            boxShadow: "0 4px 15px rgba(195, 173, 0, 0.4)", border: "none"
          }}
        >
          Create Batch
        </Button>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Photo</TableCell>
            <TableCell>Batch Name</TableCell>
            <TableCell>Assigned Teachers</TableCell>
            <TableCell>Assign</TableCell>
            <TableCell>Delete</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {batches.map(batch => (
            <TableRow key={batch.id}>

              {/* Photo */}
              <TableCell>
                <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                  {batch.profile_image ? (
                    <img
                      src={`${BASE_URL}/${batch.profile_image}`}
                      alt={batch.name}
                      style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #e0e0e0" }}
                      onError={e => { e.target.style.display = "none"; }}
                    />
                  ) : (
                    <Box sx={{ width: 44, height: 44, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👥</Box>
                  )}
                  <label style={{ cursor: "pointer" }}>
                    <input type="file" accept="image/*" style={{ display: "none" }}
                      onChange={e => handleImageUpload(batch.id, e.target.files[0])} />
                    <Typography fontSize={11} color="primary" sx={{ textDecoration: "underline", cursor: "pointer", opacity: uploadingFor === batch.id ? 0.5 : 1 }}>
                      {uploadingFor === batch.id ? "Uploading…" : batch.profile_image ? "Change" : "Upload"}
                    </Typography>
                  </label>
                </Box>
              </TableCell>

              {/* Batch Name */}
              <TableCell>
                <Typography fontWeight={600} fontSize={14}>{batch.name}</Typography>
              </TableCell>

              {/* Assigned Teachers */}
              <TableCell>
                {batch.Teachers?.length > 0 ? (
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {batch.Teachers.map(t => (
                      <Chip
                        key={t.id}
                        label={t.name}
                        size="small"
                        avatar={
                          <Avatar
                            src={t.profile_image ? `${BASE_URL}/${t.profile_image}` : undefined}
                            sx={{ bgcolor: "#5e35b1" }}
                          >
                            {t.name?.[0]}
                          </Avatar>
                        }
                        sx={{ fontSize: 12 }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography fontSize={13} color="text.secondary">No teachers assigned</Typography>
                )}
              </TableCell>

              {/* Assign Button */}
              <TableCell>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setDialogBatch(batch)}
                >
                  Assign Teachers
                </Button>
              </TableCell>

              {/* Delete */}
              <TableCell>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => handleDeleteBatch(batch.id)}
                >
                  Delete
                </Button>
              </TableCell>

            </TableRow>
          ))}
          {batches.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ color: "#aaa", py: 4 }}>
                No batches created yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <AssignTeacherDialog
        open={!!dialogBatch}
        onClose={() => setDialogBatch(null)}
        batch={dialogBatch}
        teachers={teachers}
        onSaved={loadData}
      />
    </Paper>
  );
}