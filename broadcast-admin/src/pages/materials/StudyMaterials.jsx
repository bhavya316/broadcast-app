import { useEffect, useState, useMemo } from "react";
import api from "../../api/axios";

const BASE_URL = "http://localhost:5000";

const TYPE_COLORS = {
  image:    { bg: "#fff0f6", color: "#c2185b", label: "Image" },
  document: { bg: "#e8f4fd", color: "#1565c0", label: "Document" },
  pdf:      { bg: "#fff3e0", color: "#e65100", label: "PDF" },
  file:     { bg: "#f3f0ff", color: "#5e35b1", label: "File" },
};

function getTypeInfo(fileType, fileName) {
  if (fileType === "image") return TYPE_COLORS.image;
  const ext = (fileName || "").split(".").pop().toLowerCase();
  if (ext === "pdf") return TYPE_COLORS.pdf;
  if (["doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt"].includes(ext)) return TYPE_COLORS.document;
  return TYPE_COLORS[fileType] || TYPE_COLORS.file;
}

function FileIcon({ fileType, fileName, size = 36 }) {
  const ext = (fileName || "").split(".").pop().toLowerCase();
  const isImage = fileType === "image";
  const isPdf   = ext === "pdf";
  const isDoc   = ["doc", "docx"].includes(ext);
  const isPpt   = ["ppt", "pptx"].includes(ext);
  const isXls   = ["xls", "xlsx"].includes(ext);
  const info = getTypeInfo(fileType, fileName);
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, borderRadius: 8, background: info.bg, color: info.color }}>
      {isImage ? "🖼️" : isPdf ? "📄" : isDoc ? "📝" : isPpt ? "📊" : isXls ? "📈" : "📎"}
    </div>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function StudyMaterials() {
  const [materials, setMaterials]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [search, setSearch]           = useState("");
  const [filterBatch, setFilterBatch] = useState("all");
  const [filterType, setFilterType]   = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [sortBy, setSortBy]           = useState("newest");
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => {
    api.get("/admin/study-materials")
      .then(res => setMaterials(res.data.materials || []))
      .catch(() => setError("Failed to load study materials."))
      .finally(() => setLoading(false));
  }, []);

  const batches = useMemo(() => {
    const seen = new Map();
    materials.forEach(m => { if (m.batch_name) seen.set(m.batch_name, m.batch_name); });
    return Array.from(seen.values());
  }, [materials]);

  const filtered = useMemo(() => {
    let list = [...materials];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.original_name?.toLowerCase().includes(q) ||
        m.teacher_name?.toLowerCase().includes(q) ||
        m.batch_name?.toLowerCase().includes(q) ||
        m.message?.toLowerCase().includes(q)
      );
    }
    if (filterBatch  !== "all") list = list.filter(m => m.batch_name === filterBatch);
    if (filterType   !== "all") list = list.filter(m => (m.file_type || "file") === filterType);
    if (filterSource !== "all") list = list.filter(m => m.source === filterSource);
    list.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.sent_at) - new Date(a.sent_at);
      if (sortBy === "oldest") return new Date(a.sent_at) - new Date(b.sent_at);
      if (sortBy === "name")   return (a.original_name || "").localeCompare(b.original_name || "");
      return 0;
    });
    return list;
  }, [materials, search, filterBatch, filterType, filterSource, sortBy]);

  const stats = useMemo(() => ({
    total:     materials.length,
    images:    materials.filter(m => m.file_type === "image").length,
    documents: materials.filter(m => m.file_type === "document").length,
    batches:   new Set(materials.filter(m => m.batch_id).map(m => m.batch_id)).size,
  }), [materials]);

  const sel = { padding: "8px 12px", borderRadius: 8, border: "1px solid #e0e0e0", fontSize: 14, outline: "none", background: "#fafafa", cursor: "pointer" };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid #e0e0e0", borderTop: "3px solid #1976d2", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ color: "#888" }}>Loading study materials…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ padding: 32, color: "#c62828", background: "#fff8f8", borderRadius: 12, margin: 24, border: "1px solid #ffcdd2" }}>⚠️ {error}</div>
  );

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#1a1a1a" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#0d1b2a", letterSpacing: "-0.5px" }}>Study Materials</h1>
        <p style={{ margin: "4px 0 0", color: "#666", fontSize: 14 }}>All files shared across batch chats and private conversations</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Files",  value: stats.total,     icon: "📁", bg: "#e8f4fd", accent: "#1565c0" },
          { label: "Images",       value: stats.images,    icon: "🖼️", bg: "#fff0f6", accent: "#c2185b" },
          { label: "Documents",    value: stats.documents, icon: "📄", bg: "#fff3e0", accent: "#e65100" },
          { label: "Batches",      value: stats.batches,   icon: "👥", bg: "#f0fdf4", accent: "#2e7d32" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, border: `1px solid ${s.accent}22` }}>
            <span style={{ fontSize: 28 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.accent, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", border: "1px solid #ebebeb", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <input
          placeholder="🔍  Search files, teachers, batches…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...sel, flex: "1 1 220px", minWidth: 200 }}
        />
        <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)} style={sel}>
          <option value="all">All Batches</option>
          {batches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={sel}>
          <option value="all">All Types</option>
          <option value="image">Images</option>
          <option value="document">Documents</option>
          <option value="file">Other Files</option>
        </select>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={sel}>
          <option value="all">All Sources</option>
          <option value="batch">Batch Chats</option>
          <option value="private">Private Chats</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={sel}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name A–Z</option>
        </select>
        <span style={{ marginLeft: "auto", color: "#888", fontSize: 13, whiteSpace: "nowrap" }}>
          {filtered.length} file{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#999", background: "#fafafa", borderRadius: 12, border: "1px dashed #ddd" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>No files found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your filters or search term</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtered.map(item => {
            const typeInfo = getTypeInfo(item.file_type, item.original_name);
            const fileUrl  = `${BASE_URL}/${item.file_url}`;
            const isImage  = item.file_type === "image";
            const fileName = item.original_name?.split("/").pop() || item.original_name || "file";

            return (
              <div key={`${item.source}-${item.id}`}
                style={{ background: "#fff", border: "1px solid #ebebeb", borderRadius: 12, overflow: "hidden", transition: "box-shadow 0.15s, transform 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.10)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
              >
                {/* Preview area */}
                {isImage ? (
                  <div onClick={() => setPreviewItem(item)} style={{ height: 160, overflow: "hidden", background: "#f5f5f5", cursor: "pointer" }}>
                    <img src={fileUrl} alt={fileName} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                  </div>
                ) : (
                  <div style={{ height: 80, background: typeInfo.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileIcon fileType={item.file_type} fileName={item.original_name} size={44} />
                  </div>
                )}

                {/* Body */}
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4 }}>
                    {fileName}
                  </div>
                  {item.message && (
                    <div style={{ fontSize: 12, color: "#777", marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      "{item.message}"
                    </div>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: typeInfo.bg, color: typeInfo.color, fontWeight: 600 }}>{typeInfo.label}</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: item.source === "batch" ? "#e8f5e9" : "#f3e5f5", color: item.source === "batch" ? "#2e7d32" : "#6a1b9a", fontWeight: 600 }}>
                      {item.source === "batch" ? "Batch" : "Private"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>
                    👨‍🏫 <strong style={{ color: "#555" }}>{item.teacher_name}</strong>
                    {item.batch_name && item.source === "batch" && <> · 👥 <strong style={{ color: "#555" }}>{item.batch_name}</strong></>}
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 12 }}>🕐 {formatDate(item.sent_at)}</div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <a href={fileUrl} download={fileName} target="_blank" rel="noreferrer"
                      style={{ flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 8, background: "#1976d2", color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                      ⬇ Download
                    </a>
                    {isImage ? (
                      <button onClick={() => setPreviewItem(item)}
                        style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", color: "#555", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        🔍 Preview
                      </button>
                    ) : (
                      <a href={fileUrl} target="_blank" rel="noreferrer"
                        style={{ flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", color: "#555", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                        👁 Open
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewItem && (
        <div onClick={() => setPreviewItem(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, overflow: "hidden", maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{previewItem.original_name?.split("/").pop()}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{previewItem.teacher_name} · {previewItem.batch_name} · {formatDate(previewItem.sent_at)}</div>
              </div>
              <button onClick={() => setPreviewItem(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888", padding: "4px 8px" }}>✕</button>
            </div>
            <img src={`${BASE_URL}/${previewItem.file_url}`} alt={previewItem.original_name} style={{ maxWidth: "80vw", maxHeight: "75vh", objectFit: "contain" }} />
          </div>
        </div>
      )}
    </div>
  );
}