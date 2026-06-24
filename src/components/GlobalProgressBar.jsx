import { useEffect, useState } from 'react';
import { progressBus } from '@/lib/progressBus';

// A thin animated bar pinned to the very top of the app. It eases up to ~90%
// while work is happening, then snaps to 100% and fades out when done.
export default function GlobalProgressBar() {
  const [active, setActive] = useState(false);
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => progressBus.subscribe(setActive), []);

  useEffect(() => {
    let timer;
    if (active) {
      setVisible(true);
      setWidth(8);
      // Creep toward 90% so the user sees continuous motion
      timer = setInterval(() => {
        setWidth((w) => (w < 90 ? w + (90 - w) * 0.15 : w));
      }, 200);
    } else if (visible) {
      // Finish: jump to 100%, then fade and reset
      setWidth(100);
      timer = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 350);
    }
    return () => {
      clearInterval(timer);
      clearTimeout(timer);
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 pointer-events-none">
      <div
        className="h-full bg-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.7)] transition-all duration-200 ease-out"
        style={{ width: `${width}%`, opacity: active || width === 100 ? 1 : 0 }}
      />
    </div>
  );
}