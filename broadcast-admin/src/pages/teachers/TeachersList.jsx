import { useEffect, useState } from "react";
import { Table, TableHead, TableRow, TableCell, TableBody, Paper, Button } from "@mui/material";
import { getTeachers, deleteTeacher } from "../../api/teacherApi";

const BASE_URL = "http://localhost:5000";

const Avatar = ({ src, name }) => (
  src
    ? <img src={`${BASE_URL}/${src}`} alt={name}
        style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #e0e0e0" }}
        onError={e => { e.target.style.display = "none"; }} />
    : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f3e5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600, color: "#6a1b9a" }}>
        {name?.[0]?.toUpperCase() || "T"}
      </div>
);

export default function TeachersList() {
  const [teachers, setTeachers] = useState([]);

  const fetchTeachers = async () => {
    const data = await getTeachers();
    setTeachers(data);
  };

  useEffect(() => { fetchTeachers(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this teacher?")) return;
    await deleteTeacher(id);
    fetchTeachers();
  };

  return (
    <Paper style={{ padding: 20 }}>
      <h2>Teachers</h2>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Photo</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Subject</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>ERP ID</TableCell>
            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {teachers.map((teacher) => (
            <TableRow key={teacher.id}>
              <TableCell><Avatar src={teacher.profile_image} name={teacher.name} /></TableCell>
              <TableCell>{teacher.name}</TableCell>
              <TableCell>{teacher.subject_taught}</TableCell>
              <TableCell>{teacher.phone_number}</TableCell>
              <TableCell>{teacher.erp_id}</TableCell>
              <TableCell>
                <Button color="error" variant="contained" onClick={() => handleDelete(teacher.id)}>
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}