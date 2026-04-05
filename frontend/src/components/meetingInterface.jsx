import { useState, useEffect, useRef } from "react";
import { useMedia } from "../helper/useMedia";
import { socket } from "../helper/socket";
import { usePeer } from "../helper/usePeer";
import { useRoom } from "../components/roomContext";
import RemoteStream from "./remoteSream";
import { IoMdArrowDropright, IoMdArrowDropdown } from "react-icons/io";
import { FaCheck } from "react-icons/fa6";
import { IoClose, IoSettings, IoPeople } from "react-icons/io5";
import { ImPhoneHangUp } from "react-icons/im";
import { BsMicFill, BsMicMuteFill, BsChatFill } from "react-icons/bs";
import { LuScreenShare } from "react-icons/lu";
import { MdEmojiEmotions } from "react-icons/md";
import { useParams, useNavigate } from "react-router-dom";
import copyIcon from "../assets/copy.svg";
import BoardNotifications from "./boardNotification";

const EMOTES = [{ label: "✋ Raise Hand", key: "raise" }];

const MeetingInterface = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("userSession") || "{}");
  const room = JSON.parse(localStorage.getItem("currentRoom") || "{}");
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

  const safeChatMessages = chatMessages ?? [];

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

  const { remoteStreams, broadcastMic, broadcastScreen } = usePeer({
    roomCode,
    user,
    socket,
    micStreamRef,
    screenStreamRef,
  });

  const remoteScreen = remoteStreams.find((s) => s.type === "screen");

  const raisedHandCount = participants.filter((p) => {
    if (p.id === user.id) return myEmote === "raise";
    return peerEmotes?.[p.id] === "raise";
  }).length;

  useEffect(() => {
    showChatRef.current = showChat;
  }, [showChat]);

  useEffect(() => {
    const activeStream =
      remoteScreen?.stream || (screenOn ? screenStreamRef.current : null);
    setScreenStream(activeStream);
  }, [remoteScreen, screenOn, screenStreamRef, setScreenStream]);

  useEffect(() => {
    socket.on("participants-update", (updatedList) => {
      setParticipants(updatedList);
    });
    return () => socket.off("participants-update");
  }, [setParticipants]);

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
  }, [navigate]);

  useEffect(() => {
    if (!room.id) return;
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/messages/${room.id}`)
      .then((r) => r.json())
      .then((data) => setChatMessages?.(data.messages || []))
      .catch(console.error);
  }, [room.id]);

  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [safeChatMessages, showChat]);

  useEffect(() => {
    if (showChat) setUnreadCount(0);
  }, [showChat]);

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

  // Handlers

  const handleMicToggle = async () => {
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
  };

  const handleScreenToggle = async () => {
    if (screenOn) {
      stopScreen();
    } else {
      const stream = await startScreen();
      if (stream) broadcastScreen(stream);
    }
  };

  const handleLeave = () => {
    const confirmed = window.confirm(
      "Are you sure you want to leave the meeting?",
    );
    if (confirmed) {
      socket.emit("leave-room", { roomCode, userId: user.id });
      localStorage.removeItem("currentRoom");
      navigate("/homepage");
    }
  };

  const handleEndForAll = async () => {
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
              {
                method: "POST",
              },
            );
          }
        }
      } catch (err) {
        console.error("Failed to end session:", err);
      }
    }
    socket.emit("end-room", { roomCode, userId: user.id });
  };

  const handleEmote = (emoteKey) => {
    const next = myEmote === emoteKey ? null : emoteKey;
    setMyEmote?.(next);
    setShowEmotes(false);
    socket.emit("emote", { roomCode, userId: user.id, emote: next });
  };

  const handleSendChat = () => {
    const msg = chatInput.trim();
    if (!msg) return;

    console.log("SENDING:", msg);

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
  };

  // Poll handlers

  const startUnderstandingPoll = () => {
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
  };

  const submitUnderstandingAnswer = (answer) => {
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
  };

  const endUnderstandingPoll = () => {
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
  };

  // Box helpers

  const openBox = (name) => {
    setShowEmotes(false);
    setShowChat(false);
    setBoxes({
      settings: false,
      leave: false,
      participants: false,
      [name]: true,
    });
  };

  const closeBox = (name) => setBoxes((p) => ({ ...p, [name]: false }));

  const handlePanelMouseEnter = () => {
    if (document.pointerLockElement) document.exitPointerLock();
  };

  const panelClass =
    "fixed bottom-[70px] right-2 z-20 bg-[#111827] border border-[#1e2d45] rounded-2xl shadow-xl";

  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    const newCount = safeChatMessages.length;
    if (newCount > prevMessageCountRef.current && !showChatRef.current) {
      const newMessages = safeChatMessages.slice(prevMessageCountRef.current);
      const othersCount = newMessages.filter(
        (msg) => msg.user_id !== user.id && msg.userId !== user.id,
      ).length;
      if (othersCount > 0) {
        setUnreadCount((prev) => prev + othersCount);
      }
    }
    prevMessageCountRef.current = newCount;
  }, [safeChatMessages.length]);

  return (
    <>
      <BoardNotifications isInstructor={isInstructor} />
      {/* Understanding poll modal for students */}
      {pollQuestion.active && !isInstructor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-[#0f172a] border border-[#1e2d45] rounded-xl p-5 w-80">
            <h3 className="text-white text-sm font-bold mb-3">Quick Check</h3>
            <p className="text-white text-sm font-bold mb-3">
              Do you understand this topic?
            </p>
            <p className="text-slate-300 text-xs mb-4">
              This is anonymous and just for the instructor.
            </p>
            <div className="flex justify-between gap-2">
              <button
                className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => submitUnderstandingAnswer("yes")}
                disabled={pollQuestion.answered}
              >
                Yes
              </button>
              <button
                className="flex-1 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white"
                onClick={() => submitUnderstandingAnswer("no")}
                disabled={pollQuestion.answered}
              >
                No
              </button>
            </div>
            {pollQuestion.answered && (
              <p className="text-slate-300 text-[11px] mt-3">
                Thanks! Your answer has been recorded.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Remote audio streams */}
      {remoteStreams
        .filter((s) => s.type === "mic")
        .map((s, i) => (
          <RemoteStream
            key={i}
            stream={s.stream}
            type={s.type}
            username={s.username}
          />
        ))}

      {/* TOP BAR */}
      <div className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-[#111827] border-b border-[#1e2d45]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm">
            🎓
          </div>
          <span className="text-slate-200 text-sm font-bold">
            Virtual<span className="text-cyan-400">Class</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">Room:</span>
          <div className="flex items-center gap-1 bg-[#1a2235] px-2 py-1 rounded-lg border border-[#1e2d45]">
            <span className="text-slate-200 text-xs font-mono">{roomCode}</span>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(roomCode);
                  setCopyMessage("Copied!");
                  setTimeout(() => setCopyMessage(""), 2000);
                } catch {
                  setCopyMessage("Copy failed");
                  setTimeout(() => setCopyMessage(""), 2000);
                }
              }}
              className="bg-[#1a2235] text-slate-400 hover:text-slate-300 transition-colors p-0.5 rounded"
              title="Copy room code"
            >
              <img src={copyIcon} alt="Copy" className="w-3 h-3" />
            </button>
          </div>
          {copyMessage && (
            <span className="text-slate-400 text-[10px]">{copyMessage}</span>
          )}
          {room.room_name && (
            <span className="text-slate-400 text-xs">· {room.room_name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isInstructor && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
              Instructor
            </span>
          )}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xs">
            {user.username?.[0]?.toUpperCase() || "?"}
          </div>
          <span className="text-slate-300 text-xs font-semibold">
            {user.username}
          </span>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="fixed w-full bottom-3 flex justify-center z-20">
        <div className="flex items-center gap-2 bg-[#111827] border border-[#1e2d45] px-4 py-2 rounded-2xl shadow-xl">
          <button
            onClick={handleMicToggle}
            className={`flex flex-col items-center px-3 py-2 rounded-xl hover:bg-[#1a2235] transition-colors ${micOn ? "text-blue-400" : "text-slate-500"}`}
          >
            {micOn ? <BsMicFill size={22} /> : <BsMicMuteFill size={22} />}
            <span className="text-[10px] mt-1 select-none">Mic</span>
          </button>

          <button
            onClick={handleScreenToggle}
            className={`flex flex-col items-center px-3 py-2 rounded-xl hover:bg-[#1a2235] transition-colors ${screenOn ? "text-emerald-400" : "text-slate-500"}`}
          >
            <LuScreenShare size={22} />
            <span className="text-[10px] mt-1 select-none">
              {screenOn ? "Sharing" : "Screen"}
            </span>
          </button>

          {isInstructor && (
            <button
              onClick={() => setIsPollPanelOpen((p) => !p)}
              className={`flex flex-col items-center px-3 py-2 rounded-xl hover:bg-[#1a2235] transition-colors ${isPollPanelOpen ? "text-blue-400" : "text-slate-500"}`}
            >
              <FaCheck size={22} />
              <span className="text-[10px] mt-1 select-none">Start Check</span>
            </button>
          )}

          <div className="w-px h-8 bg-[#1e2d45] mx-1" />

          <button
            onClick={() =>
              boxes.participants
                ? closeBox("participants")
                : openBox("participants")
            }
            className={`relative flex flex-col items-center px-3 py-2 rounded-xl hover:bg-[#1a2235] transition-colors ${boxes.participants ? "text-blue-400" : "text-slate-500"}`}
          >
            <IoPeople size={22} />
            {raisedHandCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-[10px] rounded-full flex items-center justify-center">
                ✋
              </span>
            )}
            <span className="text-[10px] mt-1 select-none">People</span>
          </button>

          <button
            onClick={() => {
              setShowChat(!showChat);
              setShowEmotes(false);
              setBoxes({ settings: false, leave: false, participants: false });
            }}
            className={`relative flex flex-col items-center px-3 py-2 rounded-xl hover:bg-[#1a2235] transition-colors ${showChat ? "text-blue-400" : "text-slate-500"}`}
          >
            <BsChatFill size={20} />
            {unreadCount > 0 && !showChat && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <span className="text-[10px] mt-1 select-none">Chat</span>
          </button>

          <button
            onClick={() => {
              setShowEmotes(!showEmotes);
              setShowChat(false);
              setBoxes({ settings: false, leave: false, participants: false });
            }}
            className={`flex flex-col items-center px-3 py-2 rounded-xl hover:bg-[#1a2235] transition-colors ${showEmotes ? "text-yellow-400" : "text-slate-500"}`}
          >
            <MdEmojiEmotions size={22} />
            <span className="text-[10px] mt-1 select-none">React</span>
          </button>

          <button
            onClick={() =>
              boxes.settings ? closeBox("settings") : openBox("settings")
            }
            className={`flex flex-col items-center px-3 py-2 rounded-xl hover:bg-[#1a2235] transition-colors ${boxes.settings ? "text-blue-400" : "text-slate-500"}`}
          >
            <IoSettings size={22} />
            <span className="text-[10px] mt-1 select-none">Settings</span>
          </button>

          <div className="w-px h-8 bg-[#1e2d45] mx-1" />

          <button
            onClick={() => openBox("leave")}
            className="flex flex-col items-center px-3 py-2 rounded-xl hover:bg-rose-500/10 transition-colors text-rose-400"
          >
            <ImPhoneHangUp size={22} />
            <span className="text-[10px] mt-1 select-none">Leave</span>
          </button>
        </div>
      </div>

      {/* INSTRUCTOR POLL PANEL */}
      {isInstructor && isPollPanelOpen && (
        <div className="fixed bottom-20 right-4 z-30 w-72 p-3 bg-[#0f172a] border border-[#1e2d45] rounded-xl shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white text-sm font-semibold">
              Start understanding check
            </p>
            <button
              onClick={() => setIsPollPanelOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <button
            onClick={startUnderstandingPoll}
            className="w-full py-2 mb-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-black text-xs font-semibold"
          >
            Check Understanding
          </button>
          <button
            onClick={endUnderstandingPoll}
            className="w-full py-2 mb-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold"
            disabled={!pollResults.pollId && !pollResults.active}
          >
            End poll early
          </button>
          <div className="text-slate-300 text-[11px] space-y-1">
            <div>Yes: {pollResults.yes}</div>
            <div>No: {pollResults.no}</div>
            <div>{pollResults.summary}</div>
          </div>
        </div>
      )}

      {/* PARTICIPANTS PANEL */}
      <div
        className={`${panelClass} w-64 ${boxes.participants ? "" : "hidden"}`}
        onMouseEnter={handlePanelMouseEnter}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d45]">
          <p className="text-slate-200 font-semibold text-sm">
            Participants ({participants.length})
          </p>
          <button
            onClick={() => closeBox("participants")}
            className="text-slate-500 hover:text-slate-300"
          >
            <IoClose size={18} />
          </button>
        </div>
        <div className="p-3 flex flex-col gap-2 max-h-72 overflow-y-auto">
          {participants.map((p, i) => {
            const isMe = p.id === user.id;
            const hasHandRaised = isMe
              ? myEmote === "raise"
              : peerEmotes?.[p.id] === "raise";

            return (
              <div
                key={i}
                className="flex items-center gap-2.5 bg-[#1a2235] rounded-xl px-3 py-2"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {p.username?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-xs font-semibold truncate">
                    {p.username}{" "}
                    {isMe && <span className="text-slate-500">(you)</span>}
                  </p>
                  <p className="text-[11px] capitalize">
                    {p.role === "instructor" ? (
                      <span className="text-violet-400">{p.role}</span>
                    ) : (
                      <span className="text-slate-500">{p.role}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {hasHandRaised && (
                    <span className="text-sm" title="Hand raised">
                      ✋
                    </span>
                  )}
                  {p.mic ? (
                    <BsMicFill size={12} color="#3b82f6" />
                  ) : (
                    <BsMicMuteFill size={12} color="#64748b" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHAT PANEL */}
      <div
        className={`fixed bottom-[70px] right-2 z-20 bg-[#111827] border border-[#1e2d45] rounded-2xl shadow-xl w-72 flex flex-col ${showChat ? "" : "hidden"}`}
        style={{ height: "360px" }}
        onMouseEnter={handlePanelMouseEnter}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d45] flex-shrink-0">
          <p className="text-slate-200 font-semibold text-sm">Chat</p>
          <button
            onClick={() => setShowChat(false)}
            className="text-slate-500 hover:text-slate-300"
          >
            <IoClose size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {safeChatMessages.length === 0 && (
            <p className="text-slate-600 text-xs text-center mt-4">
              No messages yet
            </p>
          )}
          {safeChatMessages.map((msg, i) => {
            const isMe = msg.user_id === user.id || msg.userId === user.id;
            return (
              <div
                key={i}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <span className="text-[10px] text-slate-500 mb-0.5 px-1">
                  {msg.username || (isMe ? user.username : "Guest")}
                </span>
                <div
                  className={`px-3 py-2 rounded-2xl text-xs max-w-[85%] break-words ${isMe ? "bg-blue-500 text-white rounded-tr-sm" : "bg-[#1a2235] text-slate-200 rounded-tl-sm"}`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
        <div className="flex-shrink-0 p-3 border-t border-[#1e2d45] flex gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
            placeholder="Type a message…"
            className="flex-1 px-3 py-2 bg-[#0b0f1a] border border-[#1e2d45] rounded-xl text-slate-200 text-xs outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
          />
          <button
            onClick={handleSendChat}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {/* EMOTE PICKER PANEL */}
      <div
        className={`${panelClass} w-56 ${showEmotes ? "" : "hidden"}`}
        onMouseEnter={handlePanelMouseEnter}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d45]">
          <p className="text-slate-200 font-semibold text-sm">Reactions</p>
          <button
            onClick={() => setShowEmotes(false)}
            className="text-slate-500 hover:text-slate-300"
          >
            <IoClose size={18} />
          </button>
        </div>
        <div className="p-3 grid grid-cols-2 gap-2">
          {EMOTES.map((e) => (
            <button
              key={e.key}
              onClick={() => handleEmote(e.key)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-colors border ${myEmote === e.key ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-[#1a2235] text-slate-300 border-[#1e2d45] hover:bg-[#1e2d45]"}`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* SETTINGS PANEL */}
      <div
        className={`${panelClass} w-72 flex flex-col ${boxes.settings ? "" : "hidden"}`}
        onMouseEnter={handlePanelMouseEnter}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d45]">
          <p className="text-slate-200 font-semibold text-sm">Settings</p>
          <button
            onClick={() => closeBox("settings")}
            className="text-slate-500 hover:text-slate-300"
          >
            <IoClose size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <button
            onClick={() => setDeviceDropDown(!deviceDropDown)}
            className="flex items-center justify-between p-2.5 rounded-xl w-full bg-[#1a2235] hover:bg-[#1e2d45] text-slate-300 text-sm transition-colors"
          >
            Audio Devices
            {deviceDropDown ? <IoMdArrowDropdown /> : <IoMdArrowDropright />}
          </button>
          <div className={`mt-1 pl-2 ${deviceDropDown ? "" : "hidden"}`}>
            <button
              onClick={() =>
                setDeviceSections((prev) => ({ audio: !prev.audio }))
              }
              className="flex items-center mt-1 py-2 px-2.5 justify-between rounded-xl w-full bg-[#1a2235] hover:bg-[#1e2d45] text-slate-400 text-xs transition-colors"
            >
              Audio Input
              {deviceSections.audio ? (
                <IoMdArrowDropdown />
              ) : (
                <IoMdArrowDropright />
              )}
            </button>
            <div
              className={`${deviceSections.audio && !loading ? "" : "hidden"} w-full p-1`}
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
                  className={`flex items-center justify-between bg-[#1a2235] hover:bg-[#1e2d45] py-2 px-2.5 w-full text-slate-400 text-xs transition-colors ${index === 0 ? "rounded-t-xl" : ""} ${index === audioDevices.length - 1 ? "rounded-b-xl" : ""}`}
                >
                  <span className="truncate">{value.label}</span>
                  {value.deviceId === selectedDevice.audio && (
                    <FaCheck color="#3b82f6" size={10} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* LEAVE PANEL */}
      <div
        className={`${panelClass} w-56 ${boxes.leave ? "" : "hidden"}`}
        onMouseEnter={handlePanelMouseEnter}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d45]">
          <p className="text-slate-200 font-semibold text-sm">Leave Room</p>
          <button
            onClick={() => closeBox("leave")}
            className="text-slate-500 hover:text-slate-300"
          >
            <IoClose size={18} />
          </button>
        </div>
        <div className="p-3 flex flex-col gap-2">
          <button
            onClick={handleLeave}
            className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl transition-colors border border-rose-500/25"
          >
            Leave Meeting
          </button>
          {isInstructor && (
            <button
              onClick={handleEndForAll}
              className="w-full py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-semibold rounded-xl transition-colors border border-rose-500/25"
            >
              End for All
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default MeetingInterface;
