import { useRef, useState, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRoom } from "./roomContext";
import { IoClose, IoAddCircleOutline } from "react-icons/io5";
import { BsStickyFill, BsBellFill } from "react-icons/bs";
import { LuUpload } from "react-icons/lu";
import { MdAnnouncement } from "react-icons/md";
import * as THREE from "three";
import { useParams } from "react-router-dom";
import { socket } from "../helper/socket";

const INTERACT_DISTANCE = 12;
const POLL_INTERVAL = 5000;
const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api`;

// ─── API ──────────────────────────────────────────────────────────────────────
const api = {
  getNotes: (roomId) =>
    fetch(`${API_BASE}/board/notes/room/${roomId}`).then((r) => {
      if (!r.ok) throw new Error(`getNotes ${r.status}`);
      return r.json();
    }),
  createNote: (userId, body) =>
    fetch(`${API_BASE}/board/notes/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => {
      if (!r.ok) throw new Error(`createNote ${r.status}`);
      return r.json();
    }),
  deleteNote: (id) =>
    fetch(`${API_BASE}/board/notes/${id}`, { method: "DELETE" }).then((r) => {
      if (!r.ok) throw new Error(`deleteNote ${r.status}`);
      return r.json();
    }),
  getAnnouncements: (roomId) =>
    fetch(`${API_BASE}/board/announcements/room/${roomId}`).then((r) => {
      if (!r.ok) throw new Error(`getAnnouncements ${r.status}`);
      return r.json();
    }),
  createAnnouncement: (userId, body) =>
    fetch(`${API_BASE}/board/announcements/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => {
      if (!r.ok) throw new Error(`createAnnouncement ${r.status}`);
      return r.json();
    }),
  deleteAnnouncement: (id) =>
    fetch(`${API_BASE}/board/announcements/${id}`, { method: "DELETE" }).then(
      (r) => {
        if (!r.ok) throw new Error(`deleteAnnouncement ${r.status}`);
        return r.json();
      },
    ),
  getFiles: (roomId) =>
    fetch(`${API_BASE}/board/files/room/${roomId}`).then((r) => {
      if (!r.ok) throw new Error(`getFiles ${r.status}`);
      return r.json();
    }),
  uploadFile: (formData) =>
    fetch(`${API_BASE}/board/files`, {
      method: "POST",
      body: formData,
    }).then((r) => {
      if (!r.ok) throw new Error(`uploadFile ${r.status}`);
      return r.json();
    }),
  deleteFile: (id) =>
    fetch(`${API_BASE}/board/files/${id}`, { method: "DELETE" }).then((r) => {
      if (!r.ok) throw new Error(`deleteFile ${r.status}`);
      return r.json();
    }),
};

// ─── Normalizers ──────────────────────────────────────────────────────────────
const normalizeNote = (n, fallbackUsername) => ({
  id: n.id,
  text: n.text,
  color: n.color || "yellow",
  author: n.username || n.author || fallbackUsername,
});
const normalizeAnnouncement = (a, fallbackUsername) => ({
  id: a.id,
  text: a.text,
  author: a.username || a.author || fallbackUsername,
  time: a.created_at
    ? new Date(a.created_at).toLocaleTimeString()
    : a.time || "",
});
const normalizeFile = (f, fallbackUsername) => ({
  id: f.id,
  name: f.file_name || f.name,
  url: f.file_url || f.url,
  type: f.file_type || f.type || "",
  uploader: f.username || f.uploader || f.uploaded_by || fallbackUsername,
});

// ─── ConfirmDialog ────────────────────────────────────────────────────────────
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)",
    }}
  >
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e2d45",
        borderRadius: "14px",
        padding: "24px 28px",
        minWidth: "260px",
        maxWidth: "320px",
        boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
        fontFamily: "sans-serif",
      }}
    >
      <p
        style={{
          color: "#e2e8f0",
          fontSize: "13px",
          lineHeight: 1.6,
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        {message}
      </p>
      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "7px 18px",
            borderRadius: "8px",
            border: "1px solid #1e2d45",
            background: "transparent",
            color: "#94a3b8",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: "7px 18px",
            borderRadius: "8px",
            border: "none",
            background: "#ef4444",
            color: "#fff",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

const useConfirm = () => {
  const [dialog, setDialog] = useState(null);
  const confirm = useCallback(
    (message) =>
      new Promise((resolve) => {
        setDialog({ message, resolve });
      }),
    [],
  );
  const handleConfirm = () => {
    dialog?.resolve(true);
    setDialog(null);
  };
  const handleCancel = () => {
    dialog?.resolve(false);
    setDialog(null);
  };
  const ConfirmUI = dialog ? (
    <ConfirmDialog
      message={dialog.message}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;
  return { confirm, ConfirmUI };
};

const canDelete = (role, itemAuthor, currentUsername) => {
  if (role === "instructor" || role === "prof") return true;
  return itemAuthor === currentUsername;
};

// ─── PostIt ───────────────────────────────────────────────────────────────────
const PostIt = ({ note, onDelete, showDelete }) => {
  const colors = {
    yellow: "bg-yellow-200 border-yellow-300 text-yellow-900",
    pink: "bg-pink-200 border-pink-300 text-pink-900",
    blue: "bg-blue-200 border-blue-300 text-blue-900",
    green: "bg-green-200 border-green-300 text-green-900",
  };
  return (
    <div
      className={`relative p-3 rounded-xl border text-xs font-medium shadow-sm select-none ${colors[note.color] || colors.yellow}`}
      style={{ flexShrink: 0 }}
    >
      {showDelete && (
        <button
          onClick={() => onDelete(note.id)}
          className="absolute top-1 right-1 opacity-40 hover:opacity-80 text-current"
        >
          <IoClose size={12} />
        </button>
      )}
      <p className="mt-1 break-words leading-relaxed">{note.text}</p>
      <p className="mt-2 opacity-50 text-[10px]">{note.author}</p>
    </div>
  );
};

const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
    <div
      style={{
        width: "16px",
        height: "16px",
        border: "2px solid #1e2d45",
        borderTop: "2px solid #60a5fa",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ─── File icon helper ─────────────────────────────────────────────────────────
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

// ─── File Notification Panel (student) ───────────────────────────────────────
export const FileNotificationPanel = () => {
  const [notifFiles, setNotifFiles] = useState([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    // Handle single file notify (legacy)
    const handleFileNotif = (data) => {
      const files = Array.isArray(data.files) ? data.files : [data.file];
      setNotifFiles((prev) => [...files, ...prev]);
      setUnread((u) => u + files.length);
    };
    socket.on("board-file-notify", handleFileNotif);
    return () => socket.off("board-file-notify", handleFileNotif);
  }, []);

  const handleOpen = () => {
    setOpen((o) => !o);
    if (!open) setUnread(0);
  };

  const downloadFile = async (file) => {
    try {
      const res = await fetch(file.url);
      if (!res.ok) throw new Error("fail");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(file.url, "_blank");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "52px",
        right: "12px",
        zIndex: 50,
        fontFamily: "sans-serif",
      }}
    >
      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{
          position: "relative",
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          background: "#111827",
          border: "1px solid #1e2d45",
          color: unread > 0 ? "#60a5fa" : "#64748b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        <BsBellFill size={15} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              background: "#ef4444",
              color: "#fff",
              fontSize: "9px",
              fontWeight: 700,
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "44px",
            right: 0,
            width: "300px",
            background: "#111827",
            border: "1px solid #1e2d45",
            borderRadius: "14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
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
              style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700 }}
            >
              Files from instructor
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <IoClose size={14} />
            </button>
          </div>

          <div
            style={{ maxHeight: "360px", overflowY: "auto", padding: "8px" }}
          >
            {notifFiles.length === 0 ? (
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
              notifFiles.map((file, i) => (
                <div
                  key={`${file.id}-${i}`}
                  style={{
                    background: "#1a2235",
                    borderRadius: "10px",
                    padding: "10px",
                    marginBottom: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
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
                      fontSize: "15px",
                      flexShrink: 0,
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
                      style={{ color: "#64748b", fontSize: "10px", margin: 0 }}
                    >
                      by {file.uploader}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadFile(file)}
                    style={{
                      color: "#60a5fa",
                      fontSize: "10px",
                      background: "rgba(59,130,246,0.1)",
                      border: "1px solid rgba(59,130,246,0.25)",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      cursor: "pointer",
                      flexShrink: 0,
                      fontWeight: 600,
                    }}
                  >
                    Download
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Announcement Toast (student) ─────────────────────────────────────────────
export const AnnouncementToast = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleAnnouncement = (data) => {
      const id = Date.now();
      setToasts((prev) => [
        ...prev,
        { id, text: data.text, author: data.author },
      ]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    };
    socket.on("board-announcement-notify", handleAnnouncement);
    return () => socket.off("board-announcement-notify", handleAnnouncement);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: "52px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        fontFamily: "sans-serif",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: "#111827",
            border: "1px solid #8b5cf6",
            borderLeft: "3px solid #8b5cf6",
            borderRadius: "10px",
            padding: "10px 16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            minWidth: "260px",
            maxWidth: "360px",
            animation: "slideIn 0.3s ease",
          }}
        >
          <MdAnnouncement
            size={14}
            color="#a78bfa"
            style={{ flexShrink: 0, marginTop: "1px" }}
          />
          <div>
            <p
              style={{
                color: "#a78bfa",
                fontSize: "10px",
                fontWeight: 700,
                margin: "0 0 2px",
              }}
            >
              {toast.author}
            </p>
            <p
              style={{
                color: "#e2e8f0",
                fontSize: "11px",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {toast.text}
            </p>
          </div>
        </div>
      ))}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

// ─── BoardUI ──────────────────────────────────────────────────────────────────
const BoardUI = ({ user, isInstructor, isNear, roomId, roomCode }) => {
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteColor, setNewNoteColor] = useState("yellow");
  const [notePosting, setNotePosting] = useState(false);

  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [announcementPosting, setAnnouncementPosting] = useState(false);

  const [boardFiles, setBoardFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Multi-select: set of file ids currently checked
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());
  const [broadcasting, setBroadcasting] = useState(false);
  const fileInputRef = useRef(null);

  const { confirm, ConfirmUI } = useConfirm();

  const role = user.role;
  const username = user.username;
  const userId = user.id || user.user_id;

  const noteColors = ["yellow", "pink", "blue", "green"];
  const colorDot = {
    yellow: "bg-yellow-300",
    pink: "bg-pink-300",
    blue: "bg-blue-300",
    green: "bg-green-300",
  };

  const fetchAll = useCallback(
    async (showLoading = false) => {
      if (!roomId) return;
      if (showLoading) {
        setNotesLoading(true);
        setAnnouncementsLoading(true);
        setFilesLoading(true);
      }
      const [notesResult, announcementsResult, filesResult] =
        await Promise.allSettled([
          api.getNotes(roomId),
          api.getAnnouncements(roomId),
          api.getFiles(roomId),
        ]);
      if (notesResult.status === "fulfilled") {
        setNotes(
          (Array.isArray(notesResult.value) ? notesResult.value : []).map((n) =>
            normalizeNote(n, username),
          ),
        );
      }
      if (announcementsResult.status === "fulfilled") {
        setAnnouncements(
          (Array.isArray(announcementsResult.value)
            ? announcementsResult.value
            : []
          ).map((a) => normalizeAnnouncement(a, username)),
        );
      }
      if (filesResult.status === "fulfilled") {
        setBoardFiles(
          (Array.isArray(filesResult.value) ? filesResult.value : []).map((f) =>
            normalizeFile(f, username),
          ),
        );
      }
      if (showLoading) {
        setNotesLoading(false);
        setAnnouncementsLoading(false);
        setFilesLoading(false);
      }
    },
    [roomId, username],
  );

  useEffect(() => {
    fetchAll(true);
    const interval = setInterval(() => fetchAll(false), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // ── Note handlers ──────────────────────────────────────────────────────────
  const addNote = async () => {
    if (!newNoteText.trim() || notePosting) return;
    setNotePosting(true);
    try {
      const res = await api.createNote(userId, {
        room_id: roomId,
        text: newNoteText.trim(),
        color: newNoteColor,
      });
      const n = res.note || res;
      setNotes((prev) => [
        ...prev,
        normalizeNote({ ...n, color: n.color || newNoteColor }, username),
      ]);
      setNewNoteText("");
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setNotePosting(false);
    }
  };

  const deleteNote = async (id) => {
    const ok = await confirm("Delete this note?");
    if (!ok) return;
    try {
      await api.deleteNote(id);
      setNotes((p) => p.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  // ── Announcement handlers (instructor only) ────────────────────────────────
  const addAnnouncement = async (notify = false) => {
    if (!newAnnouncement.trim() || announcementPosting) return;
    setAnnouncementPosting(true);
    try {
      const res = await api.createAnnouncement(userId, {
        room_id: roomId,
        text: newAnnouncement.trim(),
      });
      const a = res.announcement || res;
      const normalized = normalizeAnnouncement(
        {
          ...a,
          time: a.created_at
            ? new Date(a.created_at).toLocaleTimeString()
            : new Date().toLocaleTimeString(),
        },
        username,
      );
      setAnnouncements((prev) => [normalized, ...prev]);

      if (notify && roomCode) {
        socket.emit("board-announce", {
          roomCode,
          text: newAnnouncement.trim(),
          author: username,
        });
      }

      setNewAnnouncement("");
    } catch (err) {
      console.error("Failed to add announcement:", err);
    } finally {
      setAnnouncementPosting(false);
    }
  };

  const deleteAnnouncement = async (id) => {
    const ok = await confirm("Delete this announcement?");
    if (!ok) return;
    try {
      await api.deleteAnnouncement(id);
      setAnnouncements((p) => p.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete announcement:", err);
    }
  };

  // ── File handlers ──────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || uploading) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("room_id", roomId);
        formData.append("uploaded_by", userId);
        const res = await api.uploadFile(formData);
        const f = res.file || res;
        const normalized = normalizeFile(
          {
            ...f,
            name: f.file_name || f.name || file.name,
            type: f.file_type || f.type || file.type,
          },
          username,
        );
        setBoardFiles((prev) => [...prev, normalized]);
      }
    } catch (err) {
      console.error("Failed to upload file:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Toggle a single file selection
  const toggleFileSelect = (id) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Broadcast all selected files to students via socket
  const broadcastSelected = () => {
    if (!roomCode || selectedFileIds.size === 0 || broadcasting) return;
    setBroadcasting(true);
    const filesToSend = boardFiles.filter((f) => selectedFileIds.has(f.id));
    // Emit all selected files in one event
    socket.emit("board-file-notify", {
      roomCode,
      files: filesToSend,
    });
    setSelectedFileIds(new Set());
    setBroadcasting(false);
  };

  const deleteFile = async (id) => {
    const ok = await confirm("Delete this file?");
    if (!ok) return;
    try {
      await api.deleteFile(id);
      setBoardFiles((p) => p.filter((f) => f.id !== id));
      setSelectedFileIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  const downloadFile = async (file) => {
    try {
      const res = await fetch(file.url);
      if (!res.ok) throw new Error("fail");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(file.url, "_blank");
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const colStyle = {
    flex: 1,
    background: "#0f172a",
    borderRadius: "12px",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: 0,
    height: "340px",
    boxSizing: "border-box",
    overflow: "hidden",
    pointerEvents: isNear ? "auto" : "none",
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#94a3b8",
    fontSize: "11px",
    fontWeight: 700,
    paddingBottom: "6px",
    borderBottom: "1px solid #1e2d45",
    flexShrink: 0,
  };

  const listStyle = {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    paddingRight: "2px",
    scrollbarWidth: "thin",
    scrollbarColor: "#1e2d45 transparent",
  };

  const emptyText = { color: "#475569", fontSize: "11px", textAlign: "center" };

  return (
    <>
      {ConfirmUI}
      <div
        style={{
          width: "780px",
          background: "#111827",
          borderRadius: "16px",
          border: "1px solid #1e2d45",
          padding: "12px",
          fontFamily: "sans-serif",
          display: "flex",
          gap: "10px",
        }}
      >
        {/* ── NOTES ── */}
        <div style={colStyle}>
          <div style={headerStyle}>
            <BsStickyFill size={12} /> Notes
          </div>
          <textarea
            style={{
              width: "100%",
              background: "#0b0f1a",
              border: "1px solid #1e2d45",
              borderRadius: "8px",
              padding: "8px",
              color: "#e2e8f0",
              fontSize: "12px",
              outline: "none",
              resize: "none",
              boxSizing: "border-box",
              flexShrink: 0,
            }}
            placeholder="Write a note..."
            rows={2}
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                addNote();
              }
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", gap: "5px" }}>
              {noteColors.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewNoteColor(c)}
                  className={`w-4 h-4 rounded-full ${colorDot[c]} ${newNoteColor === c ? "ring-2 ring-white/40 scale-125" : ""}`}
                />
              ))}
            </div>
            <button
              onClick={addNote}
              disabled={notePosting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "3px",
                padding: "4px 10px",
                background: notePosting ? "#1e3a5f" : "#3b82f6",
                color: "#fff",
                fontSize: "11px",
                borderRadius: "7px",
                border: "none",
                cursor: notePosting ? "not-allowed" : "pointer",
              }}
            >
              <IoAddCircleOutline size={12} />
              {notePosting ? "Adding…" : "Add"}
            </button>
          </div>
          <div style={listStyle}>
            {notesLoading ? (
              <Spinner />
            ) : notes.length === 0 ? (
              <p style={emptyText}>No notes yet</p>
            ) : (
              notes.map((note) => (
                <PostIt
                  key={note.id}
                  note={note}
                  onDelete={deleteNote}
                  showDelete={canDelete(role, note.author, username)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── FILES ── */}
        <div style={colStyle}>
          <div style={headerStyle}>
            <LuUpload size={12} /> Files
            {/* Broadcast selected button — appears when any file is checked */}
            {isInstructor && selectedFileIds.size > 0 && (
              <button
                onClick={broadcastSelected}
                disabled={broadcasting}
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 9px",
                  background: broadcasting ? "#1e3a5f" : "#0ea5e9",
                  color: "#fff",
                  fontSize: "10px",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: "none",
                  cursor: broadcasting ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              >
                <BsBellFill size={9} />
                Broadcast {selectedFileIds.size} selected
              </button>
            )}
          </div>

          {/* Upload — instructor only */}
          {isInstructor && (
            <>
              <button
                onClick={() => !uploading && fileInputRef.current?.click()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  width: "100%",
                  padding: "9px",
                  border: "2px dashed #1e2d45",
                  borderRadius: "10px",
                  background: "none",
                  color: uploading ? "#3b82f6" : "#64748b",
                  fontSize: "11px",
                  cursor: uploading ? "not-allowed" : "pointer",
                  flexShrink: 0,
                  boxSizing: "border-box",
                  transition: "border-color 0.2s, color 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.color = "#60a5fa";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#1e2d45";
                  e.currentTarget.style.color = uploading
                    ? "#3b82f6"
                    : "#64748b";
                }}
              >
                <LuUpload size={14} />
                {uploading ? "Uploading…" : "Upload file"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
            </>
          )}

          <div style={listStyle}>
            {filesLoading ? (
              <Spinner />
            ) : boardFiles.length === 0 ? (
              <p style={emptyText}>No files yet</p>
            ) : (
              boardFiles.map((file) => {
                const isChecked = selectedFileIds.has(file.id);
                return (
                  <div
                    key={file.id}
                    style={{
                      background: isChecked ? "#0d2040" : "#1a2235",
                      borderRadius: "10px",
                      padding: "9px 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexShrink: 0,
                      position: "relative",
                      border: isChecked
                        ? "1px solid #0ea5e9"
                        : "1px solid transparent",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                  >
                    {/* Checkbox — instructor only */}
                    {isInstructor && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFileSelect(file.id)}
                        style={{
                          width: "13px",
                          height: "13px",
                          accentColor: "#0ea5e9",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      />
                    )}

                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "7px",
                        background: "#0b0f1a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        flexShrink: 0,
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

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        alignItems: "flex-end",
                        flexShrink: 0,
                      }}
                    >
                      <button
                        onClick={() => downloadFile(file)}
                        style={{
                          color: "#60a5fa",
                          fontSize: "10px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Download
                      </button>
                    </div>

                    {canDelete(role, file.uploader, username) && (
                      <button
                        onClick={() => deleteFile(file.id)}
                        style={{
                          position: "absolute",
                          top: "6px",
                          right: "6px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#64748b",
                          padding: 0,
                          lineHeight: 1,
                          opacity: 0.5,
                          transition: "opacity 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.opacity = 1)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.opacity = 0.5)
                        }
                      >
                        <IoClose size={12} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Hint text for instructor when no files selected */}
          {isInstructor &&
            boardFiles.length > 0 &&
            selectedFileIds.size === 0 && (
              <p
                style={{
                  color: "#334155",
                  fontSize: "10px",
                  textAlign: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                ☑ Check files to broadcast to students
              </p>
            )}
        </div>

        {/* ── ANNOUNCEMENTS ── */}
        <div style={colStyle}>
          <div style={headerStyle}>
            <MdAnnouncement size={12} /> Announcements
          </div>

          {/* Post area — instructor only */}
          {isInstructor && (
            <>
              <textarea
                style={{
                  width: "100%",
                  background: "#0b0f1a",
                  border: "1px solid #1e2d45",
                  borderRadius: "8px",
                  padding: "8px",
                  color: "#e2e8f0",
                  fontSize: "12px",
                  outline: "none",
                  resize: "none",
                  boxSizing: "border-box",
                  flexShrink: 0,
                }}
                placeholder="Post an announcement..."
                rows={2}
                value={newAnnouncement}
                onChange={(e) => setNewAnnouncement(e.target.value)}
              />
              <div style={{ display: "flex", gap: "5px", flexShrink: 0 }}>
                <button
                  onClick={() => addAnnouncement(false)}
                  disabled={announcementPosting}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    padding: "5px",
                    background: announcementPosting ? "#5b3fa8" : "#8b5cf6",
                    color: "#fff",
                    fontSize: "11px",
                    borderRadius: "7px",
                    border: "none",
                    cursor: announcementPosting ? "not-allowed" : "pointer",
                  }}
                >
                  <MdAnnouncement size={12} />
                  Post
                </button>
                <button
                  onClick={() => addAnnouncement(true)}
                  disabled={announcementPosting}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    padding: "5px",
                    background: announcementPosting ? "#1e3a5f" : "#0ea5e9",
                    color: "#fff",
                    fontSize: "11px",
                    borderRadius: "7px",
                    border: "none",
                    cursor: announcementPosting ? "not-allowed" : "pointer",
                  }}
                >
                  <BsBellFill size={10} />
                  Post & Notify All
                </button>
              </div>
            </>
          )}

          <div style={listStyle}>
            {announcementsLoading ? (
              <Spinner />
            ) : announcements.length === 0 ? (
              <p style={emptyText}>No announcements yet</p>
            ) : (
              announcements.map((a) => (
                <div
                  key={a.id}
                  style={{
                    background: "#1a2235",
                    borderRadius: "10px",
                    padding: "10px",
                    borderLeft: "2px solid #8b5cf6",
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "3px",
                    }}
                  >
                    <span
                      style={{
                        color: "#a78bfa",
                        fontSize: "10px",
                        fontWeight: 600,
                      }}
                    >
                      {a.author}
                    </span>
                    <span style={{ color: "#475569", fontSize: "10px" }}>
                      {a.time}
                    </span>
                  </div>
                  <p
                    style={{
                      color: "#e2e8f0",
                      fontSize: "11px",
                      lineHeight: 1.5,
                      margin: 0,
                      paddingRight: canDelete(role, a.author, username)
                        ? "16px"
                        : 0,
                    }}
                  >
                    {a.text}
                  </p>
                  {canDelete(role, a.author, username) && (
                    <button
                      onClick={() => deleteAnnouncement(a.id)}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#64748b",
                        padding: 0,
                        lineHeight: 1,
                        opacity: 0.5,
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity = 0.5)
                      }
                    >
                      <IoClose size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
      `}</style>
    </>
  );
};

