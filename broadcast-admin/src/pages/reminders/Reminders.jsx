import { useEffect, useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button
} from "@mui/material";
import api from "../../api/axios";

export default function AdminReminders() {

  const [reminders, setReminders] = useState([]);

  const loadReminders = async () => {

    const res = await api.get("/admin/reminders");

    setReminders(res.data.reminders);

  };

  useEffect(() => {
    loadReminders();
  }, []);

  const deleteReminder = async (id) => {

    if (!window.confirm("Delete reminder?")) return;

    await api.delete(`/admin/reminders/${id}`);

    loadReminders();

  };

  return (

    <div>

      <h2>Reminders Management</h2>

      <Table>

        <TableHead>

          <TableRow>

            <TableCell>ID</TableCell>
            <TableCell>Teacher</TableCell>
            <TableCell>Message</TableCell>
            <TableCell>Expiry</TableCell>
            <TableCell>Actions</TableCell>

          </TableRow>

        </TableHead>

        <TableBody>

          {reminders.map(r => (

            <TableRow key={r.id}>

              <TableCell>{r.id}</TableCell>

              <TableCell>{r.Teacher?.name}</TableCell>

              <TableCell>{r.body}</TableCell>

              <TableCell>{r.expiry_date}</TableCell>

              <TableCell>

                <Button
                  color="error"
                  onClick={() => deleteReminder(r.id)}
                >
                  Delete
                </Button>

              </TableCell>

            </TableRow>

          ))}

        </TableBody>

      </Table>

    </div>

  );

}