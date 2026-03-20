import { useState, useContext } from "react";
import { TextField, Button, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/admin/login", {
        email,
        password,
      });

      const token = res.data.token;

      login(token);

      navigate("/dashboard");
    } catch (err) {
      alert("Invalid login credentials");
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f6fa",
      }}
    >
      <Paper elevation={3} style={{ padding: 40, width: 350 }}>
        <Typography variant="h5" gutterBottom>
          Admin Login
        </Typography>

        <form onSubmit={handleLogin}>
          <TextField
            label="Email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            style={{
              marginTop: 20,
              background: "radial-gradient(circle, #FFFF83, #C3AD00)",
              color: "#1a1a1a",
              fontWeight: 700,
              boxShadow: "0 4px 15px rgba(195, 173, 0, 0.4)",
              border: "none"
            }}
          >
            Login
          </Button>
        </form>
      </Paper>
    </div>
  );
}