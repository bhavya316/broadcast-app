import { useEffect, useState } from "react";
import {
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Select,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Divider,
  TextField,
} from "@mui/material";
import { getAllBatches, getBatchStudents, assignStudentsToBatch, removeStudentFromBatch } from "../../api/batchApi";
import { getStudents } from "../../api/studentApi";

export default function BatchStudents() {
  const [batches, setBatches] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [toRemoveIds, setToRemoveIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingEnrolled, setFetchingEnrolled] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Load all batches and all students on mount
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [batchRes, studentRes] = await Promise.all([
          getAllBatches(),
          getStudents(),
        ]);
        setBatches(batchRes.batches || []);
        setAllStudents(studentRes || []);
      } catch (err) {
        console.error("Failed to load data", err);
        setErrorMsg("Failed to load batches or students. Check your connection.");
      }
    };
    loadInitial();
  }, []);

  // When a batch is selected, fetch its current enrolled students
  useEffect(() => {
    if (!selectedBatch) {
      setEnrolledStudents([]);
      setSelectedStudentIds([]);
      return;
    }
    const fetchEnrolled = async () => {
      setFetchingEnrolled(true);
      try {
        const res = await getBatchStudents(selectedBatch);
        setEnrolledStudents(res.students || []);
      } catch (err) {
        console.error("Failed to fetch enrolled students", err);
        setEnrolledStudents([]);
      } finally {
        setFetchingEnrolled(false);
      }
    };
    fetchEnrolled();
    setSelectedStudentIds([]);
    setToRemoveIds([]);
    setSuccessMsg("");
    setErrorMsg("");
  }, [selectedBatch]);

  const enrolledIds = new Set(enrolledStudents.map((s) => s.id));

  // Students not yet in the selected batch
  const availableStudents = allStudents.filter(
    (s) => !enrolledIds.has(s.id) &&
      (s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.erp_id?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedBatchObj   = batches.find((b) => b.id === selectedBatch) || {};
  const selectedBatchName  = selectedBatchObj.name || "";
  const selectedBatchImage = selectedBatchObj.profile_image || null;

  const handleAssign = async () => {
    if (!selectedBatch || selectedStudentIds.length === 0) return;
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await assignStudentsToBatch(selectedBatch, selectedStudentIds);
      setSuccessMsg(
        `${selectedStudentIds.length} student(s) successfully assigned to "${selectedBatchName}".`
      );
      setSelectedStudentIds([]);
      // Refresh enrolled list
      const res = await getBatchStudents(selectedBatch);
      setEnrolledStudents(res.students || []);
    } catch (err) {
      console.error("Assignment failed", err);
      setErrorMsg("Failed to assign students. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper style={{ padding: 28 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Assign Students to Batch
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Select a batch, pick students to add, then click Assign.
      </Typography>

      {/* Batch selector */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Typography fontWeight={500} minWidth={100}>
          Select Batch:
        </Typography>
        <Select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          displayEmpty
          style={{ minWidth: 220 }}
          size="small"
        >
          <MenuItem value="" disabled>
            — Choose a batch —
          </MenuItem>
          {batches.map((batch) => (
            <MenuItem key={batch.id} value={batch.id}>
              {batch.name}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {selectedBatch && (
        <>
          <Divider sx={{ my: 2 }} />

          {/* Currently enrolled */}
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            {selectedBatchImage ? (
              <img src={`http://localhost:5000/${selectedBatchImage}`} alt={selectedBatchName}
                style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid #e0e0e0" }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👥</div>
            )}
            <Typography variant="h6">
              Currently Enrolled in "{selectedBatchName}"
            </Typography>
          </Box>

          {fetchingEnrolled ? (
            <CircularProgress size={24} sx={{ mb: 2 }} />
          ) : enrolledStudents.length === 0 ? (
            <Typography variant="body2" color="text.secondary" mb={2}>
              No students enrolled yet.
            </Typography>
          ) : (
            <>
              <Box display="flex" alignItems="center" gap={2} mb={1}>
                <Typography variant="body2" color="text.secondary">
                  {toRemoveIds.length > 0 ? `${toRemoveIds.length} selected` : "Select students to remove"}
                </Typography>
                <Button
                  size="small"
                  color="error"
                  variant="contained"
                  disabled={toRemoveIds.length === 0}
                  onClick={async () => {
                    if (!window.confirm(`Remove ${toRemoveIds.length} student(s) from "${selectedBatchName}"?`)) return;
                    try {
                      await Promise.all(toRemoveIds.map(id => removeStudentFromBatch(selectedBatch, id)));
                      setToRemoveIds([]);
                      const res = await getBatchStudents(selectedBatch);
                      setEnrolledStudents(res.students || []);
                    } catch {
                      alert("Failed to remove students.");
                    }
                  }}
                >
                  Remove Selected ({toRemoveIds.length})
                </Button>
                {toRemoveIds.length > 0 && (
                  <Button size="small" variant="text" onClick={() => setToRemoveIds([])}>
                    Clear
                  </Button>
                )}
              </Box>
              <Table size="small" sx={{ mb: 3 }}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <input
                        type="checkbox"
                        checked={toRemoveIds.length === enrolledStudents.length && enrolledStudents.length > 0}
                        onChange={(e) =>
                          setToRemoveIds(e.target.checked ? enrolledStudents.map(s => s.id) : [])
                        }
                        style={{ cursor: "pointer", width: 16, height: 16 }}
                      />
                    </TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>ERP ID</TableCell>
                    <TableCell>Standard</TableCell>
                    <TableCell>Phone</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {enrolledStudents.map((s) => (
                    <TableRow
                      key={s.id}
                      selected={toRemoveIds.includes(s.id)}
                      sx={{ background: toRemoveIds.includes(s.id) ? "#fff5f5" : "inherit", cursor: "pointer" }}
                      onClick={() =>
                        setToRemoveIds(prev =>
                          prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                        )
                      }
                    >
                      <TableCell padding="checkbox">
                        <input
                          type="checkbox"
                          checked={toRemoveIds.includes(s.id)}
                          onChange={() => {}}
                          style={{ cursor: "pointer", width: 16, height: 16 }}
                        />
                      </TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.erp_id || "—"}</TableCell>
                      <TableCell>{s.standard || "—"}</TableCell>
                      <TableCell>{s.phone_number || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Assign new students */}
          <Typography variant="h6" gutterBottom>
            Add Students to "{selectedBatchName}"
          </Typography>

          <Box display="flex" gap={2} alignItems="center" mb={2} flexWrap="wrap">
            <TextField
              label="Search by name or ERP ID"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ minWidth: 240 }}
            />
            <Select
              multiple
              value={selectedStudentIds}
              onChange={(e) => setSelectedStudentIds(e.target.value)}
              displayEmpty
              renderValue={(selected) =>
                selected.length === 0
                  ? "Select students to add…"
                  : `${selected.length} student(s) selected`
              }
              style={{ minWidth: 280 }}
              size="small"
            >
              {availableStudents.length === 0 ? (
                <MenuItem disabled>
                  {searchTerm
                    ? "No matching students"
                    : "All students already enrolled"}
                </MenuItem>
              ) : (
                availableStudents.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                    {s.erp_id ? ` — ${s.erp_id}` : ""}
                    {s.standard ? ` (Std ${s.standard})` : ""}
                  </MenuItem>
                ))
              )}
            </Select>

            <Button
              variant="contained"
              onClick={handleAssign}
              disabled={selectedStudentIds.length === 0 || loading}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : "Assign"}
            </Button>
          </Box>

          {successMsg && (
            <Alert severity="success" sx={{ mt: 1 }} onClose={() => setSuccessMsg("")}>
              {successMsg}
            </Alert>
          )}
          {errorMsg && (
            <Alert severity="error" sx={{ mt: 1 }} onClose={() => setErrorMsg("")}>
              {errorMsg}
            </Alert>
          )}

          {/* Full student table */}
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>
            All Available Students (not yet in this batch)
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>ERP ID</TableCell>
                <TableCell>Standard</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Add</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {availableStudents.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.erp_id || "—"}</TableCell>
                  <TableCell>{s.standard || "—"}</TableCell>
                  <TableCell>{s.phone_number || "—"}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant={selectedStudentIds.includes(s.id) ? "contained" : "outlined"}
                      onClick={() => {
                        setSelectedStudentIds((prev) =>
                          prev.includes(s.id)
                            ? prev.filter((id) => id !== s.id)
                            : [...prev, s.id]
                        );
                      }}
                    >
                      {selectedStudentIds.includes(s.id) ? "✓ Selected" : "Select"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {availableStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ color: "text.secondary" }}>
                    No students available to add.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}
    </Paper>
  );
}