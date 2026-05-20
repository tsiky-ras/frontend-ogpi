import { Outlet } from "react-router-dom";
import Sidebar from "../../components/sidebar/Sidebar.tsx";

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
