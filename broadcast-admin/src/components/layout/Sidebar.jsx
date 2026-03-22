import { Link, useNavigate } from "react-router-dom";
import {
  Dashboard,
  School,
  People,
  Assignment,
  Notifications,
  Article,
  Logout,
  MenuBook,
  HowToReg,
  ManageAccounts,
  Flag
} from "@mui/icons-material";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

export default function Sidebar() {

  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const menuItemStyle = {
    display: "flex",
    alignItems: "center",
    padding: "12px 20px",
    textDecoration: "none",
    color: "#333",
    gap: "10px",
    fontSize: "15px"
  };

  return (
    <div
      style={{
        width: "230px",
        height: "100vh",
        background: "#ffffff",
        borderRight: "1px solid #e5e5e5",
        position: "fixed",
        left: 0,
        top: 0
      }}
    >

      <div
        style={{
          padding: "20px",
          fontSize: "20px",
          fontWeight: "bold",
          borderBottom: "1px solid #eee"
        }}
      >
        Broadcast Admin
      </div>

      <div style={{ marginTop: "10px" }}>

        <Link to="/dashboard" style={menuItemStyle}>
          <Dashboard fontSize="small" />
          Dashboard
        </Link>

        <Link to="/teachers" style={menuItemStyle}>
          <School fontSize="small" />
          Teachers
        </Link>

        <Link to="/students" style={menuItemStyle}>
          <People fontSize="small" />
          Students
        </Link>

        <Link to="/subjects" style={menuItemStyle}>
          <Assignment fontSize="small" />
          Subject Assignment
        </Link>

        <Link to="/batch-students" style={menuItemStyle}>
          <People fontSize="small" />
          Batch Students
        </Link>

        <Link to="/reminders" style={menuItemStyle}>
          <Notifications fontSize="small" />
          Reminders
        </Link>
        
        <Link to="/notices" style={menuItemStyle}>
          <Article fontSize="small" />
          Notices
        </Link>
        <Link to="/notice-approvals" style={menuItemStyle}>
          <HowToReg fontSize="small" />
          Notice Approvals
        </Link>

        <Link to="/materials" style={menuItemStyle}>
          <MenuBook fontSize="small" />
          Study Materials
        </Link>

        <Link to="/reports" style={menuItemStyle}>
          <Flag fontSize="small" />
          Reports
        </Link>

        <Link to="/users" style={menuItemStyle}>
          <ManageAccounts fontSize="small" />
          User Control
        </Link>

        <div
          onClick={handleLogout}
          style={{
            ...menuItemStyle,
            cursor: "pointer",
            color: "#d32f2f",
            marginTop: "10px"
          }}
        >
          <Logout fontSize="small" />
          Logout
        </div>

      </div>
    </div>
  );
}