import { useRef, useState, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRoom } from "./roomContext";
import { IoClose, IoAddCircleOutline } from "react-icons/io5";
import { BsStickyFill } from "react-icons/bs";
import { LuUpload } from "react-icons/lu";
import { MdAnnouncement } from "react-icons/md";
import * as THREE from "three";
import { useParams } from "react-router-dom";

const INTERACT_DISTANCE = 12;
const POLL_INTERVAL = 5000;

const API_BASE = "/api";

const api = {
  // Notes
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

  // Announcements
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
    fetch(`${API_BASE}/board/announcements/${id}`, {
      method: "DELETE",
    }).then((r) => {
      if (!r.ok) throw new Error(`deleteAnnouncement ${r.status}`);
      return r.json();
    }),

  // Files
  getFiles: (roomId) =>
    fetch(`${API_BASE}/board/files/room/${roomId}`).then((r) => {
      if (!r.ok) throw new Error(`getFiles ${r.status}`);
      return r.json();
    }),

  uploadFile: (formData) =>
    fetch(`${API_BASE}/board/files`, {
      method: "POST",
      body: formData, // multipart — do NOT set Content-Type manually
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

// Permission
const canDelete = (role, itemAuthor, currentUsername) => {
  if (role === "instructor" || role === "prof") return true;
  return itemAuthor === currentUsername;
};

// PostIt
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

// Spinner
const Spinner = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      padding: "12px 0",
    }}
  >
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

// BoardUI
const BoardUI = ({ user, isInstructor, isNear, roomId }) => {
  // Notes state
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteColor, setNewNoteColor] = useState("yellow");
  const [notePosting, setNotePosting] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [announcementPosting, setAnnouncementPosting] = useState(false);

  // Files state
  const [boardFiles, setBoardFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  // fetchAll
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
        const data = notesResult.value;
        setNotes(
          (Array.isArray(data) ? data : []).map((n) =>
            normalizeNote(n, username),
          ),
        );
      } else {
        console.error("Notes fetch failed:", notesResult.reason);
      }

      if (announcementsResult.status === "fulfilled") {
        const data = announcementsResult.value;
        setAnnouncements(
          (Array.isArray(data) ? data : []).map((a) =>
            normalizeAnnouncement(a, username),
          ),
        );
      } else {
        console.error(
          "Announcements fetch failed:",
          announcementsResult.reason,
        );
      }

      if (filesResult.status === "fulfilled") {
        const data = filesResult.value;
        setBoardFiles(
          (Array.isArray(data) ? data : []).map((f) =>
            normalizeFile(f, username),
          ),
        );
      } else {
        console.error("Files fetch failed:", filesResult.reason);
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

    const interval = setInterval(() => {
      fetchAll(false);
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchAll]);

  // Note handlers
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

  // Announcement handlers
  const addAnnouncement = async () => {
    if (!newAnnouncement.trim() || announcementPosting) return;
    setAnnouncementPosting(true);
    try {
      const res = await api.createAnnouncement(userId, {
        room_id: roomId,
        text: newAnnouncement.trim(),
      });
      const a = res.announcement || res;
      setAnnouncements((prev) => [
        normalizeAnnouncement(
          {
            ...a,
            time: a.created_at
              ? new Date(a.created_at).toLocaleTimeString()
              : new Date().toLocaleTimeString(),
          },
          username,
        ),
        ...prev,
      ]);
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

  // File handlers
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
        setBoardFiles((prev) => [
          ...prev,
          normalizeFile(
            {
              ...f,
              name: f.file_name || f.name || file.name,
              type: f.file_type || f.type || file.type,
            },
            username,
          ),
        ]);
      }
    } catch (err) {
      console.error("Failed to upload file:", err);
    } finally {
      setUploading(false);
      // reset input, same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteFile = async (id) => {
    const ok = await confirm("Delete this file?");
    if (!ok) return;
    try {
      await api.deleteFile(id);
      setBoardFiles((p) => p.filter((f) => f.id !== id));
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

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

  const emptyText = {
    color: "#475569",
    fontSize: "11px",
    textAlign: "center",
  };

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
                transition: "background 0.2s",
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
          </div>

          <button
            onClick={() => !uploading && fileInputRef.current?.click()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              width: "100%",
              padding: "10px",
              border: "2px dashed #1e2d45",
              borderRadius: "10px",
              background: "none",
              color: uploading ? "#3b82f6" : "#64748b",
              fontSize: "11px",
              cursor: uploading ? "not-allowed" : "pointer",
              flexShrink: 0,
              boxSizing: "border-box",
              transition: "color 0.2s",
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

          <div style={listStyle}>
            {filesLoading ? (
              <Spinner />
            ) : boardFiles.length === 0 ? (
              <p style={emptyText}>No files yet</p>
            ) : (
              boardFiles.map((file) => (
                <div
                  key={file.id}
                  style={{
                    background: "#1a2235",
                    borderRadius: "10px",
                    padding: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexShrink: 0,
                    position: "relative",
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
                      fontSize: "16px",
                      flexShrink: 0,
                    }}
                  >
                    {file.type?.startsWith("image/")
                      ? "🖼️"
                      : file.type === "application/pdf"
                        ? "📄"
                        : "📁"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        color: "#e2e8f0",
                        fontSize: "11px",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        margin: 0,
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
                    onClick={async () => {
                      try {
                        const res = await fetch(file.url);
                        if (!res.ok) throw new Error("Download failed");
                        const blob = await res.blob();
                        const objectUrl = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = objectUrl;
                        link.download = file.name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(objectUrl);
                      } catch (err) {
                        window.open(file.url, "_blank");
                      }
                    }}
                    style={{
                      color: "#60a5fa",
                      fontSize: "10px",
                      flexShrink: 0,
                      textDecoration: "none",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0",
                    }}
                  >
                    Download
                  </button>
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
                        opacity: 0.6,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity = 0.6)
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

        {/* ── ANNOUNCEMENTS ── */}
        <div style={colStyle}>
          <div style={headerStyle}>
            <MdAnnouncement size={12} /> Announcements
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
            placeholder="Post an announcement..."
            rows={2}
            value={newAnnouncement}
            onChange={(e) => setNewAnnouncement(e.target.value)}
          />

          <button
            onClick={addAnnouncement}
            disabled={announcementPosting}
            style={{
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
              flexShrink: 0,
              transition: "background 0.2s",
            }}
          >
            <MdAnnouncement size={12} />
            {announcementPosting ? "Posting…" : "Post"}
          </button>

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
                        opacity: 0.6,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity = 0.6)
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
    </>
  );
};

export default function ClassBoard({
  position = [-3, 1.8, 0],
  rotation = [0, Math.PI / 2, 0],
}) {
  const meshRef = useRef();
  const [isNear, setIsNear] = useState(false);
  const { avatarPosition } = useRoom();

  const user = JSON.parse(localStorage.getItem("userSession") || "{}");
  const room = JSON.parse(localStorage.getItem("currentRoom") || "{}");

  const roomId = room.id || room.room_id || room.room_code;
  const userId = user.id;
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
        occlude
        distanceFactor={1.5}
        position={[0, 0, 0.01]}
        center
      >
        <BoardUI
          user={user}
          isInstructor={isInstructor}
          isNear={isNear}
          roomId={roomId}
        />
      </Html>
      <Html
        transform
        occlude
        distanceFactor={8}
        position={[0, -1.6, 0.01]}
        center
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
