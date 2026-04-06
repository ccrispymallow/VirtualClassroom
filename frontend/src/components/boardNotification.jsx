import { useState, useEffect, useRef, useCallback } from "react";
import { BsBellFill, BsBell } from "react-icons/bs";
import { socket } from "../helper/socket";

const TOAST_TTL = 7000;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const fileIcon = (type) => {
  if (!type) return "📁";
  if (type.startsWith("image/")) return "🖼️";
  if (type === "application/pdf") return "📄";
  if (type.includes("word") || type.includes("document")) return "📝";
  if (type.includes("sheet") || type.includes("excel")) return "📊";
  if (type.includes("presentation") || type.includes("powerpoint")) return "📋";
  if (type.includes("zip") || type.includes("compressed")) return "🗜️";
  return "📁";
};

const buildFileUrl = (relativeUrl) => `${BACKEND_URL}${relativeUrl}`;

const downloadFile = async (file) => {
  const fullUrl = buildFileUrl(file.url);
  try {
    const res = await fetch(fullUrl);
    if (!res.ok) throw new Error("fail");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    window.open(fullUrl, "_blank");
  }
};

const ToastCard = ({ toast, onDismiss }) => {
  const isFile = toast.type === "file";
  const accent = isFile ? "#0ea5e9" : "#8b5cf6";
  const [pct, setPct] = useState(100);
  const rafRef = useRef(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.max(0, 100 - (elapsed / TOAST_TTL) * 100);
      setPct(p);
      if (p > 0) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      style={{
        background: "#111827",
        border: `1px solid ${accent}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: "12px",
        padding: "11px 13px 10px",
        width: "300px",
        boxShadow: "0 8px 28px rgba(0,0,0,0.6)",
        position: "relative",
        overflow: "hidden",
        animation: "slideInRight 0.22s ease",
        fontFamily: "sans-serif",
      }}
    >
      {/* header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "7px",
        }}
      >
        <span style={{ fontSize: "12px" }}>{isFile ? "📎" : "📢"}</span>
        <span
          style={{
            color: isFile ? "#38bdf8" : "#a78bfa",
            fontSize: "10px",
            fontWeight: 700,
            flex: 1,
          }}
        >
          {isFile ? "Files from instructor" : "Announcement"}
        </span>
        <button
          onClick={() => onDismiss(toast.id)}
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            padding: 0,
            lineHeight: 1,
            fontSize: "14px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
        >
          ✕
        </button>
      </div>

      {/* body */}
      {isFile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {toast.files.map((file, i) => (
            <div
              key={`${file.id}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#1a2235",
                borderRadius: "8px",
                padding: "7px 9px",
              }}
            >
              <span style={{ fontSize: "16px" }}>{fileIcon(file.type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    color: "#e2e8f0",
                    fontSize: "11px",
                    fontWeight: 600,
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {file.name}
                </p>
                <p style={{ color: "#64748b", fontSize: "10px", margin: 0 }}>
                  by {file.uploader}
                </p>
              </div>
              <button
                onClick={() => downloadFile(file)}
                style={{
                  color: "#38bdf8",
                  fontSize: "10px",
                  fontWeight: 700,
                  background: "rgba(14,165,233,0.1)",
                  border: "1px solid rgba(14,165,233,0.25)",
                  borderRadius: "5px",
                  padding: "2px 8px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                ↓
              </button>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p
            style={{
              color: "#a78bfa",
              fontSize: "10px",
              fontWeight: 700,
              margin: "0 0 3px",
            }}
          >
            {toast.author}
          </p>
          <p
            style={{
              color: "#e2e8f0",
              fontSize: "11px",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {toast.text}
          </p>
        </>
      )}

      {/* timer bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "2px",
          width: `${pct}%`,
          background: accent,
          transition: "none",
          borderRadius: "0 0 0 12px",
        }}
      />
    </div>
  );
};

// file history bell panel
const FileBellPanel = ({ files, announcements }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("files");
  const [seenFilesCount, setSeenFilesCount] = useState(0);
  const [seenAnnounceCount, setSeenAnnounceCount] = useState(0);

  const unreadFiles = files.length - seenFilesCount;
  const unreadAnnounce = announcements.length - seenAnnounceCount;
  const totalUnread = unreadFiles + unreadAnnounce;

  const toggle = () =>
    setOpen((o) => {
      if (!o) {
        if (activeTab === "files") setSeenFilesCount(files.length);
        else setSeenAnnounceCount(announcements.length);
      }
      return !o;
    });

  useEffect(() => {
    if (open) {
      if (activeTab === "files") setSeenFilesCount(files.length);
      else setSeenAnnounceCount(announcements.length);
    }
  }, [files.length, announcements.length, open, activeTab]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    if (tab === "files") setSeenFilesCount(files.length);
    else setSeenAnnounceCount(announcements.length);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* bell icon button */}
      <button
        onClick={toggle}
        title="Notifications"
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "9px",
          background: "#111827",
          border: `1px solid ${totalUnread > 0 ? "#0ea5e9" : "#1e2d45"}`,
          color: totalUnread > 0 ? "#38bdf8" : "#94a3b8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          lineHeight: 0,
          padding: 0,
        }}
      >
        {totalUnread > 0 ? <BsBellFill size={16} /> : <BsBell size={16} />}
        {totalUnread > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              background: "#ef4444",
              color: "#fff",
              fontSize: "9px",
              fontWeight: 700,
              minWidth: "16px",
              height: "16px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
            }}
          >
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {/* dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "42px",
            right: 0,
            width: "300px",
            background: "#111827",
            border: "1px solid #1e2d45",
            borderRadius: "14px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.65)",
            overflow: "hidden",
            zIndex: 400,
            fontFamily: "sans-serif",
          }}
        >
          {/* header */}
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid #1e2d45",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                color: "#94a3b8",
                fontSize: "11px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <BsBellFill size={11} /> Notifications
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                padding: 0,
                fontSize: "14px",
              }}
            >
              ✕
            </button>
          </div>

          {/* tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #1e2d45" }}>
            {[
              { key: "files", label: "📎 Files", count: unreadFiles },
              {
                key: "announce",
                label: "📢 Announcements",
                count: unreadAnnounce,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => switchTab(tab.key)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  background: "none",
                  border: "none",
                  borderRadius: 0,
                  borderBottom:
                    activeTab === tab.key
                      ? "2px solid #0ea5e9"
                      : "2px solid transparent",
                  color: activeTab === tab.key ? "#e2e8f0" : "#64748b",
                  fontSize: "10px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      fontSize: "9px",
                      fontWeight: 700,
                      minWidth: "14px",
                      height: "14px",
                      borderRadius: "7px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 3px",
                    }}
                  >
                    {tab.count > 9 ? "9+" : tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* content */}
          <div
            style={{ maxHeight: "360px", overflowY: "auto", padding: "8px" }}
          >
            {activeTab === "files" ? (
              files.length === 0 ? (
                <p
                  style={{
                    color: "#475569",
                    fontSize: "11px",
                    textAlign: "center",
                    padding: "16px 0",
                  }}
                >
                  No files sent yet
                </p>
              ) : (
                files.map((file, i) => (
                  <div
                    key={`${file.id ?? i}`}
                    style={{
                      background: "#1a2235",
                      borderRadius: "10px",
                      padding: "10px",
                      marginBottom: "6px",
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                    }}
                  >
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "7px",
                        background: "#0b0f1a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: "16px",
                      }}
                    >
                      {fileIcon(file.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          color: "#e2e8f0",
                          fontSize: "11px",
                          fontWeight: 600,
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {file.name}
                      </p>
                      <p
                        style={{
                          color: "#64748b",
                          fontSize: "10px",
                          margin: 0,
                        }}
                      >
                        by {file.uploader}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadFile(file)}
                      style={{
                        color: "#38bdf8",
                        fontSize: "10px",
                        fontWeight: 600,
                        background: "rgba(14,165,233,0.1)",
                        border: "1px solid rgba(14,165,233,0.25)",
                        borderRadius: "6px",
                        padding: "3px 9px",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      Download
                    </button>
                  </div>
                ))
              )
            ) : announcements.length === 0 ? (
              <p
                style={{
                  color: "#475569",
                  fontSize: "11px",
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                No announcements yet
              </p>
            ) : (
              announcements.map((ann, i) => (
                <div
                  key={i}
                  style={{
                    background: "#1a2235",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    marginBottom: "6px",
                    borderLeft: "3px solid #8b5cf6",
                  }}
                >
                  <p
                    style={{
                      color: "#a78bfa",
                      fontSize: "10px",
                      fontWeight: 700,
                      margin: "0 0 4px",
                    }}
                  >
                    📢 {ann.author}
                  </p>
                  <p
                    style={{
                      color: "#e2e8f0",
                      fontSize: "11px",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {ann.text}
                  </p>
                  {ann.time && (
                    <p
                      style={{
                        color: "#475569",
                        fontSize: "9px",
                        margin: "4px 0 0",
                      }}
                    >
                      {new Date(ann.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export function BoardNotifications({ isInstructor = false }) {
  const [toasts, setToasts] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [allAnnouncements, setAllAnnouncements] = useState([]);

  const dismiss = useCallback(
    (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    [],
  );

  const addToastRef = useRef(null);
  addToastRef.current = (toast) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== toast.id)),
      TOAST_TTL,
    );
  };

  useEffect(() => {
    const onAnnounce = ({ text, author }) => {
      setAllAnnouncements((prev) => [
        { text, author, time: Date.now() },
        ...prev,
      ]);
      addToastRef.current({
        id: `announce-${Date.now()}`,
        type: "announce",
        text,
        author,
      });
    };

    const onFileNotify = (data) => {
      const files = Array.isArray(data.files)
        ? data.files
        : data.file
          ? [data.file]
          : [];
      if (!files.length) return;
      setAllFiles((prev) => [...files, ...prev]);
      addToastRef.current({ id: `files-${Date.now()}`, type: "file", files });
    };

    socket.on("board-announcement-notify", onAnnounce);
    socket.on("board-file-notify", onFileNotify);
    return () => {
      socket.off("board-announcement-notify", onAnnounce);
      socket.off("board-file-notify", onFileNotify);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { opacity:0; transform:translateX(20px); }
          to   { opacity:1; transform:translateX(0); }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          top: "52px",
          right: "10px",
          zIndex: 150,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "8px",
          fontFamily: "sans-serif",
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          {!isInstructor && (
            <FileBellPanel files={allFiles} announcements={allAnnouncements} />
          )}
        </div>
        {[...toasts].reverse().map((toast) => (
          <div key={toast.id} style={{ pointerEvents: "auto" }}>
            <ToastCard toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </>
  );
}

export default BoardNotifications;
