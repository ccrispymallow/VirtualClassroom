import { useState, useCallback, memo } from "react";
import { ImPhoneHangUp } from "react-icons/im";
import { IoClose, IoChatboxEllipses, IoSettings } from "react-icons/io5";

const RightBarToolbar = memo(function RightBarToolbar({
  onToggleChat,
  onToggleSettings,
  onToggleLeave,
}) {
  return (
    <div className="fixed bottom-3 right-2 z-20 flex gap-2">
      <button
        type="button"
        onClick={onToggleChat}
        className="bg-gray-300 px-2 h-12 rounded-[100px] flex items-center hover:bg-white"
      >
        <IoChatboxEllipses size={30} color="#5c89d1" />
      </button>

      <button
        type="button"
        onClick={onToggleSettings}
        className="bg-gray-300 px-2 h-12 rounded-[100px] flex items-center hover:bg-white"
      >
        <IoSettings size={30} color="#5c89d1" title="Coming Soon" />
      </button>

      <button
        type="button"
        onClick={onToggleLeave}
        className="bg-gray-300 px-2 h-12 rounded-[100px] flex items-center hover:bg-white"
      >
        <ImPhoneHangUp size={30} color="#db3954" />
      </button>
    </div>
  );
});

const RightBarChatPanel = memo(function RightBarChatPanel({
  open,
  messages,
  onClose,
  onSendMessage,
}) {
  const [draft, setDraft] = useState("");

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    onSendMessage(text);
    setDraft("");
  }, [draft, onSendMessage]);

  return (
    <div
      className={`fixed bottom-[70px] right-2 z-20 bg-[#5c89d1] rounded w-64 ${open ? "" : "hidden"}`}
    >
      <div className="flex justify-between items-center px-3 py-2">
        <p className="text-white font-semibold text-sm">Chat</p>
        <button type="button" onClick={onClose} aria-label="Close chat">
          <IoClose size={20} color="#fff" />
        </button>
      </div>
      <div className="bg-white mx-2 rounded h-48 overflow-y-auto p-2 flex flex-col gap-1">
        {messages.length === 0 ? (
          <p className="text-gray-400 text-xs text-center mt-2">
            No messages yet
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-xs">
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
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          type="button"
          onClick={send}
          className="bg-white text-[#5c89d1] text-xs px-2 rounded font-bold"
        >
          Send
        </button>
      </div>
    </div>
  );
});

const RightBarSettingsPanel = memo(function RightBarSettingsPanel({
  open,
  onClose,
}) {
  return (
    <div
      className={`fixed bottom-[70px] right-2 z-20 bg-[#5c89d1] rounded w-52 p-3 ${open ? "" : "hidden"}`}
    >
      <div className="flex justify-between items-center mb-2">
        <p className="text-white font-semibold text-sm">Settings</p>
        <button type="button" onClick={onClose} aria-label="Close settings">
          <IoClose size={20} color="#fff" />
        </button>
      </div>
      <p className="text-white text-xs opacity-70">Coming soon...</p>
    </div>
  );
});

const RightBarLeavePanel = memo(function RightBarLeavePanel({ open, onClose }) {
  return (
    <div
      className={`fixed bottom-[70px] right-2 z-20 bg-[#5c89d1] rounded w-52 relative ${open ? "" : "hidden"}`}
    >
      <button
        type="button"
        className="absolute top-0 right-0 hover:bg-gray-400 rounded-full"
        onClick={onClose}
        aria-label="Close leave menu"
      >
        <IoClose size={25} color="#fff" />
      </button>
      <div className="py-3 px-8 flex flex-col mt-2 gap-4">
        <button
          type="button"
          className="bg-[#db3954] rounded hover:scale-110 duration-300 text-white text-sm py-1"
        >
          Leave Meeting
        </button>
        <button
          type="button"
          className="bg-[#db3954] rounded px-2 text-white text-sm py-1 hover:scale-110 duration-300"
        >
          End for All
        </button>
      </div>
    </div>
  );
});

export default function RightBar() {
  const [boxes, setBoxes] = useState({
    chat: false,
    settings: false,
    leave: false,
  });
  const [messages, setMessages] = useState([]);

  const onToggleChat = useCallback(() => {
    setBoxes((p) => ({ settings: false, leave: false, chat: !p.chat }));
  }, []);

  const onToggleSettings = useCallback(() => {
    setBoxes((p) => ({
      chat: false,
      leave: false,
      settings: !p.settings,
    }));
  }, []);

  const onToggleLeave = useCallback(() => {
    setBoxes((p) => ({ chat: false, settings: false, leave: !p.leave }));
  }, []);

  const closeChat = useCallback(() => {
    setBoxes((p) => ({ ...p, chat: false }));
  }, []);

  const closeSettings = useCallback(() => {
    setBoxes((p) => ({ ...p, settings: false }));
  }, []);

  const closeLeave = useCallback(() => {
    setBoxes((p) => ({ ...p, leave: false }));
  }, []);

  const onSendMessage = useCallback((text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${prev.length}`,
        text: trimmed,
        time: new Date().toLocaleTimeString(),
      },
    ]);
  }, []);

  return (
    <>
      <RightBarToolbar
        onToggleChat={onToggleChat}
        onToggleSettings={onToggleSettings}
        onToggleLeave={onToggleLeave}
      />

      <RightBarChatPanel
        open={boxes.chat}
        messages={messages}
        onClose={closeChat}
        onSendMessage={onSendMessage}
      />

      <RightBarSettingsPanel open={boxes.settings} onClose={closeSettings} />

      <RightBarLeavePanel open={boxes.leave} onClose={closeLeave} />
    </>
  );
}