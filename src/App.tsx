import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "@/components/auth/RequireAuth";
import { useAuthStore } from "@/stores/authStore";
import { useT } from "@/i18n/useT";
import Login from "@/pages/Login";
import EmployeeLayout from "@/pages/employee/EmployeeLayout";
import EmployeeDashboard from "@/pages/employee/Dashboard";
import EmployeeClock from "@/pages/employee/Clock";
import EmployeeRequests from "@/pages/employee/Requests";
import EmployeeAttendance from "@/pages/employee/Attendance";
import EmployeePayroll from "@/pages/employee/Payroll";
import EmployeeAnnouncements from "@/pages/employee/Announcements";
import EmployeeTasks from "@/pages/employee/Tasks";
import EmployeeNotifications from "@/pages/employee/Notifications";
import EmployeePerformance from "@/pages/employee/Performance";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminEmployees from "@/pages/admin/Employees";
import AdminApprovals from "@/pages/admin/Approvals";
import AdminPayroll from "@/pages/admin/Payroll";
import AdminAnalytics from "@/pages/admin/Analytics";
import AdminAccount from "@/pages/admin/AdminAccount";
import ApprovalSettings from "@/pages/admin/ApprovalSettings";
import PerformanceSettings from "@/pages/admin/PerformanceSettings";
import PerformanceDashboard from "@/pages/admin/PerformanceDashboard";

function IndexRedirect() {
  const { token, role } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <Navigate to={role === "admin" ? "/admin" : "/app"} replace />;
}

function NotFound() {
  const t = useT();
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 text-center">
      <div>
        <div className="text-2xl font-semibold text-zinc-100">{t("app.notFound.title")}</div>
        <div className="mt-2 text-sm text-zinc-400">{t("app.notFound.desc")}</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<IndexRedirect />} />
        <Route path="/login" element={<Login />} />

        <Route element={<RequireAuth role="employee" />}>
          <Route path="/app" element={<EmployeeLayout />}>
            <Route index element={<EmployeeDashboard />} />
            <Route path="clock" element={<EmployeeClock />} />
            <Route path="requests" element={<EmployeeRequests />} />
            <Route path="attendance" element={<EmployeeAttendance />} />
            <Route path="payroll" element={<EmployeePayroll />} />
            <Route path="notifications" element={<EmployeeNotifications />} />
            <Route path="announcements" element={<EmployeeAnnouncements />} />
            <Route path="tasks" element={<EmployeeTasks />} />
            <Route path="performance" element={<EmployeePerformance />} />
          </Route>
        </Route>

        <Route element={<RequireAuth role="admin" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="employees" element={<AdminEmployees />} />
            <Route path="approvals" element={<AdminApprovals />} />
            <Route path="approval-settings" element={<ApprovalSettings />} />
            <Route path="performance-settings" element={<PerformanceSettings />} />
            <Route path="performance-dashboard" element={<PerformanceDashboard />} />
            <Route path="payroll" element={<AdminPayroll />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="admin-account" element={<AdminAccount />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