// ─── ClassBoard ───────────────────────────────────────────────────────────────
export default function ClassBoard({
  position = [-3, 1.8, 0],
  rotation = [0, Math.PI / 2, 0],
}) {
  const meshRef = useRef();
  const [isNear, setIsNear] = useState(false);
  const { avatarPosition } = useRoom();
  const { roomCode } = useParams();

  const user = JSON.parse(localStorage.getItem("userSession") || "{}");
  const room = JSON.parse(localStorage.getItem("currentRoom") || "{}");
  const roomId = room.id || room.room_id || room.room_code;
  const isInstructor = user.role === "instructor";

  useFrame(() => {
    if (!meshRef.current || !avatarPosition) return;
    const boardPos = new THREE.Vector3(...position);
    const pos = new THREE.Vector3(...avatarPosition);
    setIsNear(pos.distanceTo(boardPos) < INTERACT_DISTANCE);
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation}>
      <planeGeometry args={[5, 3]} />
      <meshStandardMaterial color="#1a2235" />
      <Html
        transform
        prepend
        distanceFactor={1.5}
        position={[0, 0, 0.01]}
        center
        zIndexRange={[0, 0]}
      >
        <BoardUI
          user={user}
          isInstructor={isInstructor}
          isNear={isNear}
          roomId={roomId}
          roomCode={roomCode}
        />
      </Html>
      <Html
        transform
        prepend
        distanceFactor={8}
        position={[0, -1.6, 0.01]}
        center
        zIndexRange={[0, 0]}
      >
        <div
          style={{
            color: isNear ? "#60a5fa" : "#64748b",
            fontSize: "11px",
            fontFamily: "sans-serif",
            background: "rgba(11,15,26,0.7)",
            padding: "2px 8px",
            borderRadius: "6px",
            whiteSpace: "nowrap",
            transition: "color 0.3s",
            pointerEvents: "none",
          }}
        >
          {isNear ? "Board" : "Walk closer to interact"}
        </div>
      </Html>
    </mesh>
  );
}
