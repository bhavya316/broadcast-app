import { useState } from "react";
import {
  TextField, Button, Checkbox, FormControlLabel,
  Paper, Typography, Divider, Box
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

// Combines a date string and time string into an ISO datetime string
function combineDatetime(date, time) {
  if (!date) return null;
  const t = time || "00:00";
  return new Date(`${date}T${t}`).toISOString();
}

export default function CreateInstituteNotice() {
  const navigate = useNavigate();

  const [title, setTitle]             = useState("");
  const [body, setBody]               = useState("");
  const [highPriority, setHighPriority] = useState(false);
  const [pinMessage, setPinMessage]   = useState(false);

  // Expiry — separate date + time
  const [expiryDate, setExpiryDate]   = useState("");
  const [expiryTime, setExpiryTime]   = useState("23:59");

  const [submitting, setSubmitting]   = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return alert("Title is required.");
    if (!body.trim())  return alert("Body is required.");

    setSubmitting(true);
    try {
      await api.post("/admin/institute-notice", {
        title,
        body,
        high_priority: highPriority,
        pin_message:   pinMessage,
        expiry_date:   expiryDate ? combineDatetime(expiryDate, expiryTime) : null,
      });

      alert("Notice created successfully");
      navigate("/notices");

    } catch (error) {
      console.error(error);
      alert("Failed to create notice");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper style={{ padding: 28, maxWidth: 620 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Create Institute Notice
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        This notice will be sent to all teachers and students instantly.
      </Typography>

      <Divider sx={{ mb: 3 }} />

      <TextField
        label="Title"
        fullWidth
        margin="normal"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        helperText="Max 10 words"
      />

      <TextField
        label="Body"
        fullWidth
        multiline
        rows={4}
        margin="normal"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      <Box display="flex" gap={2} mt={1} mb={1}>
        <FormControlLabel
          control={<Checkbox checked={highPriority} onChange={(e) => setHighPriority(e.target.checked)} />}
          label="High Priority"
        />
        <FormControlLabel
          control={<Checkbox checked={pinMessage} onChange={(e) => setPinMessage(e.target.checked)} />}
          label="Pin Message"
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Expiry (optional) — notice disappears after this date &amp; time
      </Typography>

      <Box display="flex" gap={2} alignItems="center">
        <TextField
          type="date"
          label="Expiry Date"
          InputLabelProps={{ shrink: true }}
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          sx={{ flex: 1 }}
        />
        <TextField
          type="time"
          label="Expiry Time"
          InputLabelProps={{ shrink: true }}
          value={expiryTime}
          onChange={(e) => setExpiryTime(e.target.value)}
          disabled={!expiryDate}
          sx={{ flex: 1 }}
        />
      </Box>

      {expiryDate && (
        <Typography variant="caption" color="text.secondary" mt={1} display="block">
          Expires: {new Date(`${expiryDate}T${expiryTime}`).toLocaleString("en-IN", {
            dateStyle: "medium", timeStyle: "short"
          })}
        </Typography>
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          marginTop: 24,
          background: submitting ? undefined : "radial-gradient(circle, #FFFF83, #C3AD00)",
          color: "#1a1a1a",
          fontWeight: 700,
          boxShadow: "0 4px 15px rgba(195, 173, 0, 0.4)",
          border: "none"
        }}
        fullWidth
      >
        {submitting ? "Creating…" : "Create Notice"}
      </Button>
    </Paper>
  );
}