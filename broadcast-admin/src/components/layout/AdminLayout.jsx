import Sidebar from "./Sidebar";

export default function AdminLayout({ children }) {
  return (
    <div style={{ display: "flex" }}>
      
      <Sidebar />

      <div
        style={{
          marginLeft: "230px",
          width: "100%",
          padding: "20px",
          background: "#f5f6fa",
          minHeight: "100vh"
        }}
      >
        {children}
      </div>

    </div>
  );
}