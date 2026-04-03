import { useState, useEffect } from "react";
import { useMedia } from "../helper/useMedia";
import { socket } from "../helper/socket";
import { usePeer } from "../helper/usePeer";
import { useRoom } from "../components/roomContext";
import RemoteStream from "./remoteSream";
import { IoMdArrowDropright, IoMdArrowDropdown } from "react-icons/io";
import { FaCheck } from "react-icons/fa6";
import { IoClose, IoSettings, IoPeople } from "react-icons/io5";
import { ImPhoneHangUp } from "react-icons/im";
import { BsMicFill, BsMicMuteFill } from "react-icons/bs";
import { LuScreenShare } from "react-icons/lu";
import { useParams, useNavigate } from "react-router-dom";
import copyIcon from "../assets/copy.svg";

const MeetingInterface = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("userSession") || "{}");
  const room = JSON.parse(localStorage.getItem("currentRoom") || "{}");
  const isInstructor = user.role === "instructor";

  const { participants, setParticipants, setScreenStream } = useRoom();

  const [boxes, setBoxes] = useState({
    settings: false,
    leave: false,
    participants: false,
  });
  const [copyMessage, setCopyMessage] = useState("");
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

  const remoteScreen = remoteStreams.find((s) => s.type === "screen");

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

  // End session
  const handleEndForAll = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to end the meeting for everyone?",
    );
    if (!confirmed) return;

    const roomId = room.id;
    if (roomId) {
      try {
        const liveRes = await fetch(`/api/sessions/live/${roomId}`);
        if (liveRes.ok) {
          const liveData = await liveRes.json();

          if (liveData?.session?.id) {
            await fetch(`/api/sessions/end/${liveData.session.id}`, {
              method: "POST",
            });
          }
        }
      } catch (err) {
        console.error("Failed to end session:", err);
      }
    }

    socket.emit("end-room", { roomCode, userId: user.id });
  };

  const openBox = (name) =>
    setBoxes({
      settings: false,
      leave: false,
      participants: false,
      [name]: true,
    });
  const closeBox = (name) => setBoxes((p) => ({ ...p, [name]: false }));

  const handlePanelMouseEnter = () => {
    if (document.pointerLockElement) document.exitPointerLock();
  };

  const panelClass =
    "fixed bottom-[70px] right-2 z-20 bg-[#111827] border border-[#1e2d45] rounded-2xl shadow-xl";

  return (
    <>
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
                <p className="text-[11px] capitalize">
                  {p.role === "instructor" ? (
                    <span className="text-violet-400">{p.role}</span>
                  ) : (
                    <span className="text-slate-500">{p.role}</span>
                  )}
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
