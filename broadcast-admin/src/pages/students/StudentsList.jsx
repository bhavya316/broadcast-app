import { useEffect, useState } from "react";
import { Table, TableHead, TableRow, TableCell, TableBody, Paper, Button } from "@mui/material";
import { getStudents, deleteStudent } from "../../api/studentApi";

const BASE_URL = "http://localhost:5000";

const Avatar = ({ src, name }) => (
  src
    ? <img src={`${BASE_URL}/${src}`} alt={name}
        style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #e0e0e0" }}
        onError={e => { e.target.style.display = "none"; }} />
    : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e3f2fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600, color: "#1565c0" }}>
        {name?.[0]?.toUpperCase() || "S"}
      </div>
);

export default function StudentsList() {
  const [students, setStudents] = useState([]);

  const fetchStudents = async () => {
    const data = await getStudents();
    setStudents(data);
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this student?")) return;
    await deleteStudent(id);
    fetchStudents();
  };

  return (
    <Paper style={{ padding: 20 }}>
      <h2>Students</h2>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Photo</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Class</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>ERP ID</TableCell>
            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell><Avatar src={student.profile_image} name={student.name} /></TableCell>
              <TableCell>{student.name}</TableCell>
              <TableCell>{student.standard}</TableCell>
              <TableCell>{student.phone_number}</TableCell>
              <TableCell>{student.erp_id}</TableCell>
              <TableCell>
                <Button color="error" variant="contained" onClick={() => handleDelete(student.id)}>
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