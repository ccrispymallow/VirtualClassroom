import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useMedia } from "../helper/useMedia";
import { socket } from "../helper/socket";
import { usePeer } from "../helper/usePeer";
import { useRoom } from "../components/roomContext";
import RemoteStream from "./remoteStream";
import { IoMdArrowDropright, IoMdArrowDropdown } from "react-icons/io";
import { FaCheck } from "react-icons/fa6";
import { IoClose, IoSettings, IoPeople } from "react-icons/io5";
import { ImPhoneHangUp } from "react-icons/im";
import { BsMicFill, BsMicMuteFill, BsChatFill, BsCopy } from "react-icons/bs";
import { LuScreenShare } from "react-icons/lu";
import { MdEmojiEmotions } from "react-icons/md";
import { useParams, useNavigate } from "react-router-dom";
import BoardNotifications from "./boardNotification";
import "../App.css";

// Custom SVG to replace the hand emoji
const HandIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 11V6a2 2 0 0 0-4 0v4" />
    <path d="M14 10V4a2 2 0 0 0-4 0v6" />
    <path d="M10 10.5V3a2 2 0 0 0-4 0v9" />
    <path d="M6 14a2 2 0 0 0-4 0v-2.5a2 2 0 0 1 4 0Z" />
    <path d="M18 11v5a7 7 0 0 1-14 0" />
  </svg>
);

const EMOTES = [
  { label: "Raise Hand", key: "raise", icon: <HandIcon size={14} /> },
];

const RemoteMicStreams = memo(function RemoteMicStreams({ streams }) {
  return streams.map((s) => (
    <RemoteStream
      key={`${s.peerId}-mic`}
      stream={s.stream}
      type={s.type}
      username={s.username}
    />
  ));
});

const MeetingTopBar = memo(function MeetingTopBar({
  roomCode,
  roomName,
  isInstructor,
  userUsername,
  userInitial,
  copyMessage,
  onCopyRoomCode,
}) {
  return (
    <div className="meeting-top-bar">
      <div
        className="nav-brand"
        style={{ padding: 0, background: "transparent", border: "none" }}
      >
        <div className="brand-icon" style={{ width: "28px", height: "28px" }}>
          <img
            src="/logo.svg"
            style={{ width: "16px", filter: "brightness(0) invert(1)" }}
            alt="Logo"
          />
        </div>
        <span className="brand-name" style={{ fontSize: "14px" }}>
          Virtual<span>Class</span>
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "12px", color: "var(--muted)" }}>Room:</span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "var(--surface2)",
            padding: "4px 8px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontFamily: "monospace",
              color: "var(--text)",
            }}
          >
            {roomCode}
          </span>
          <button
            type="button"
            onClick={onCopyRoomCode}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--muted)",
              padding: "2px",
              display: "flex",
            }}
            title="Copy room code"
          >
            <BsCopy size={14} />
          </button>
        </div>
        {copyMessage && (
          <span style={{ fontSize: "10px", color: "var(--muted)" }}>
            {copyMessage}
          </span>
        )}
        {roomName && (
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            {roomName}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {isInstructor && (
          <span className="role-badge role-instructor">Instructor</span>
        )}
        <div className="user-avatar" style={{ width: "28px", height: "28px" }}>
          {userInitial}
        </div>
        <span
          style={{ fontSize: "12px", fontWeight: "600", color: "var(--text)" }}
        >
          {userUsername}
        </span>
      </div>
    </div>
  );
});

