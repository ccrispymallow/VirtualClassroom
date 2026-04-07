import { memo, useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRoom } from "./roomContext";
import { IoClose, IoAddCircleOutline } from "react-icons/io5";
import {
  BsStickyFill,
  BsBellFill,
  BsFileEarmarkPdfFill,
  BsFileEarmarkWordFill,
  BsFileEarmarkSpreadsheetFill,
  BsFileEarmarkSlidesFill,
  BsFileEarmarkZipFill,
  BsFileEarmarkFill,
  BsImageFill,
} from "react-icons/bs";
import { LuUpload } from "react-icons/lu";
import { MdAnnouncement } from "react-icons/md";
import * as THREE from "three";
import { useParams } from "react-router-dom";
import { socket } from "../helper/socket";

const INTERACT_DISTANCE = 12;
const POLL_INTERVAL = 5000;
const POLL_INTERVAL_MAX = 60000;
const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api`;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// API
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
    fetch(`${API_BASE}/board/files`, { method: "POST", body: formData }).then(
      (r) => {
        if (!r.ok) throw new Error(`uploadFile ${r.status}`);
        return r.json();
      },
    ),
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

const areNoteListsEqual = (a, b) =>
  a.length === b.length &&
  a.every(
    (item, idx) =>
      item.id === b[idx]?.id &&
      item.text === b[idx]?.text &&
      item.color === b[idx]?.color &&
      item.author === b[idx]?.author,
  );
const areAnnouncementListsEqual = (a, b) =>
  a.length === b.length &&
  a.every(
    (item, idx) =>
      item.id === b[idx]?.id &&
      item.text === b[idx]?.text &&
      item.author === b[idx]?.author &&
      item.time === b[idx]?.time,
  );
const areFileListsEqual = (a, b) =>
  a.length === b.length &&
  a.every(
    (item, idx) =>
      item.id === b[idx]?.id &&
      item.name === b[idx]?.name &&
      item.url === b[idx]?.url &&
      item.type === b[idx]?.type &&
      item.uploader === b[idx]?.uploader,
  );

const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,0,0,0.6)",
      borderRadius: "24px",
      backdropFilter: "blur(4px)",
    }}
  >
    <div className="modal" style={{ padding: "24px", width: "280px" }}>
      <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>Confirm Action</h3>
      <p
        style={{
          fontSize: "14px",
          marginBottom: "20px",
          color: "var(--muted)",
        }}
      >
        {message}
      </p>
      <div className="modal-actions" style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={onCancel}
          className="btn-outline"
          style={{ flex: 1, padding: "10px", fontSize: "14px" }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="btn-danger"
          style={{ flex: 1, padding: "10px", fontSize: "14px" }}
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

const PostIt = memo(function PostIt({ note, onDelete, showDelete }) {
  const themes = {
    yellow: { bg: "#fef08a", border: "#fde047", text: "#713f12" },
    pink: { bg: "#fbcfe8", border: "#f9a8d4", text: "#831843" },
    blue: { bg: "#bfdbfe", border: "#93c5fd", text: "#1e3a8a" },
    green: { bg: "#bbf7d0", border: "#86efac", text: "#14532d" },
  };
  const t = themes[note.color] || themes.yellow;

  return (
    <div
      style={{
        position: "relative",
        padding: "16px",
        borderRadius: "12px",
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.text,
        flexShrink: 0,
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
      }}
    >
      {showDelete && (
        <button
          onClick={() => onDelete(note.id)}
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: t.text,
            opacity: 0.5,
            padding: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.5)}
        >
          <IoClose size={18} />
        </button>
      )}
      <p
        style={{
          marginTop: "4px",
          fontSize: "15px",
          fontWeight: "600",
          lineHeight: 1.5,
          wordBreak: "break-word",
        }}
      >
        {note.text}
      </p>
      <p
        style={{
          marginTop: "12px",
          fontSize: "12px",
          fontWeight: "700",
          opacity: 0.6,
        }}
      >
        {note.author}
      </p>
    </div>
  );
});

const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
    <div
      style={{
        width: "24px",
        height: "24px",
        border: "3px solid var(--border)",
        borderTop: "3px solid var(--accent)",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const fileIcon = (type) => {
  if (!type) return <BsFileEarmarkFill color="var(--muted)" />;
  if (type.startsWith("image/")) return <BsImageFill color="var(--accent)" />;
  if (type === "application/pdf")
    return <BsFileEarmarkPdfFill color="var(--error)" />;
  if (type.includes("word") || type.includes("document"))
    return <BsFileEarmarkWordFill color="#3b82f6" />;
  if (type.includes("sheet") || type.includes("excel"))
    return <BsFileEarmarkSpreadsheetFill color="var(--success)" />;
  if (type.includes("presentation") || type.includes("powerpoint"))
    return <BsFileEarmarkSlidesFill color="var(--warn)" />;
  if (type.includes("zip") || type.includes("compressed"))
    return <BsFileEarmarkZipFill color="var(--muted)" />;
  return <BsFileEarmarkFill color="var(--muted)" />;
};

const buildFileUrl = (relativeUrl) => `${BACKEND_URL}${relativeUrl}`;

const downloadFile = async (file) => {
  const fullUrl = buildFileUrl(file.url);
  try {
    const res = await fetch(fullUrl);
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
    window.open(fullUrl, "_blank");
  }
};

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
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());
  const [broadcasting, setBroadcasting] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(() => !document.hidden);
  const fileInputRef = useRef(null);
  const pollFailureCountRef = useRef(0);

  const { confirm, ConfirmUI } = useConfirm();

  const role = user.role;
  const username = user.username;
  const userId = user.id || user.user_id;

  const noteColors = ["yellow", "pink", "blue", "green"];
  const colorHex = {
    yellow: "#fde047",
    pink: "#f9a8d4",
    blue: "#93c5fd",
    green: "#86efac",
  };

  useEffect(() => {
    const onVisibilityChange = () => setIsPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

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
      const hasFailure =
        notesResult.status === "rejected" ||
        announcementsResult.status === "rejected" ||
        filesResult.status === "rejected";

      if (hasFailure) {
        pollFailureCountRef.current = Math.min(
          pollFailureCountRef.current + 1,
          6,
        );
      } else {
        pollFailureCountRef.current = 0;
      }

      if (notesResult.status === "fulfilled") {
        const nextNotes = (
          Array.isArray(notesResult.value) ? notesResult.value : []
        ).map((n) => normalizeNote(n, username));
        setNotes((prev) =>
          areNoteListsEqual(prev, nextNotes) ? prev : nextNotes,
        );
      }
      if (announcementsResult.status === "fulfilled") {
        const nextAnnouncements = (
          Array.isArray(announcementsResult.value)
            ? announcementsResult.value
            : []
        ).map((a) => normalizeAnnouncement(a, username));
        setAnnouncements((prev) =>
          areAnnouncementListsEqual(prev, nextAnnouncements)
            ? prev
            : nextAnnouncements,
        );
      }
      if (filesResult.status === "fulfilled") {
        const nextFiles = (
          Array.isArray(filesResult.value) ? filesResult.value : []
        ).map((f) => normalizeFile(f, username));
        setBoardFiles((prev) =>
          areFileListsEqual(prev, nextFiles) ? prev : nextFiles,
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
    if (!isPageVisible || !isNear) return;
    let cancelled = false;
    let timeoutId;
    const scheduleNext = () => {
      if (cancelled) return;
      const delay = Math.min(
        POLL_INTERVAL * 2 ** pollFailureCountRef.current,
        POLL_INTERVAL_MAX,
      );
      timeoutId = setTimeout(async () => {
        await fetchAll(false);
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchAll, isPageVisible, isNear]);

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
    } catch (err) {}
  };

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
      if (notify && roomCode)
        socket.emit("board-announce", {
          roomCode,
          text: newAnnouncement.trim(),
          author: username,
        });
      setNewAnnouncement("");
    } catch (err) {
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
    } catch (err) {}
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || uploading) return;
    setUploading(true);
    try {
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("room_id", roomId);
          formData.append("uploaded_by", userId);
          const res = await api.uploadFile(formData);
          const f = res.file || res;
          return normalizeFile(
            {
              ...f,
              name: f.file_name || f.name || file.name,
              type: f.file_type || f.type || file.type,
            },
            username,
          );
        }),
      );
      setBoardFiles((prev) => [...prev, ...uploadedFiles]);
    } catch (err) {
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleFileSelect = (id) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const broadcastSelected = () => {
    if (!roomCode || selectedFileIds.size === 0 || broadcasting) return;
    setBroadcasting(true);
    const filesToSend = boardFiles.filter((f) => selectedFileIds.has(f.id));
    socket.emit("board-file-notify", { roomCode, files: filesToSend });
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
    } catch (err) {}
  };

  return (
    <>
      {ConfirmUI}
      <div
        className="board-container"
        style={{ pointerEvents: isNear ? "auto" : "none" }}
      >
        {/* ── NOTES ── */}
        <div className="board-column">
          <div className="board-header">
            <BsStickyFill size={18} /> Notes
          </div>
          <textarea
            className="board-textarea"
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
            <div style={{ display: "flex", gap: "8px" }}>
              {noteColors.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewNoteColor(c)}
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background: colorHex[c],
                    border:
                      newNoteColor === c
                        ? "3px solid var(--text)"
                        : "2px solid transparent",
                    cursor: "pointer",
                    padding: 0,
                    transition: "all 0.2s",
                  }}
                />
              ))}
            </div>
            <button
              className="btn"
              onClick={addNote}
              disabled={notePosting}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                width: "auto",
              }}
            >
              <IoAddCircleOutline size={18} /> {notePosting ? "Adding…" : "Add"}
            </button>
          </div>
          <div className="board-list">
            {notesLoading ? (
              <Spinner />
            ) : notes.length === 0 ? (
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: "14px",
                  textAlign: "center",
                }}
              >
                No notes yet
              </p>
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
        <div className="board-column">
          <div className="board-header">
            <LuUpload size={18} /> Files
            {isInstructor && selectedFileIds.size > 0 && (
              <button
                onClick={broadcastSelected}
                disabled={broadcasting}
                className="btn"
                style={{
                  marginLeft: "auto",
                  padding: "8px 14px",
                  fontSize: "13px",
                  display: "flex",
                  gap: "6px",
                  backgroundColor: "var(--accent)",
                  width: "auto",
                }}
              >
                <BsBellFill size={14} /> Broadcast {selectedFileIds.size}
              </button>
            )}
          </div>
          {isInstructor && (
            <>
              <button
                onClick={() => !uploading && fileInputRef.current?.click()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "16px",
                  border: "2px dashed var(--border)",
                  borderRadius: "12px",
                  background: "none",
                  color: uploading ? "var(--accent)" : "var(--muted)",
                  fontSize: "15px",
                  cursor: uploading ? "not-allowed" : "pointer",
                  transition: "border-color 0.2s",
                }}
              >
                <LuUpload size={18} />{" "}
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
          <div className="board-list">
            {filesLoading ? (
              <Spinner />
            ) : boardFiles.length === 0 ? (
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: "14px",
                  textAlign: "center",
                }}
              >
                No files yet
              </p>
            ) : (
              boardFiles.map((file) => {
                const isChecked = selectedFileIds.has(file.id);
                return (
                  <div
                    key={file.id}
                    className={`board-file-item ${isChecked ? "selected" : ""}`}
                  >
                    {isInstructor && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFileSelect(file.id)}
                        style={{
                          width: "18px",
                          height: "18px",
                          accentColor: "var(--accent)",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div className="board-file-icon">{fileIcon(file.type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          color: "var(--text)",
                          fontSize: "14px",
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
                          color: "var(--muted)",
                          fontSize: "12px",
                          margin: 0,
                        }}
                      >
                        by {file.uploader}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadFile(file)}
                      style={{
                        color: "var(--accent)",
                        fontSize: "13px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "600",
                        padding: "0 8px",
                      }}
                    >
                      Download
                    </button>
                    {canDelete(role, file.uploader, username) && (
                      <button
                        onClick={() => deleteFile(file.id)}
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--error)",
                          padding: "4px",
                          opacity: 0.5,
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.opacity = 1)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.opacity = 0.5)
                        }
                      >
                        <IoClose size={18} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── ANNOUNCEMENTS ── */}
        <div className="board-column">
          <div className="board-header">
            <MdAnnouncement size={18} /> Announcements
          </div>
          {isInstructor && (
            <>
              <textarea
                className="board-textarea"
                placeholder="Post an announcement..."
                rows={2}
                value={newAnnouncement}
                onChange={(e) => setNewAnnouncement(e.target.value)}
              />
              <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
                <button
                  onClick={() => addAnnouncement(false)}
                  disabled={announcementPosting}
                  className="btn-outline"
                  style={{
                    flex: 1,
                    padding: "10px",
                    fontSize: "14px",
                    display: "flex",
                    gap: "6px",
                  }}
                >
                  <MdAnnouncement size={16} /> Post
                </button>
                <button
                  onClick={() => addAnnouncement(true)}
                  disabled={announcementPosting}
                  className="btn"
                  style={{
                    flex: 1,
                    padding: "10px",
                    fontSize: "14px",
                    display: "flex",
                    gap: "6px",
                  }}
                >
                  <BsBellFill size={14} /> Post & Notify
                </button>
              </div>
            </>
          )}
          <div className="board-list">
            {announcementsLoading ? (
              <Spinner />
            ) : announcements.length === 0 ? (
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: "14px",
                  textAlign: "center",
                }}
              >
                No announcements yet
              </p>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="board-announcement-item">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--accent)",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      {a.author}
                    </span>
                    <span style={{ color: "var(--muted)", fontSize: "12px" }}>
                      {a.time}
                    </span>
                  </div>
                  <p
                    style={{
                      color: "var(--text)",
                      fontSize: "15px",
                      lineHeight: 1.5,
                      margin: 0,
                      paddingRight: "20px",
                    }}
                  >
                    {a.text}
                  </p>
                  {canDelete(role, a.author, username) && (
                    <button
                      onClick={() => deleteAnnouncement(a.id)}
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--error)",
                        padding: "0",
                        opacity: 0.5,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity = 0.5)
                      }
                    >
                      <IoClose size={18} />
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
  const isNearRef = useRef(false);
  const { avatarPosition } = useRoom();
  const { roomCode } = useParams();
  const boardPos = useMemo(() => new THREE.Vector3(...position), [position]);
  const avatarVec = useMemo(() => new THREE.Vector3(), []);

  const user = useMemo(
    () => JSON.parse(localStorage.getItem("userSession") || "{}"),
    [],
  );
  const room = useMemo(
    () => JSON.parse(localStorage.getItem("currentRoom") || "{}"),
    [],
  );
  const roomId = room.id || room.room_id || room.room_code;
  const isInstructor = user.role === "instructor";

  useFrame(() => {
    if (!meshRef.current || !avatarPosition) return;
    avatarVec.set(avatarPosition[0], avatarPosition[1], avatarPosition[2]);
    const nextIsNear = avatarVec.distanceTo(boardPos) < INTERACT_DISTANCE;
    if (nextIsNear !== isNearRef.current) {
      isNearRef.current = nextIsNear;
      setIsNear(nextIsNear);
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation}>
      <planeGeometry args={[5, 3]} />
      <meshStandardMaterial color="var(--surface2)" />
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
            color: isNear ? "var(--accent)" : "var(--muted)",
            fontSize: "11px",
            fontFamily: "Sora, sans-serif",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            padding: "4px 10px",
            borderRadius: "8px",
            whiteSpace: "nowrap",
            transition: "color 0.3s",
            pointerEvents: "none",
          }}
        >
          {isNear ? "Board Active" : "Walk closer to interact"}
        </div>
      </Html>
    </mesh>
  );
}
