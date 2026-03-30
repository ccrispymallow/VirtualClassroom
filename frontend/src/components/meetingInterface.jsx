import { useState, useEffect } from "react";
import { useMedia } from "../helper/useMedia";
import { socket } from "../helper/socket";
import { usePeer } from "../helper/usePeer";
import { useRoom } from "../components/roomContext";
import RemoteStream from "./remoteSream";
import { IoMdArrowDropright, IoMdArrowDropdown } from "react-icons/io";
import { FaCheck } from "react-icons/fa6";
import {
  IoClose,
  IoChatboxEllipses,
  IoSettings,
  IoPeople,
} from "react-icons/io5";
import { ImPhoneHangUp } from "react-icons/im";
import { BsMicFill, BsMicMuteFill } from "react-icons/bs";
import { LuScreenShare } from "react-icons/lu";
import { useParams, useNavigate } from "react-router-dom";

const MeetingInterface = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("userSession") || "{}");
  const room = JSON.parse(localStorage.getItem("currentRoom") || "{}");

  const { participants, setParticipants } = useRoom();

  const [boxes, setBoxes] = useState({
    chat: false,
    settings: false,
    leave: false,
    participants: false,
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [deviceDropDown, setDeviceDropDown] = useState(false);
  const [deviceSections, setDeviceSections] = useState({ audio: false });
  const [audioDevices, setAudioDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState({ audio: null });

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

  useEffect(() => {
    socket.on("participants-update", (updatedList) => {
      setParticipants(updatedList);
    });
    return () => socket.off("participants-update");
  }, [setParticipants]);

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

  const handleMicToggle = async () => {
    if (micOn) {
      stopMic();
    } else {
      const stream = await startMic();
      if (stream) broadcastMic(stream);
    }
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
    socket.emit("leave-room", { roomCode, userId: user.id });
    localStorage.removeItem("currentRoom");
    navigate("/home");
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        text: input,
        time: new Date().toLocaleTimeString(),
        username: user.username,
      },
    ]);
    setInput("");
  };

  const openBox = (name) =>
    setBoxes({
      chat: false,
      settings: false,
      leave: false,
      participants: false,
      [name]: true,
    });
  const closeBox = (name) => setBoxes((p) => ({ ...p, [name]: false }));

  const panelClass =
    "fixed bottom-[70px] right-2 z-20 bg-[#111827] border border-[#1e2d45] rounded-2xl shadow-xl";

  return (
    <>
      {remoteStreams.map((s, i) => (
        <RemoteStream
          key={i}
          stream={s.stream}
          type={s.type}
          username={s.username}
        />
      ))}

      {/* ── TOP BAR ── */}
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
          <span className="text-slate-200 text-xs font-mono bg-[#1a2235] px-2 py-1 rounded-lg border border-[#1e2d45]">
            {roomCode}
          </span>
          {room.room_name && (
            <span className="text-slate-400 text-xs">· {room.room_name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xs">
            {user.username?.[0]?.toUpperCase() || "?"}
          </div>
          <span className="text-slate-300 text-xs font-semibold">
            {user.username}
          </span>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
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
            <span className="text-[10px] mt-1 select-none">Screen</span>
          </button>

          <div className="w-px h-8 bg-[#1e2d45] mx-1" />

          <button
            onClick={() =>
              boxes.participants
                ? closeBox("participants")
                : openBox("participants")
            }
            className={`flex flex-col items-center px-3 py-2 rounded-xl hover:bg-[#1a2235] transition-colors ${boxes.participants ? "text-blue-400" : "text-slate-500"}`}
          >
            <IoPeople size={22} />
            <span className="text-[10px] mt-1 select-none">People</span>
          </button>

          <button
            onClick={() => (boxes.chat ? closeBox("chat") : openBox("chat"))}
            className={`flex flex-col items-center px-3 py-2 rounded-xl hover:bg-[#1a2235] transition-colors ${boxes.chat ? "text-blue-400" : "text-slate-500"}`}
          >
            <IoChatboxEllipses size={22} />
            <span className="text-[10px] mt-1 select-none">Chat</span>
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

      {/* ── PARTICIPANTS PANEL ── */}
      <div
        className={`${panelClass} w-64 ${boxes.participants ? "" : "hidden"}`}
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
          {participants.map((p, i) => (
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
                  {p.id === user.id && (
                    <span className="text-slate-500">(you)</span>
                  )}
                </p>
                <p className="text-slate-500 text-[11px] capitalize">
                  {p.role}
                </p>
              </div>
              <div className="flex-shrink-0">
                {p.mic ? (
                  <BsMicFill size={12} color="#3b82f6" />
                ) : (
                  <BsMicMuteFill size={12} color="#64748b" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CHAT PANEL ── */}
      <div
        className={`${panelClass} w-72 flex flex-col ${boxes.chat ? "" : "hidden"}`}
        style={{ height: "380px" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d45]">
          <p className="text-slate-200 font-semibold text-sm">Chat</p>
          <button
            onClick={() => closeBox("chat")}
            className="text-slate-500 hover:text-slate-300"
          >
            <IoClose size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {messages.length === 0 ? (
            <p className="text-slate-600 text-xs text-center mt-4">
              No messages yet
            </p>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${m.username === user.username ? "items-end" : "items-start"}`}
              >
                <span className="text-slate-500 text-[10px] mb-0.5">
                  {m.username} · {m.time}
                </span>
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs max-w-[85%] ${m.username === user.username ? "bg-blue-500 text-white" : "bg-[#1a2235] text-slate-200"}`}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2 p-3 border-t border-[#1e2d45]">
          <input
            className="flex-1 bg-[#1a2235] border border-[#1e2d45] rounded-xl px-3 py-2 text-slate-200 text-xs outline-none focus:border-blue-500 placeholder:text-slate-600"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-xs px-3 rounded-xl font-bold hover:opacity-90"
          >
            Send
          </button>
        </div>
      </div>

      {/* ── SETTINGS PANEL ── */}
      <div
        className={`${panelClass} w-72 flex flex-col ${boxes.settings ? "" : "hidden"}`}
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
                  className={`flex items-center justify-between bg-[#1a2235] hover:bg-[#1e2d45] py-2 px-2.5 w-full text-slate-400 text-xs transition-colors
                    ${index === 0 ? "rounded-t-xl" : ""}
                    ${index === audioDevices.length - 1 ? "rounded-b-xl" : ""}`}
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

      {/* ── LEAVE PANEL ── */}
      <div className={`${panelClass} w-56 ${boxes.leave ? "" : "hidden"}`}>
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
            🚪 Leave Meeting
          </button>
          <button
            disabled
            title="Available for room creator"
            className="w-full py-2.5 bg-rose-500/10 text-rose-400 text-xs font-semibold rounded-xl border border-rose-500/25 opacity-50 cursor-not-allowed"
          >
            ⛔ End for All
          </button>
        </div>
      </div>
    </>
  );
};

export default MeetingInterface;
