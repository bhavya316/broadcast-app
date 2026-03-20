import { useEffect, useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Paper
} from "@mui/material";

import api from "../../api/axios";

export default function NoticeApproval() {

  const [notices, setNotices] = useState([]);

  const loadNotices = async () => {

    try {

      const res = await api.get("/admin/notice-approvals");

      setNotices(res.data.notices);

    } catch (error) {

      console.error("Failed to load pending notices", error);

    }

  };

  useEffect(() => {
    loadNotices();
  }, []);

  const approveNotice = async (id) => {

    try {

      await api.put(`/admin/notice-approvals/${id}/approve`);

      loadNotices();

    } catch (error) {

      console.error("Approval failed", error);

    }

  };

  const rejectNotice = async (id) => {

    if (!window.confirm("Reject this notice?")) return;

    try {

      await api.put(`/admin/notice-approvals/${id}/reject`);

      loadNotices();

    } catch (error) {

      console.error("Rejection failed", error);

    }

  };

  return (

    <Paper style={{ padding: 20 }}>

      <h2>Institute Notice Approval</h2>

      <Table>

        <TableHead>

          <TableRow>

            <TableCell>ID</TableCell>
            <TableCell>Teacher</TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Message</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Actions</TableCell>

          </TableRow>

        </TableHead>

        <TableBody>

          {notices.length === 0 ? (

            <TableRow>
              <TableCell colSpan={6} align="center">
                No pending approvals
              </TableCell>
            </TableRow>

          ) : (

            notices.map(n => (

              <TableRow key={n.id}>

                <TableCell>{n.id}</TableCell>

                <TableCell>{n.teacher?.name}</TableCell>

                <TableCell>{n.title}</TableCell>

                <TableCell>{n.body}</TableCell>

                <TableCell>
                  {new Date(n.createdAt).toLocaleString()}
                </TableCell>

                <TableCell>

                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => approveNotice(n.id)}
                    style={{ marginRight: 10 }}
                  >
                    Approve
                  </Button>

                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => rejectNotice(n.id)}
                  >
                    Reject
                  </Button>

                </TableCell>

              </TableRow>

            ))

          )}

        </TableBody>

      </Table>

    </Paper>

  );

}