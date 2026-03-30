import { useState } from "react";
import { ImPhoneHangUp } from "react-icons/im";
import { IoClose, IoChatboxEllipses, IoSettings } from "react-icons/io5";

export default function RightBar() {
  const [boxes, setBoxes] = useState({
    chat: false,
    settings: false,
    leave: false,
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

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
      {/* bottom-right buttons */}
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
          <IoSettings size={30} color="#5c89d1" title="Coming Soon" />
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

      {/* chat box */}
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

      {/* settings box */}
      <div
        className={`fixed bottom-[70px] right-2 z-20 bg-[#5c89d1] rounded w-52 p-3 ${boxes.settings ? "" : "hidden"}`}
      >
        <div className="flex justify-between items-center mb-2">
          <p className="text-white font-semibold text-sm">Settings</p>
          <button onClick={() => setBoxes((p) => ({ ...p, settings: false }))}>
            <IoClose size={20} color="#fff" />
          </button>
        </div>
        <p className="text-white text-xs opacity-70">Coming soon...</p>
      </div>

      {/* leave box */}
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
}
