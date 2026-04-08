import { useEffect, useRef } from "react";

export default function RemoteStream({ stream, type, username, enabled = true }) {
  const ref = useRef(null);

  useEffect(() => {
    const mediaEl = ref.current;
    if (!mediaEl || !stream) return;

    mediaEl.srcObject = stream;

    const playMedia = async () => {
      try {
        if (!enabled) {
          mediaEl.pause();
          return;
        }
        mediaEl.muted = false;
        await mediaEl.play();
      } catch {
        // Autoplay may be blocked for audio/video.
        mediaEl.muted = true;
        try {
          await mediaEl.play();
        } catch {
          // noop: user interaction may still be required on some browsers
        }
      }
    };

    const onLoadedMetadata = () => {
      void playMedia();
    };

    mediaEl.addEventListener("loadedmetadata", onLoadedMetadata);
    void playMedia();

    return () => {
      mediaEl.removeEventListener("loadedmetadata", onLoadedMetadata);
      mediaEl.srcObject = null;
    };
  }, [stream, enabled]);

  if (type === "mic") {
    // Audio only — invisible element
    return <audio ref={ref} autoPlay playsInline muted={!enabled} />;
  }

  // Screen share — visible video
  return (
    <div className="fixed top-12 left-0 right-0 bottom-16 z-10 bg-black flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2 bg-[#111827] border-b border-[#1e2d45]">
        <span className="text-slate-400 text-xs">🖥️</span>
        <span className="text-slate-200 text-xs font-semibold">
          {username} is sharing their screen
        </span>
      </div>
      <video
        ref={ref}
        autoPlay
        playsInline
        className="flex-1 w-full object-contain"
      />
    </div>
  );
}