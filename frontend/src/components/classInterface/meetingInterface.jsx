import { useState, useEffect } from "react";
import { IoMdArrowDropright, IoMdArrowDropdown } from "react-icons/io";
import { FaCheck } from "react-icons/fa6";
import { IoClose, IoChatboxEllipses, IoSettings } from "react-icons/io5";
import { ImPhoneHangUp } from "react-icons/im";
import {
  BsMicFill,
  BsMicMuteFill,
  BsCameraVideoFill,
  BsCameraVideoOffFill,
} from "react-icons/bs";
import { LuScreenShare } from "react-icons/lu";

const MeetingInterface = () => {
  // --- shared box state ---
  const [boxes, setBoxes] = useState({
    chat: false,
    settings: false,
    leave: false,
  });

  // --- bottom bar state ---
  const [micOn, setMicOn] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  // --- chat state ---
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // --- settings state ---
  const [deviceDropDown, setDeviceDropDown] = useState(false);
  const [deviceSections, setDeviceSections] = useState({
    audio: false,
    video: false,
  });
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [loading, setLoading] = useState({ audio: false, video: false });
  const [selectedDevice, setSelectedDevice] = useState({
    audio: null,
    video: null,
  });

  useEffect(() => {
    const check = async () => {
      if (deviceSections.audio) {
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
          setDeviceSections({ ...deviceSections, audio: false });
          return;
        }
        setLoading({ audio: true, video: false });
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          setAudioDevices(
            devices.filter(
              (d) =>
                d.kind === "audioinput" && !d.label.includes("Communications"),
            ),
          );
          setLoading({ audio: false, video: false });
        });
      } else if (deviceSections.video) {
        const cameraPermission = await navigator.permissions.query({
          name: "camera",
        });
        if (cameraPermission.state === "prompt") {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          stream.getTracks().forEach((t) => t.stop());
        } else if (cameraPermission.state === "denied") {
          alert(
            "Please allow camera access from browser to see all video devices.",
          );
        }
        setLoading({ audio: false, video: true });
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
          setLoading({ audio: false, video: false });
        });
      }
    };
    check();
  }, [deviceSections]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { text: input, time: new Date().toLocaleTimeString() },
    ]);
    setInput("");
  };

  return (
    <>
      {/* ── BOTTOM BAR ── */}
      <div className="fixed w-full bottom-2 flex justify-center z-20">
        <div className="flex min-w-[15%] justify-between bg-gray-300 px-2 rounded">
          <div
            onClick={() => setMicOn((p) => !p)}
            className="px-1 pt-1 hover:bg-white rounded cursor-pointer"
          >
            {micOn ? (
              <BsMicFill color="#5c89d1" size={40} className="ml-2" />
            ) : (
              <BsMicMuteFill color="#5c89d1" size={40} className="ml-2" />
            )}
            <p className="text-xs text-black select-none">Global Mic</p>
          </div>
          <div
            onClick={() => setScreenOn((p) => !p)}
            className="px-1 pt-1 rounded hover:bg-white cursor-pointer"
          >
            <LuScreenShare color={screenOn ? "#42f563" : "#5c89d1"} size={40} />
            <p className="text-xs text-black select-none">Screen</p>
          </div>
          <div
            onClick={() => setVideoOn((p) => !p)}
            className="px-1 pt-1 hover:bg-white rounded cursor-pointer"
          >
            {videoOn ? (
              <BsCameraVideoFill color="#5c89d1" size={40} />
            ) : (
              <BsCameraVideoOffFill color="#5c89d1" size={40} />
            )}
            <p className="text-xs text-black select-none">Video</p>
          </div>
        </div>
      </div>

      {/* ── RIGHT BAR BUTTONS ── */}
      <div className="fixed bottom-3 right-2 z-20 flex gap-2">
        <button
          onClick={() =>
            setBoxes((p) => ({ settings: false, leave: false, chat: !p.chat }))
          }
          className="bg-gray-300 px-2 h-12 rounded-[100px] flex items-center hover:bg-white"
        >
          <IoChatboxEllipses size={30} color="#5c89d1" />
        </button>
        <button
          onClick={() =>
            setBoxes((p) => ({
              chat: false,
              leave: false,
              settings: !p.settings,
            }))
          }
          className="bg-gray-300 px-2 h-12 rounded-[100px] flex items-center hover:bg-white"
        >
          <IoSettings size={30} color="#5c89d1" />
        </button>
        <button
          onClick={() =>
            setBoxes((p) => ({ chat: false, settings: false, leave: !p.leave }))
          }
          className="bg-gray-300 px-2 h-12 rounded-[100px] flex items-center hover:bg-white"
        >
          <ImPhoneHangUp size={30} color="#db3954" />
        </button>
      </div>

      {/* ── CHAT BOX ── */}
      <div
        className={`fixed bottom-[70px] right-2 z-20 bg-[#5c89d1] rounded w-64 ${boxes.chat ? "" : "hidden"}`}
      >
        <div className="flex justify-between items-center px-3 py-2">
          <p className="text-white font-semibold text-sm">Chat</p>
          <button onClick={() => setBoxes((p) => ({ ...p, chat: false }))}>
            <IoClose size={20} color="#fff" />
          </button>
        </div>
        <div className="bg-white mx-2 rounded h-48 overflow-y-auto p-2 flex flex-col gap-1">
          {messages.length === 0 ? (
            <p className="text-gray-400 text-xs text-center mt-2">
              No messages yet
            </p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className="text-xs">
                <span className="text-gray-400">{m.time} </span>
                <span>{m.text}</span>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-1 p-2">
          <input
            className="flex-1 rounded px-2 text-sm text-black outline-none"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="bg-white text-[#5c89d1] text-xs px-2 rounded font-bold"
          >
            Send
          </button>
        </div>
      </div>

      {/* ── SETTINGS BOX ── */}
      <div
        className={`fixed bottom-[70px] right-2 z-20 bg-[#5c89d1] rounded w-72 h-[55%] flex flex-col ${boxes.settings ? "" : "hidden"}`}
      >
        <div className="flex justify-center border-b-2 rounded">
          <div>Settings</div>
        </div>
        <button
          className="absolute right-0 rounded-full hover:bg-gray-400"
          onClick={() => setBoxes({ ...boxes, settings: false })}
        >
          <IoClose size={23} />
        </button>
        <div className="mt-1 p-1 flex-col text-center flex-1 overflow-y-scroll">
          <button
            onClick={() => setDeviceDropDown(!deviceDropDown)}
            className="flex items-center justify-between p-2 rounded-lg w-full bg-[#535a6d] hover:bg-[#6f778f]"
          >
            Change Audio/Video Device &nbsp;
            {deviceDropDown ? <IoMdArrowDropdown /> : <IoMdArrowDropright />}
          </button>
          <div className={`pl-2 ${deviceDropDown ? "" : "hidden"}`}>
            <button
              onClick={() =>
                setDeviceSections((prev) => ({
                  audio: !prev.audio,
                  video: false,
                }))
              }
              className="flex items-center mt-1 py-1 px-2 justify-between rounded-lg w-full bg-[#535a6d] hover:bg-[#6f778f] text-sm"
            >
              Audio Input Devices
              {deviceSections.audio ? (
                <IoMdArrowDropdown />
              ) : (
                <IoMdArrowDropright />
              )}
            </button>
            <div
              className={`${deviceSections.audio && !loading.audio ? "" : "hidden"} w-full p-1`}
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
                  className={`flex items-center justify-center bg-[#535a6d] py-1 w-full border hover:bg-[#6f778f] text-xs
                    ${index === 0 ? "rounded-t-lg" : ""}
                    ${index === audioDevices.length - 1 ? "rounded-b-lg" : ""}`}
                >
                  <div>{value.label}</div>
                  {value.deviceId === selectedDevice.audio && (
                    <div className="mx-1">
                      <FaCheck color="#39fa73" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() =>
                setDeviceSections((prev) => ({
                  audio: false,
                  video: !prev.video,
                }))
              }
              className="flex items-center mt-1 py-1 px-2 justify-between rounded-lg w-full bg-[#535a6d] hover:bg-[#6f778f] text-sm"
            >
              Video Input Devices
              {deviceSections.video ? (
                <IoMdArrowDropdown />
              ) : (
                <IoMdArrowDropright />
              )}
            </button>
            <div
              className={`${deviceSections.video && !loading.video ? "" : "hidden"} w-full p-1`}
            >
              {videoDevices.map((value, index) => (
                <button
                  key={index}
                  onClick={() =>
                    setSelectedDevice((prev) => ({
                      ...prev,
                      video: value.deviceId,
                    }))
                  }
                  className={`flex items-center justify-center bg-[#535a6d] py-1 w-full border hover:bg-[#6f778f] text-xs
                    ${index === 0 ? "rounded-t-lg" : ""}
                    ${index === videoDevices.length - 1 ? "rounded-b-lg" : ""}`}
                >
                  <div>{value.label}</div>
                  {value.deviceId === selectedDevice.video && (
                    <div className="mx-1">
                      <FaCheck color="#39fa73" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── LEAVE BOX ── */}
      <div
        className={`fixed bottom-[70px] right-2 z-20 bg-[#5c89d1] rounded w-52 ${boxes.leave ? "" : "hidden"}`}
      >
        <button
          className="absolute top-0 right-0 hover:bg-gray-400 rounded-full"
          onClick={() => setBoxes((p) => ({ ...p, leave: false }))}
        >
          <IoClose size={25} color="#fff" />
        </button>
        <div className="py-3 px-8 flex flex-col mt-2 gap-4">
          <button className="bg-[#db3954] rounded hover:scale-110 duration-300 text-white text-sm py-1">
            Leave Meeting
          </button>
          <button className="bg-[#db3954] rounded px-2 text-white text-sm py-1 hover:scale-110 duration-300">
            End for All
          </button>
        </div>
      </div>
    </>
  );
};

export default MeetingInterface;
