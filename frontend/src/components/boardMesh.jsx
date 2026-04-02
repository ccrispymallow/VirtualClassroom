import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRoom } from "./roomContext";
import { IoClose, IoAddCircleOutline } from "react-icons/io5";
import { BsStickyFill } from "react-icons/bs";
import { LuUpload } from "react-icons/lu";
import { MdAnnouncement } from "react-icons/md";
import * as THREE from "three";

const INTERACT_DISTANCE = 12;

const PostIt = ({ note, onDelete }) => {
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
      <button
        onClick={() => onDelete(note.id)}
        className="absolute top-1 right-1 opacity-40 hover:opacity-80 text-current"
      >
        <IoClose size={12} />
      </button>
      <p className="mt-1 break-words leading-relaxed">{note.text}</p>
      <p className="mt-2 opacity-50 text-[10px]">{note.author}</p>
    </div>
  );
};

const BoardUI = ({ user, isInstructor, isNear }) => {
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteColor, setNewNoteColor] = useState("yellow");
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [boardFiles, setBoardFiles] = useState([]);
  const fileInputRef = useRef(null);

  const noteColors = ["yellow", "pink", "blue", "green"];
  const colorDot = {
    yellow: "bg-yellow-300",
    pink: "bg-pink-300",
    blue: "bg-blue-300",
    green: "bg-green-300",
  };

  const addNote = () => {
    if (!newNoteText.trim()) return;
    setNotes((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: newNoteText.trim(),
        color: newNoteColor,
        author: user.username,
      },
    ]);
    setNewNoteText("");
  };

  const addAnnouncement = () => {
    if (!newAnnouncement.trim()) return;
    setAnnouncements((prev) => [
      {
        id: Date.now(),
        text: newAnnouncement.trim(),
        author: user.username,
        time: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
    setNewAnnouncement("");
  };

  const handleFileUpload = (e) => {
    Array.from(e.target.files).forEach((file) => {
      const url = URL.createObjectURL(file);
      setBoardFiles((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          name: file.name,
          url,
          type: file.type,
          uploader: user.username,
        },
      ]);
    });
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
  };

  return (
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
      {/* NOTES */}
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
            style={{
              display: "flex",
              alignItems: "center",
              gap: "3px",
              padding: "4px 10px",
              background: "#3b82f6",
              color: "#fff",
              fontSize: "11px",
              borderRadius: "7px",
              border: "none",
              cursor: "pointer",
            }}
          >
            <IoAddCircleOutline size={12} /> Add
          </button>
        </div>
        <div style={listStyle}>
          {notes.length === 0 ? (
            <p
              style={{
                color: "#475569",
                fontSize: "11px",
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
                onDelete={(id) => setNotes((p) => p.filter((n) => n.id !== id))}
              />
            ))
          )}
        </div>
      </div>

      {/* FILES */}
      <div style={colStyle}>
        <div style={headerStyle}>
          <LuUpload size={12} /> Files
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
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
            color: "#64748b",
            fontSize: "11px",
            cursor: "pointer",
            flexShrink: 0,
            boxSizing: "border-box",
          }}
        >
          <LuUpload size={14} /> Upload file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
        <div style={listStyle}>
          {boardFiles.length === 0 ? (
            <p
              style={{
                color: "#475569",
                fontSize: "11px",
                textAlign: "center",
              }}
            >
              No files yet
            </p>
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
                  {file.type.startsWith("image/")
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
                  <p style={{ color: "#64748b", fontSize: "10px", margin: 0 }}>
                    by {file.uploader}
                  </p>
                </div>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#60a5fa", fontSize: "10px", flexShrink: 0 }}
                >
                  Open
                </a>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ANNOUNCEMENTS */}
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
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            padding: "5px",
            background: "#8b5cf6",
            color: "#fff",
            fontSize: "11px",
            borderRadius: "7px",
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <MdAnnouncement size={12} /> Post
        </button>
        <div style={listStyle}>
          {announcements.length === 0 ? (
            <p
              style={{
                color: "#475569",
                fontSize: "11px",
                textAlign: "center",
              }}
            >
              No announcements yet
            </p>
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
                  }}
                >
                  {a.text}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
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
        <BoardUI user={user} isInstructor={isInstructor} isNear={isNear} />
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
