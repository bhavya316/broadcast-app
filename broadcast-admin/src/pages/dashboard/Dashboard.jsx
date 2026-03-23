import { useEffect, useState } from "react";
import { Grid, Typography } from "@mui/material";
import StatCard from "../../components/common/StatCard";
import api from "../../api/axios";

export default function Dashboard() {
  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    materials: 0,
    pendingNotices: 0,
    pendingReports: 0,
  });

  const fetchStats = async () => {
    try {
      const res = await api.get("/admin/dashboard");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load dashboard stats");
    }
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <div style={{ padding: 30 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 24 }}>
        <StatCard title="Total Teachers"   value={stats.teachers} />
        <StatCard title="Total Students"   value={stats.students} />
        <StatCard title="Study Materials"  value={stats.materials} />
        <StatCard title="Pending Notices"  value={stats.pendingNotices} />
        <StatCard title="Pending Reports"  value={stats.pendingReports} />
      </div>
    </div>
  );
}