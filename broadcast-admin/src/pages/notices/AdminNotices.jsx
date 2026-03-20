import { useEffect, useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import api from "../../api/axios";

export default function AdminNotices() {

  const [notices, setNotices] = useState([]);
  const navigate = useNavigate();
  const loadNotices = async () => {

    const res = await api.get("/admin/notices");

    setNotices(res.data.notices);

  };

  useEffect(() => {
    loadNotices();
  }, []);

  const deleteNotice = async (id) => {

    if (!window.confirm("Delete this notice?")) return;

    await api.delete(`/admin/notices/${id}`);

    loadNotices();

  };

  return (

    <div>

      <h2>Notice Management</h2>
        <Button
            variant="contained"
            
            onClick={() => navigate("/create-institute-notice")}
            style={{
              marginBottom: 20,
              marginTop: 20,
              background: "radial-gradient(circle, #FFFF83, #C3AD00)",
              color: "#1a1a1a",
              fontWeight: 700,
              boxShadow: "0 4px 15px rgba(195, 173, 0, 0.4)",
              border: "none"
            }}
            >
            Create Institute Notice
        </Button>
      <Table>

        <TableHead>

          <TableRow>

            <TableCell>ID</TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Teacher</TableCell>
            <TableCell>Targets</TableCell>
            <TableCell>Expiry</TableCell>
            <TableCell>Actions</TableCell>

          </TableRow>

        </TableHead>

        <TableBody>

          {notices.map(n => {

            const batches = n.NoticeBatches?.map(b => b.Batch?.name).join(", ");
            const students = n.NoticeStudents?.map(s => s.Student?.name).join(", ");

            const target = batches || students || "Institute";

            return (

              <TableRow key={n.id}>

                <TableCell>{n.id}</TableCell>
                <TableCell>{n.title}</TableCell>
                <TableCell>{n.teacher?.name}</TableCell>
                <TableCell>{target}</TableCell>
                <TableCell>{n.expiry_date}</TableCell>

                <TableCell>

                  <Button
                    color="error"
                    onClick={() => deleteNotice(n.id)}
                  >
                    Delete
                  </Button>

                </TableCell>

              </TableRow>

            );

          })}

        </TableBody>

      </Table>

    </div>

  );

}