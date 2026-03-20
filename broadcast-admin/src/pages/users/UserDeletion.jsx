import { useEffect, useState } from "react";
import {
  Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Button, Tabs, Tab, Box, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Typography, Alert
} from "@mui/material";
import { getStudents } from "../../api/studentApi";
import { getTeachers } from "../../api/teacherApi";
import api from "../../api/axios";

function EditDialog({ open, onClose, user, type, onSaved }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setForm({ ...user });
    setError("");
  }, [user]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await api.put(`/admin/${type}s/${form.id}`, form);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const studentFields = [
    { key: "name",         label: "Name" },
    { key: "phone_number", label: "Phone Number" },
    { key: "erp_id",       label: "ERP ID" },
    { key: "standard",     label: "Standard" },
    { key: "location",     label: "Location" },
    { key: "age",          label: "Age" },
  ];

  const teacherFields = [
    { key: "name",           label: "Name" },
    { key: "phone_number",   label: "Phone Number" },
    { key: "erp_id",         label: "ERP ID" },
    { key: "subject_taught", label: "Subject Taught" },
    { key: "education",      label: "Education" },
    { key: "degree",         label: "Degree" },
  ];

  const fields = type === "student" ? studentFields : teacherFields;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit {type === "student" ? "Student" : "Teacher"}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          {fields.map(f => (
            <TextField
              key={f.key}
              label={f.label}
              value={form[f.key] || ""}
              onChange={e => set(f.key, e.target.value)}
              size="small"
              fullWidth
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function UserControl() {
  const [tab, setTab] = useState(0);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [editTarget, setEditTarget] = useState(null);
  const [editType, setEditType] = useState("student");

  const fetchAll = async () => {
    const [s, t] = await Promise.all([getStudents(), getTeachers()]);
    setStudents(s || []);
    setTeachers(t || []);
  };

  useEffect(() => { fetchAll(); }, []);

  const cellStyle = { fontSize: 13 };

  return (
    <Paper style={{ padding: 24 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>User Control</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Edit student and teacher account details.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Students (${students.length})`} />
        <Tab label={`Teachers (${teachers.length})`} />
      </Tabs>

      {tab === 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>ERP ID</TableCell>
              <TableCell>Standard</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Age</TableCell>
              <TableCell>Edit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map(s => (
              <TableRow key={s.id}>
                <TableCell sx={cellStyle}>{s.name}</TableCell>
                <TableCell sx={cellStyle}>{s.phone_number}</TableCell>
                <TableCell sx={cellStyle}>{s.erp_id}</TableCell>
                <TableCell sx={cellStyle}>{s.standard}</TableCell>
                <TableCell sx={cellStyle}>{s.location || "—"}</TableCell>
                <TableCell sx={cellStyle}>{s.age || "—"}</TableCell>
                <TableCell>
                  <Button size="small" variant="outlined"
                    onClick={() => { setEditType("student"); setEditTarget(s); }}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ color: "#aaa", py: 4 }}>
                  No students found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {tab === 1 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>ERP ID</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Education</TableCell>
              <TableCell>Degree</TableCell>
              <TableCell>Edit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teachers.map(t => (
              <TableRow key={t.id}>
                <TableCell sx={cellStyle}>{t.name}</TableCell>
                <TableCell sx={cellStyle}>{t.phone_number}</TableCell>
                <TableCell sx={cellStyle}>{t.erp_id}</TableCell>
                <TableCell sx={cellStyle}>{t.subject_taught}</TableCell>
                <TableCell sx={cellStyle}>{t.education || "—"}</TableCell>
                <TableCell sx={cellStyle}>{t.degree || "—"}</TableCell>
                <TableCell>
                  <Button size="small" variant="outlined"
                    onClick={() => { setEditType("teacher"); setEditTarget(t); }}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {teachers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ color: "#aaa", py: 4 }}>
                  No teachers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <EditDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        user={editTarget}
        type={editType}
        onSaved={fetchAll}
      />
    </Paper>
  );
}