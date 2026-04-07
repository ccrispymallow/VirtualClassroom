import { useState, useEffect, useRef, useCallback } from "react";
import {
  BsBellFill,
  BsBell,
  BsFileEarmarkPdfFill,
  BsFileEarmarkWordFill,
  BsFileEarmarkSpreadsheetFill,
  BsFileEarmarkSlidesFill,
  BsFileEarmarkZipFill,
  BsFileEarmarkFill,
  BsImageFill,
  BsPaperclip,
} from "react-icons/bs";
import { MdAnnouncement } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { socket } from "../helper/socket";

const TOAST_TTL = 7000;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

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
  const accent = isFile ? "var(--accent)" : "#a78bfa";

  return (
    <div className="toast-card" style={{ borderLeft: `4px solid ${accent}` }}>
      <div className="toast-header">
        {isFile ? (
          <BsPaperclip size={18} color={accent} />
        ) : (
          <MdAnnouncement size={20} color={accent} />
        )}
        <span className="toast-title" style={{ color: accent }}>
          {isFile ? "Files from instructor" : "Announcement"}
        </span>
        <button onClick={() => onDismiss(toast.id)} className="toast-close">
          <IoClose size={20} />
        </button>
      </div>

      {isFile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {toast.files.map((file, i) => (
            <div
              key={`${file.id}-${i}`}
              className="board-file-item"
              style={{ padding: "14px" }}
            >
              <div
                className="board-file-icon"
                style={{ width: "38px", height: "38px", fontSize: "18px" }}
              >
                {fileIcon(file.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    color: "var(--text)",
                    fontSize: "13px",
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
                  style={{ color: "var(--muted)", fontSize: "11px", margin: 0 }}
                >
                  by {file.uploader}
                </p>
              </div>
              <button
                onClick={() => downloadFile(file)}
                className="btn-outline"
                style={{
                  padding: "6px 12px",
                  fontSize: "11px",
                  color: "var(--accent)",
                  borderColor: "var(--accent)",
                }}
              >
                Download
              </button>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p
            style={{
              color: "var(--accent)",
              fontSize: "13px",
              fontWeight: 700,
              margin: "0 0 6px",
            }}
          >
            {toast.author}
          </p>
          <p
            style={{
              color: "var(--text)",
              fontSize: "14px",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {toast.text}
          </p>
        </>
      )}

      <div
        className="toast-progress"
        style={{
          background: accent,
          animation: `toastProgress ${TOAST_TTL}ms linear forwards`,
        }}
      />
    </div>
  );
};

const FileBellPanel = ({ files, announcements }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("files");
  const [seenFilesCount, setSeenFilesCount] = useState(0);
  const [seenAnnounceCount, setSeenAnnounceCount] = useState(0);

  const effectiveSeenFiles =
    open && activeTab === "files" ? files.length : seenFilesCount;
  const effectiveSeenAnnounce =
    open && activeTab === "announce" ? announcements.length : seenAnnounceCount;

  const unreadFiles = files.length - effectiveSeenFiles;
  const unreadAnnounce = announcements.length - effectiveSeenAnnounce;
  const totalUnread = unreadFiles + unreadAnnounce;

  const toggle = () =>
    setOpen((o) => {
      if (!o) {
        if (activeTab === "files") setSeenFilesCount(files.length);
        else setSeenAnnounceCount(announcements.length);
      }
      return !o;
    });

  const switchTab = (tab) => {
    setActiveTab(tab);
    if (tab === "files") setSeenFilesCount(files.length);
    else setSeenAnnounceCount(announcements.length);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={toggle}
        title="Notifications"
        className={`bell-btn ${totalUnread > 0 ? "active" : ""}`}
        style={{
          width: "56px",
          height: "56px",
        }} /* Forces the button to be larger */
      >
        {totalUnread > 0 ? (
          <BsBellFill
            style={{ width: "32px", height: "32px" }}
          /> /* Forces the icon size */
        ) : (
          <BsBell style={{ width: "32px", height: "32px" }} />
        )}

        {totalUnread > 0 && (
          <span
            className="bell-badge"
            style={{
              fontSize: "13px",
              minWidth: "24px",
              height: "24px",
              top: "-4px",
              right: "-4px",
            }}
          >
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="bell-panel">
          <div className="bell-panel-header">
            <span className="bell-panel-title">
              <BsBellFill size={14} /> Notifications
            </span>
            <button onClick={() => setOpen(false)} className="toast-close">
              <IoClose size={20} />
            </button>
          </div>

          <div className="bell-tabs">
            {[
              {
                key: "files",
                label: (
                  <>
                    <BsPaperclip size={14} /> Files
                  </>
                ),
                count: unreadFiles,
              },
              {
                key: "announce",
                label: (
                  <>
                    <MdAnnouncement size={16} /> Announcements
                  </>
                ),
                count: unreadAnnounce,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => switchTab(tab.key)}
                className={`bell-tab ${activeTab === tab.key ? "active" : ""}`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="bell-tab-badge">
                    {tab.count > 9 ? "9+" : tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="bell-content">
            {activeTab === "files" ? (
              files.length === 0 ? (
                <p className="notif-empty">No files sent yet</p>
              ) : (
                files.map((file, i) => (
                  <div
                    key={`${file.id ?? i}`}
                    className="board-file-item"
                    style={{ marginBottom: "10px", padding: "14px" }}
                  >
                    <div
                      className="board-file-icon"
                      style={{
                        width: "38px",
                        height: "38px",
                        fontSize: "18px",
                      }}
                    >
                      {fileIcon(file.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          color: "var(--text)",
                          fontSize: "13px",
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
                          fontSize: "11px",
                          margin: 0,
                        }}
                      >
                        by {file.uploader}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadFile(file)}
                      className="btn-outline"
                      style={{
                        padding: "6px 12px",
                        fontSize: "11px",
                        color: "var(--accent)",
                        borderColor: "var(--accent)",
                      }}
                    >
                      Download
                    </button>
                  </div>
                ))
              )
            ) : announcements.length === 0 ? (
              <p className="notif-empty">No announcements yet</p>
            ) : (
              announcements.map((ann, i) => (
                <div
                  key={i}
                  className="board-announcement-item"
                  style={{ marginBottom: "10px", padding: "16px" }}
                >
                  <p
                    style={{
                      color: "var(--accent)",
                      fontSize: "12px",
                      fontWeight: 700,
                      margin: "0 0 6px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <MdAnnouncement size={14} /> {ann.author}
                  </p>
                  <p
                    style={{
                      color: "var(--text)",
                      fontSize: "13px",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {ann.text}
                  </p>
                  {ann.time && (
                    <p
                      style={{
                        color: "var(--muted)",
                        fontSize: "11px",
                        margin: "8px 0 0",
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
  const toastTimersRef = useRef(new Set());

  const dismiss = useCallback(
    (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    [],
  );

  const addToast = useCallback((toast) => {
    setToasts((prev) => [...prev, toast]);
    const timerId = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      toastTimersRef.current.delete(timerId);
    }, TOAST_TTL);
    toastTimersRef.current.add(timerId);
  }, []);

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach((timerId) => clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    const onAnnounce = ({ text, author }) => {
      setAllAnnouncements((prev) => [
        { text, author, time: Date.now() },
        ...prev,
      ]);
      addToast({
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
      addToast({ id: `files-${Date.now()}`, type: "file", files });
    };

    socket.on("board-announcement-notify", onAnnounce);
    socket.on("board-file-notify", onFileNotify);
    return () => {
      socket.off("board-announcement-notify", onAnnounce);
      socket.off("board-file-notify", onFileNotify);
    };
  }, [addToast]);

  return (
    <div className="notif-wrapper">
      <div className="notif-interactive">
        {!isInstructor && (
          <FileBellPanel files={allFiles} announcements={allAnnouncements} />
        )}
      </div>
      {[...toasts].reverse().map((toast) => (
        <div key={toast.id} className="notif-interactive">
          <ToastCard toast={toast} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}

export default BoardNotifications;
