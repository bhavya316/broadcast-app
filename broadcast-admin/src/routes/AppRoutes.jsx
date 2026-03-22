import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import TeachersList from "../pages/teachers/TeachersList";
import StudentsList from "../pages/students/StudentsList";
import SubjectAssignment from "../pages/subjects/SubjectAssignment";
import BatchStudents from "../pages/batches/BatchStudents";
import StudyMaterials from "../pages/materials/StudyMaterials";
import UserControl from "../pages/users/UserDeletion";
import AdminLayout from "../components/layout/AdminLayout";
import AdminReminders from "../pages/reminders/Reminders";
import AdminNotices from "../pages/notices/AdminNotices";
import NoticeApproval from "../pages/notices/NoticeApproval";
import CreateInstituteNotice from "../pages/notices/CreateInstituteNotice";
import Reports from "../pages/reports/Reports";

export default function AppRoutes() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          }
        />

        <Route
          path="/teachers"
          element={
            <AdminLayout>
              <TeachersList />
            </AdminLayout>
          }
        />

        <Route
          path="/students"
          element={
            <AdminLayout>
              <StudentsList />
            </AdminLayout>
          }
        />

        <Route
          path="/subjects"
          element={
            <AdminLayout>
              <SubjectAssignment />
            </AdminLayout>
          }
        />

        <Route
          path="/batch-students"
          element={
            <AdminLayout>
              <BatchStudents />
            </AdminLayout>
          }
        />

        <Route
          path="/reminders"
          element={
            <AdminLayout>
              <AdminReminders />
            </AdminLayout>
          }
        />

        <Route
          path="/notices"
          element={
            <AdminLayout>
              <AdminNotices />
            </AdminLayout>
          }
        />

        <Route
          path="/notice-approvals"
          element={
            <AdminLayout>
              <NoticeApproval />
            </AdminLayout>
          }
        />

        <Route
          path="/materials"
          element={
            <AdminLayout>
              <StudyMaterials />
            </AdminLayout>
          }
        />

        <Route
          path="/reports"
          element={
            <AdminLayout>
              <Reports />
            </AdminLayout>
          }
        />

        <Route
          path="/create-institute-notice"
          element={<CreateInstituteNotice />}
        />

        <Route
          path="/users"
          element={
            <AdminLayout>
              <UserControl />
            </AdminLayout>
          }
        />

      </Routes>

    </BrowserRouter>
  );
}