const MeetingBottomToolbar = memo(function MeetingBottomToolbar({
  micOn,
  screenOn,
  isInstructor,
  isPollPanelOpen,
  boxesParticipants,
  boxesSettings,
  showChat,
  showEmotes,
  unreadCount,
  raisedHandCount,
  onMicToggle,
  onScreenToggle,
  onTogglePollPanel,
  onToggleParticipants,
  onToggleChat,
  onToggleEmotes,
  onToggleSettings,
  onOpenLeave,
}) {
  return (
    <div className="meeting-bottom-bar">
      <div className="toolbar-container">
        <button
          type="button"
          onClick={onMicToggle}
          className={`toolbar-btn ${micOn ? "active-blue" : ""}`}
        >
          {micOn ? <BsMicFill size={20} /> : <BsMicMuteFill size={20} />}
          <span className="label">Mic</span>
        </button>
        <button
          type="button"
          onClick={onScreenToggle}
          className={`toolbar-btn ${screenOn ? "active-green" : ""}`}
        >
          <LuScreenShare size={20} />
          <span className="label">{screenOn ? "Sharing" : "Screen"}</span>
        </button>
        {isInstructor && (
          <button
            type="button"
            onClick={onTogglePollPanel}
            className={`toolbar-btn ${isPollPanelOpen ? "active-blue" : ""}`}
          >
            <FaCheck size={20} />
            <span className="label">Start Check</span>
          </button>
        )}
        <div className="toolbar-divider" />
        <button
          type="button"
          onClick={onToggleParticipants}
          className={`toolbar-btn ${boxesParticipants ? "active-blue" : ""}`}
        >
          <IoPeople size={20} />
          {raisedHandCount > 0 && (
            <span className="badge-icon">
              <HandIcon size={10} />
            </span>
          )}
          <span className="label">People</span>
        </button>
        <button
          type="button"
          onClick={onToggleChat}
          className={`toolbar-btn ${showChat ? "active-blue" : ""}`}
        >
          <BsChatFill size={18} />
          {unreadCount > 0 && !showChat && (
            <span className="badge-dot">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="label">Chat</span>
        </button>
        <button
          type="button"
          onClick={onToggleEmotes}
          className={`toolbar-btn ${showEmotes ? "active-yellow" : ""}`}
        >
          <MdEmojiEmotions size={20} />
          <span className="label">React</span>
        </button>
        <button
          type="button"
          onClick={onToggleSettings}
          className={`toolbar-btn ${boxesSettings ? "active-blue" : ""}`}
        >
          <IoSettings size={20} />
          <span className="label">Settings</span>
        </button>
        <div className="toolbar-divider" />
        <button
          type="button"
          onClick={onOpenLeave}
          className="toolbar-btn danger"
        >
          <ImPhoneHangUp size={20} />
          <span className="label">Leave</span>
        </button>
      </div>
    </div>
  );
});

const MeetingParticipantsPanel = memo(function MeetingParticipantsPanel({
  open,
  participants,
  participantCount,
  peerEmotes,
  myEmote,
  userId,
  isInstructor,
  onClose,
  onRemoveParticipant,
  onPanelMouseEnter,
}) {
  if (!open) return null;

  return (
    <div
      className="meeting-panel"
      style={{ width: "260px" }}
      onMouseEnter={onPanelMouseEnter}
    >
      <div className="panel-header">
        <h3>Participants ({participantCount})</h3>
        <button type="button" onClick={onClose} className="panel-close">
          <IoClose size={18} />
        </button>
      </div>
      <div className="panel-content" style={{ maxHeight: "280px" }}>
        {participants.map((p) => {
          const isMe = p.id === userId;
          const hasHandRaised = isMe
            ? myEmote === "raise"
            : peerEmotes?.[p.id] === "raise";
          return (
            <div key={p.id} className="participant-item">
              <div
                className="user-avatar"
                style={{ width: "32px", height: "32px", flexShrink: 0 }}
              >
                {p.username?.[0]?.toUpperCase() || "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--text)",
                    margin: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.username}{" "}
                  {isMe && (
                    <span
                      style={{ color: "var(--muted)", fontWeight: "normal" }}
                    >
                      (you)
                    </span>
                  )}
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    margin: 0,
                    textTransform: "capitalize",
                    color: p.role === "instructor" ? "#a78bfa" : "var(--muted)",
                  }}
                >
                  {p.role}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexShrink: 0,
                }}
              >
                {hasHandRaised && (
                  <span style={{ color: "var(--warn)" }} title="Hand raised">
                    <HandIcon size={14} />
                  </span>
                )}
                {p.mic ? (
                  <BsMicFill size={12} color="var(--accent)" />
                ) : (
                  <BsMicMuteFill size={12} color="var(--muted)" />
                )}
                {isInstructor && !isMe && p.role !== "instructor" && (
                  <button
                    type="button"
                    onClick={() => onRemoveParticipant(p.id, p.username)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--error)",
                      cursor: "pointer",
                      padding: "2px",
                    }}
                    title="Remove participant"
                  >
                    <IoClose size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const MeetingChatPanel = memo(function MeetingChatPanel({
  open,
  messages,
  chatInput,
  userId,
  userUsername,
  chatEndRef,
  onClose,
  onChatInputChange,
  onSend,
  onPanelMouseEnter,
}) {
  if (!open) return null;

  return (
    <div
      className="meeting-panel"
      style={{ width: "280px", height: "380px" }}
      onMouseEnter={onPanelMouseEnter}
    >
      <div className="panel-header">
        <h3>Chat</h3>
        <button type="button" onClick={onClose} className="panel-close">
          <IoClose size={18} />
        </button>
      </div>
      <div className="panel-content" style={{ flex: 1 }}>
        {messages.length === 0 && (
          <p
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              textAlign: "center",
              marginTop: "16px",
            }}
          >
            No messages yet
          </p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.user_id === userId || msg.userId === userId;
          const key =
            msg.id != null
              ? String(msg.id)
              : `${msg.sent_at ?? ""}-${msg.user_id ?? msg.userId ?? "u"}-${i}`;
          return (
            <div
              key={key}
              className={`chat-msg-wrapper ${isMe ? "me" : "others"}`}
            >
              <span className="chat-sender">
                {msg.username || (isMe ? userUsername : "Guest")}
              </span>
              <div className="chat-bubble">{msg.message}</div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      <div className="chat-input-area">
        <input
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder="Type a message..."
          className="chat-input"
        />
        <button
          type="button"
          onClick={onSend}
          className="btn"
          style={{ padding: "10px 16px", width: "auto" }}
        >
          Send
        </button>
      </div>
    </div>
  );
});

const MeetingInterface = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const user = useMemo(
    () => JSON.parse(localStorage.getItem("userSession") || "{}"),
    [],
  );
  const room = useMemo(
    () => JSON.parse(localStorage.getItem("currentRoom") || "{}"),
    [],
  );
  const isInstructor = user.role === "instructor";

  const {
    participants,
    setParticipants,
    setScreenStream,
    myEmote,
    setMyEmote,
    chatMessages,
    peerEmotes,
    setChatMessages,
  } = useRoom();
  const safeChatMessages = useMemo(() => chatMessages ?? [], [chatMessages]);
  const participantCount = participants.length;

  const [boxes, setBoxes] = useState({
    settings: false,
    leave: false,
    participants: false,
  });
  const [showEmotes, setShowEmotes] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const chatEndRef = useRef(null);
  const showChatRef = useRef(showChat);
  const [copyMessage, setCopyMessage] = useState("");
  const copyTimerRef = useRef(null);
  const [deviceDropDown, setDeviceDropDown] = useState(false);
  const [deviceSections, setDeviceSections] = useState({ audio: false });
  const [audioDevices, setAudioDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState({ audio: null });
  const [pollQuestion, setPollQuestion] = useState({
    active: false,
    pollId: null,
    totalStudents: 0,
    answered: false,
    response: null,
  });
  const [isPollPanelOpen, setIsPollPanelOpen] = useState(false);
  const [pollResults, setPollResults] = useState({
    active: false,
    pollId: null,
    yes: 0,
    no: 0,
    remaining: 0,
    summary: "",
  });

  const {
    micStreamRef,
    screenStreamRef,
    micOn,
    screenOn,
    startMic,
    stopMic,
    startScreen,
    stopScreen,
  } = useMedia();
  const { remoteStreams, broadcastMic, broadcastScreen, stopScreenCalls } =
    usePeer({ roomCode, user, socket, micStreamRef, screenStreamRef });

  const handleNetworkScreenStop = useCallback(() => {
    stopScreenCalls();
    socket.emit("screen-share-stop", { roomCode, userId: user.id });
  }, [stopScreenCalls, roomCode, user.id]);

  const screenOnRef = useRef(screenOn);
  useEffect(() => {
    screenOnRef.current = screenOn;
  }, [screenOn]);

  const remoteScreen = useMemo(
    () => remoteStreams.find((s) => s.type === "screen"),
    [remoteStreams],
  );
  const micRemoteStreams = useMemo(
    () => remoteStreams.filter((s) => s.type === "mic"),
    [remoteStreams],
  );

  const raisedHandCount = useMemo(() => {
    return participants.filter((p) => {
      if (p.id === user.id) return myEmote === "raise";
      return peerEmotes?.[p.id] === "raise";
    }).length;
  }, [participants, user.id, myEmote, peerEmotes]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const userInitial = useMemo(
    () => user.username?.[0]?.toUpperCase() || "?",
    [user.username],
  );

  useEffect(() => {
    showChatRef.current = showChat;
  }, [showChat]);

  useEffect(() => {
    const activeStream =
      remoteScreen?.stream || (screenOn ? screenStreamRef.current : null);
    setScreenStream((prev) => (prev === activeStream ? prev : activeStream));
  }, [remoteScreen, screenOn, screenStreamRef, setScreenStream]);

  useEffect(() => {
    socket.on("you-were-removed", () => {
      alert("You have been removed from the room by the instructor.");
      localStorage.removeItem("currentRoom");
      navigate("/homepage");
    });
    return () => socket.off("you-were-removed");
  }, [navigate]);

  useEffect(() => {
    socket.on("screen-share-update", ({ userId: sharingUserId, active }) => {
      if (
        active &&
        String(sharingUserId) !== String(user.id) &&
        screenOnRef.current
      ) {
        stopScreen(handleNetworkScreenStop);
      }
    });
    return () => {
      socket.off("screen-share-update");
    };
  }, [stopScreen, handleNetworkScreenStop, user.id]);

  useEffect(() => {
    const handleRoomEnded = ({ message }) => {
      alert(message);
      localStorage.removeItem("currentRoom");
      navigate("/homepage");
    };
    const handleRoomEndedByYou = ({ message }) => {
      setChatMessages([]);
      alert(message);
      localStorage.removeItem("currentRoom");
      navigate("/homepage");
    };
    const handleRoomEndError = ({ message }) => {
      alert(`Failed to end room: ${message}`);
    };
    socket.on("room-ended", handleRoomEnded);
    socket.on("room-ended-by-you", handleRoomEndedByYou);
    socket.on("room-end-error", handleRoomEndError);
    return () => {
      socket.off("room-ended", handleRoomEnded);
      socket.off("room-ended-by-you", handleRoomEndedByYou);
      socket.off("room-end-error", handleRoomEndError);
    };
  }, [navigate, setChatMessages]);

  useEffect(() => {
    if (!room.id) return;
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/messages/${room.id}`)
      .then((r) => r.json())
      .then((data) => setChatMessages?.(data.messages || []))
      .catch(console.error);
  }, [room.id, setChatMessages]);

  useEffect(() => {
    if (showChat) chatEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [safeChatMessages.length, showChat]);

  useEffect(() => {
    socket.on("understanding-question", ({ pollId, totalStudents }) => {
      setPollQuestion({
        active: true,
        pollId,
        totalStudents,
        answered: false,
        response: null,
      });
      setPollResults((prev) => ({
        ...prev,
        active: true,
        pollId,
        yes: 0,
        no: 0,
        remaining: totalStudents,
        summary: "Poll in progress...",
      }));
    });
    socket.on("understanding-update", ({ pollId, yes, no, remaining }) => {
      setPollResults((prev) => {
        if (prev.pollId !== pollId) return prev;
        return {
          ...prev,
          active: true,
          yes,
          no,
          remaining,
          summary:
            remaining === 0
              ? no === 0
                ? "Everyone understands"
                : `${no} people don't understand`
              : `Waiting for ${remaining} student(s)`,
        };
      });
    });
    socket.on(
      "understanding-result",
      ({ pollId, yes, no, remaining, summary }) => {
        setPollResults({ active: false, pollId, yes, no, remaining, summary });
        setPollQuestion((prev) =>
          prev.pollId === pollId
            ? { ...prev, active: false, answered: true }
            : prev,
        );
      },
    );
    socket.on("understanding-error", ({ message }) => {
      setPollResults((prev) => ({ ...prev, active: false, summary: message }));
    });
    return () => {
      socket.off("understanding-question");
      socket.off("understanding-update");
      socket.off("understanding-result");
      socket.off("understanding-error");
    };
  }, []);

  useEffect(() => {
    const check = async () => {
      if (!deviceSections.audio) return;
      const audioPermission = await navigator.permissions.query({
        name: "microphone",
      });
      if (audioPermission.state === "prompt") {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((t) => t.stop());
      } else if (audioPermission.state === "denied") {
        alert(
          "Please allow microphone access from browser to see all audio devices.",
        );
        setDeviceSections({ audio: false });
        return;
      }
      setLoading(true);
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(
        devices.filter(
          (d) => d.kind === "audioinput" && !d.label.includes("Communications"),
        ),
      );
      setLoading(false);
    };
    check();
  }, [deviceSections]);

  const handleMicToggle = useCallback(async () => {
    const nextMic = !micOn;
    if (nextMic) {
      const stream = await startMic();
      if (stream) broadcastMic(stream);
    } else {
      stopMic();
    }
    socket.emit("mic-status", { roomCode, userId: user.id, mic: nextMic });
    setParticipants((prev) =>
      prev.map((p) => (p.id === user.id ? { ...p, mic: nextMic } : p)),
    );
  }, [
    micOn,
    startMic,
    broadcastMic,
    stopMic,
    roomCode,
    user.id,
    setParticipants,
  ]);

  const handleScreenToggle = useCallback(async () => {
    if (screenOn) {
      stopScreen(handleNetworkScreenStop);
      socket.emit("screen-share-stop", { roomCode, userId: user.id });
    } else {
      if (remoteScreen) {
        alert("Someone is already sharing their screen.");
        return;
      }
      const stream = await startScreen(handleNetworkScreenStop);
      if (!stream) return;
      const approved = await new Promise((resolve) => {
        socket.once("screen-share-approved", () => resolve(true));
        socket.once("screen-share-rejected", () => resolve(false));
        socket.emit("screen-share-start", { roomCode, userId: user.id });
      });
      if (approved) {
        broadcastScreen(stream);
      } else {
        stream.getTracks().forEach((t) => t.stop());
        alert("Someone is already sharing their screen.");
      }
    }
  }, [
    screenOn,
    remoteScreen,
    stopScreen,
    startScreen,
    broadcastScreen,
    handleNetworkScreenStop,
    roomCode,
    user.id,
  ]);

  const handleLeave = useCallback(() => {
    const confirmed = window.confirm(
      "Are you sure you want to leave the meeting?",
    );
    if (confirmed) {
      socket.emit("leave-room", { roomCode, userId: user.id });
      localStorage.removeItem("currentRoom");
      navigate("/homepage");
    }
  }, [roomCode, user.id, navigate]);

  const handleEndForAll = useCallback(async () => {
    const confirmed = window.confirm(
      "Are you sure you want to end the meeting for everyone?",
    );
    if (!confirmed) return;
    const roomId = room.id;
    if (roomId) {
      try {
        const liveRes = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/sessions/live/${roomId}`,
        );
        if (liveRes.ok) {
          const liveData = await liveRes.json();
          if (liveData?.session?.id) {
            await fetch(
              `${import.meta.env.VITE_BACKEND_URL}/api/sessions/end/${liveData.session.id}`,
              { method: "POST" },
            );
          }
        }
      } catch (err) {
        console.error("Failed to end session:", err);
      }
    }
    socket.emit("end-room", { roomCode, userId: user.id });
  }, [room.id, roomCode, user.id]);

  const handleEmote = useCallback(
    (emoteKey) => {
      const next = myEmote === emoteKey ? null : emoteKey;
      setMyEmote?.(next);
      setShowEmotes(false);
      socket.emit("emote", { roomCode, userId: user.id, emote: next });
    },
    [myEmote, setMyEmote, roomCode, user.id],
  );

  const handleRemoveParticipant = useCallback(
    (participantId, username) => {
      const confirmed = window.confirm(`Remove ${username} from the room?`);
      if (!confirmed) return;
      socket.emit("remove-participant", { roomCode, userId: participantId });
    },
    [roomCode],
  );

  const handleSendChat = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatMessages?.((prev) => [
      ...(prev ?? []),
      {
        userId: user.id,
        user_id: user.id,
        username: user.username,
        message: msg,
        sent_at: new Date().toISOString(),
      },
    ]);
    socket.emit("send-message", {
      roomCode,
      userId: user.id,
      username: user.username,
      message: msg,
    });
    setChatInput("");
  }, [chatInput, setChatMessages, user.id, user.username, roomCode]);

  const startUnderstandingPoll = useCallback(() => {
    if (!isInstructor) return;
    setIsPollPanelOpen(true);
    const pollId = `${roomCode}-${Date.now()}`;
    setPollQuestion({
      active: true,
      pollId,
      answered: false,
      response: null,
      totalStudents: 0,
    });
    setPollResults({
      active: true,
      pollId,
      yes: 0,
      no: 0,
      remaining: participants.filter((p) => p.role !== "instructor").length,
      summary: "Poll started, waiting for responses...",
    });
    socket.emit("start-understanding-poll", {
      roomCode,
      initiatedBy: user.id,
      pollId,
    });
  }, [isInstructor, roomCode, user.id, participants]);

  const submitUnderstandingAnswer = useCallback(
    (answer) => {
      if (!pollQuestion.active || pollQuestion.answered) return;
      const { pollId } = pollQuestion;
      socket.emit("understanding-answer", {
        roomCode,
        userId: user.id,
        pollId,
        answer,
      });
      setPollQuestion((prev) => ({
        ...prev,
        answered: true,
        response: answer,
        active: false,
      }));
      setPollResults((prev) => ({
        ...prev,
        summary: `You answered: ${answer.toUpperCase()}`,
      }));
    },
    [pollQuestion, roomCode, user.id],
  );

  const endUnderstandingPoll = useCallback(() => {
    if (!isInstructor) return;
    const pollId = pollResults.pollId || pollQuestion.pollId;
    if (!pollId) {
      setPollResults((prev) => ({
        ...prev,
        active: false,
        summary: "No active poll to end",
      }));
      return;
    }
    socket.emit("end-understanding-poll", { roomCode, pollId });
    setPollResults({
      active: false,
      pollId,
      yes: pollResults.yes ?? 0,
      no: pollResults.no ?? 0,
      remaining: Math.max(0, pollResults.remaining ?? 0),
      summary:
        (pollResults.yes ?? 0) + (pollResults.no ?? 0) > 0
          ? `Ended: ${pollResults.yes} understand, ${pollResults.no} don't understand`
          : "Poll ended with no responses",
    });
  }, [isInstructor, pollResults, pollQuestion.pollId, roomCode]);

  const openBox = useCallback((name) => {
    setShowEmotes(false);
    setShowChat(false);
    setBoxes({
      settings: false,
      leave: false,
      participants: false,
      [name]: true,
    });
  }, []);

  const closeBox = useCallback(
    (name) => setBoxes((p) => ({ ...p, [name]: false })),
    [],
  );
  const handlePanelMouseEnter = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  const handleCopyRoomCode = useCallback(async () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopyMessage("Copied!");
      copyTimerRef.current = setTimeout(() => setCopyMessage(""), 2000);
    } catch {
      setCopyMessage("Copy failed");
      copyTimerRef.current = setTimeout(() => setCopyMessage(""), 2000);
    }
  }, [roomCode]);

  const onTogglePollPanel = useCallback(
    () => setIsPollPanelOpen((p) => !p),
    [],
  );
  const onToggleParticipants = useCallback(() => {
    setShowEmotes(false);
    setShowChat(false);
    setBoxes((b) =>
      b.participants
        ? { ...b, participants: false }
        : { settings: false, leave: false, participants: true },
    );
  }, []);

  const onToggleChat = useCallback(() => {
    setShowChat((c) => {
      const next = !c;
      if (next) setUnreadCount(0);
      return next;
    });
    setShowEmotes(false);
    setBoxes({ settings: false, leave: false, participants: false });
  }, []);

  const onToggleEmotes = useCallback(() => {
    setShowEmotes((e) => !e);
    setShowChat(false);
    setBoxes({ settings: false, leave: false, participants: false });
  }, []);

  const onToggleSettings = useCallback(() => {
    setShowEmotes(false);
    setShowChat(false);
    setBoxes((b) =>
      b.settings
        ? { ...b, settings: false }
        : { settings: true, leave: false, participants: false },
    );
  }, []);

  const onOpenLeave = useCallback(() => openBox("leave"), [openBox]);
  const onChatInputChange = useCallback((value) => setChatInput(value), []);
  const onCloseParticipants = useCallback(
    () => closeBox("participants"),
    [closeBox],
  );
  const onCloseChat = useCallback(() => setShowChat(false), []);

  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    const newCount = safeChatMessages.length;
    if (newCount > prevMessageCountRef.current && !showChatRef.current) {
      const newMessages = safeChatMessages.slice(prevMessageCountRef.current);
      const othersCount = newMessages.filter(
        (msg) => msg.user_id !== user.id && msg.userId !== user.id,
      ).length;
      if (othersCount > 0) setUnreadCount((prev) => prev + othersCount);
    }
    prevMessageCountRef.current = newCount;
  }, [safeChatMessages, user.id]);

  return (
    <>
      <BoardNotifications isInstructor={isInstructor} />

      {pollQuestion.active && !isInstructor && (
        <div className="modal-overlay">
          <div className="modal">
            <div
              className="modal-icon"
              style={{
                background: "rgba(59, 130, 246, 0.1)",
                color: "var(--accent)",
              }}
            >
              <FaCheck size={24} />
            </div>
            <h3>Quick Check</h3>
            <p>Do you understand this topic?</p>
            <p
              style={{
                marginBottom: "20px",
                fontSize: "12px",
                color: "var(--muted)",
              }}
            >
              This is anonymous and just for the instructor.
            </p>
            <div className="modal-actions" style={{ gap: "12px" }}>
              <button
                className="btn"
                style={{
                  flex: 1,
                  backgroundColor: "var(--success)",
                  borderColor: "var(--success)",
                  color: "#fff",
                }}
                onClick={() => submitUnderstandingAnswer("yes")}
                disabled={pollQuestion.answered}
              >
                Yes
              </button>
              <button
                className="btn-danger"
                style={{ flex: 1 }}
                onClick={() => submitUnderstandingAnswer("no")}
                disabled={pollQuestion.answered}
              >
                No
              </button>
            </div>
            {pollQuestion.answered && (
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginTop: "16px",
                }}
              >
                Thanks! Your answer has been recorded.
              </p>
            )}
          </div>
        </div>
      )}

      <RemoteMicStreams streams={micRemoteStreams} />
      <MeetingTopBar
        roomCode={roomCode}
        roomName={room.room_name}
        isInstructor={isInstructor}
        userUsername={user.username}
        userInitial={userInitial}
        copyMessage={copyMessage}
        onCopyRoomCode={handleCopyRoomCode}
      />
      <MeetingBottomToolbar
        micOn={micOn}
        screenOn={screenOn}
        isInstructor={isInstructor}
        isPollPanelOpen={isPollPanelOpen}
        boxesParticipants={boxes.participants}
        boxesSettings={boxes.settings}
        showChat={showChat}
        showEmotes={showEmotes}
        unreadCount={unreadCount}
        raisedHandCount={raisedHandCount}
        onMicToggle={handleMicToggle}
        onScreenToggle={handleScreenToggle}
        onTogglePollPanel={onTogglePollPanel}
        onToggleParticipants={onToggleParticipants}
        onToggleChat={onToggleChat}
        onToggleEmotes={onToggleEmotes}
        onToggleSettings={onToggleSettings}
        onOpenLeave={onOpenLeave}
      />

      {/* Instructor Poll Panel */}
      {isInstructor && isPollPanelOpen && (
        <div
          className="meeting-panel"
          style={{ width: "260px", bottom: "84px", right: "20px" }}
        >
          <div className="panel-header" style={{ padding: "12px 16px" }}>
            <h3>Start understanding check</h3>
            <button
              type="button"
              onClick={() => setIsPollPanelOpen(false)}
              className="panel-close"
            >
              <IoClose size={18} />
            </button>
          </div>
          <div className="panel-content">
            <button
              className="btn"
              style={{ padding: "8px" }}
              onClick={startUnderstandingPoll}
            >
              Check Understanding
            </button>
            <button
              className="btn-outline"
              style={{ padding: "8px" }}
              onClick={endUnderstandingPoll}
              disabled={!pollResults.pollId && !pollResults.active}
            >
              End poll early
            </button>
            <div
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                marginTop: "8px",
              }}
            >
              <p>Yes: {pollResults.yes}</p>
              <p>No: {pollResults.no}</p>
              <p style={{ marginTop: "4px", fontWeight: "600" }}>
                {pollResults.summary}
              </p>
            </div>
          </div>
        </div>
      )}

      <MeetingParticipantsPanel
        open={boxes.participants}
        participants={participants}
        participantCount={participantCount}
        peerEmotes={peerEmotes}
        myEmote={myEmote}
        userId={user.id}
        isInstructor={isInstructor}
        onClose={onCloseParticipants}
        onRemoveParticipant={handleRemoveParticipant}
        onPanelMouseEnter={handlePanelMouseEnter}
      />
      <MeetingChatPanel
        open={showChat}
        messages={safeChatMessages}
        chatInput={chatInput}
        userId={user.id}
        userUsername={user.username}
        chatEndRef={chatEndRef}
        onClose={onCloseChat}
        onChatInputChange={onChatInputChange}
        onSend={handleSendChat}
        onPanelMouseEnter={handlePanelMouseEnter}
      />

      {/* Emotes Panel */}
      <div
        className={`meeting-panel ${showEmotes ? "" : "hidden"}`}
        style={{ width: "200px" }}
        onMouseEnter={handlePanelMouseEnter}
      >
        <div className="panel-header">
          <h3>Reactions</h3>
          <button onClick={() => setShowEmotes(false)} className="panel-close">
            <IoClose size={18} />
          </button>
        </div>
        <div className="panel-content">
          {EMOTES.map((e) => (
            <button
              key={e.key}
              onClick={() => handleEmote(e.key)}
              className={`react-btn ${myEmote === e.key ? "active" : ""}`}
            >
              {e.icon} {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Panel */}
      <div
        className={`meeting-panel ${boxes.settings ? "" : "hidden"}`}
        style={{ width: "260px" }}
        onMouseEnter={handlePanelMouseEnter}
      >
        <div className="panel-header">
          <h3>Settings</h3>
          <button onClick={() => closeBox("settings")} className="panel-close">
            <IoClose size={18} />
          </button>
        </div>
        <div className="panel-content">
          <button
            onClick={() => setDeviceDropDown(!deviceDropDown)}
            className="btn-outline"
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px",
              width: "100%",
            }}
          >
            Audio Devices
            {deviceDropDown ? (
              <IoMdArrowDropdown size={16} />
            ) : (
              <IoMdArrowDropright size={16} />
            )}
          </button>

          <div
            className={`${deviceDropDown ? "" : "hidden"}`}
            style={{ marginTop: "8px", paddingLeft: "8px" }}
          >
            <button
              onClick={() =>
                setDeviceSections((prev) => ({ audio: !prev.audio }))
              }
              style={{
                background: "var(--surface2)",
                border: "none",
                color: "var(--text)",
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              Audio Input
              {deviceSections.audio ? (
                <IoMdArrowDropdown size={16} />
              ) : (
                <IoMdArrowDropright size={16} />
              )}
            </button>
            <div
              className={`${deviceSections.audio && !loading ? "" : "hidden"}`}
              style={{
                marginTop: "4px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              {audioDevices.map((value, index) => (
                <button
                  key={index}
                  onClick={() =>
                    setSelectedDevice((prev) => ({
                      ...prev,
                      audio: value.deviceId,
                    }))
                  }
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    fontSize: "11px",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {value.label}
                  </span>
                  {value.deviceId === selectedDevice.audio && (
                    <FaCheck
                      color="var(--accent)"
                      size={12}
                      style={{ flexShrink: 0, marginLeft: "8px" }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Leave Panel */}
      <div
        className={`meeting-panel ${boxes.leave ? "" : "hidden"}`}
        style={{ width: "220px" }}
        onMouseEnter={handlePanelMouseEnter}
      >
        <div className="panel-header">
          <h3>Leave Room</h3>
          <button onClick={() => closeBox("leave")} className="panel-close">
            <IoClose size={18} />
          </button>
        </div>
        <div className="panel-content">
          <button
            onClick={handleLeave}
            className="btn-outline"
            style={{ color: "var(--error)", borderColor: "var(--error)" }}
          >
            Leave Meeting
          </button>
          {isInstructor && (
            <button onClick={handleEndForAll} className="btn-danger">
              End for All
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default MeetingInterface;
