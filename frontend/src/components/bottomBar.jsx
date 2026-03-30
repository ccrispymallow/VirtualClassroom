import { useState } from "react";
import {
  BsMicFill,
  BsMicMuteFill,
  BsCameraVideoFill,
  BsCameraVideoOffFill,
} from "react-icons/bs";
import { LuScreenShare } from "react-icons/lu";

export default function BottomBar() {
  const [micOn, setMicOn] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  return (
    <div className="fixed w-full bottom-2 flex text-center justify-center z-20">
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
  );
}
