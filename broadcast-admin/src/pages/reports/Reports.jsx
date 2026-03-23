import { useEffect, useState } from "react";
import {
  Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Button, Chip, Typography, Box, Tabs, Tab, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField
} from "@mui/material";
import { Flag } from "@mui/icons-material";
import api from "../../api/axios";

const STATUS_COLOR = {
  pending:   "warning",
  resolved:  "success",
  dismissed: "default",
};

function ReasonDialog({ open, onClose, report }) {
  if (!report) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Report #{report.id} — Detail</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Box display="flex" flexDirection="column" gap={1.5}>
          <Box><b>Reporter:</b> {report.reporter_name} ({report.reporter_role})</Box>
          <Box><b>Reported:</b> {report.reported_name} ({report.reported_role})</Box>
          <Box><b>Status:</b> {report.status}</Box>
          <Box><b>Submitted:</b> {new Date(report.createdAt).toLocaleString()}</Box>
          <Box>
            <b>Reason:</b>
            <Typography variant="body2" mt={0.5} sx={{ whiteSpace: "pre-wrap", color: "#555" }}>
              {report.reason || "No reason provided"}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Reports() {
  const [reports, setReports]   = useState([]);
  const [tab, setTab]           = useState(0);   // 0=pending, 1=resolved, 2=dismissed
  const [detail, setDetail]     = useState(null);
  const [loading, setLoading]   = useState(true);

  const tabLabel = ["pending", "resolved", "dismissed"];

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/reports");
      setReports(res.data.data ?? []);
    } catch (e) {
      console.error("Failed to load reports", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = reports.filter(r => r.status === tabLabel[tab]);

  const resolve = async (id) => {
    try {
      await api.put(`/admin/reports/${id}/resolve`);
      load();
    } catch (e) { console.error(e); }
  };

  const dismiss = async (id) => {
    if (!window.confirm("Dismiss this report?")) return;
    try {
      await api.put(`/admin/reports/${id}/dismiss`);
      load();
    } catch (e) { console.error(e); }
  };

  const remove = async (id) => {
    if (!window.confirm("Permanently delete this report?")) return;
    try {
      await api.delete(`/admin/reports/${id}`);
      load();
    } catch (e) { console.error(e); }
  };

  const count = (status) => reports.filter(r => r.status === status).length;

  const cellStyle = { fontSize: 13 };

  return (
    <Paper style={{ padding: 24 }}>

      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Flag color="error" />
        <Typography variant="h5" fontWeight="bold">Reports</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Reports submitted by students and teachers from the app.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Pending (${count("pending")})`} />
        <Tab label={`Resolved (${count("resolved")})`} />
        <Tab label={`Dismissed (${count("dismissed")})`} />
      </Tabs>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Reporter</TableCell>
            <TableCell>Reported</TableCell>
            <TableCell>Reason</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#aaa" }}>
                Loading…
              </TableCell>
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#aaa" }}>
                No {tabLabel[tab]} reports
              </TableCell>
            </TableRow>
          ) : (
            filtered.map(r => (
              <TableRow key={r.id} hover>
                <TableCell sx={cellStyle}>{r.id}</TableCell>

                <TableCell sx={cellStyle}>
                  <b>{r.reporter_name}</b>
                  <br />
                  <span style={{ color: "#888", fontSize: 11 }}>{r.reporter_role}</span>
                </TableCell>

                <TableCell sx={cellStyle}>
                  <b>{r.reported_name}</b>
                  <br />
                  <span style={{ color: "#888", fontSize: 11 }}>{r.reported_role}</span>
                </TableCell>

                <TableCell sx={{ ...cellStyle, maxWidth: 200 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 180,
                      fontSize: 13,
                      cursor: "pointer",
                      color: "#1976d2",
                    }}
                    onClick={() => setDetail(r)}
                    title="Click to view full reason"
                  >
                    {r.reason || <i style={{ color: "#aaa" }}>No reason</i>}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Chip
                    label={r.status}
                    color={STATUS_COLOR[r.status]}
                    size="small"
                  />
                </TableCell>

                <TableCell sx={cellStyle}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </TableCell>

                <TableCell>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setDetail(r)}
                    >
                      View
                    </Button>

                    {r.status === "pending" && (
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => resolve(r.id)}
                        >
                          Resolve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          onClick={() => dismiss(r.id)}
                        >
                          Dismiss
                        </Button>
                      </>
                    )}

                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => remove(r.id)}
                    >
                      Delete
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ReasonDialog
        open={!!detail}
        onClose={() => setDetail(null)}
        report={detail}
      />

    </Paper>
  );
}