import { useState, useEffect } from 'react';
import { dmxStore } from '@/lib/dmxStore';

// Subscribes to the DMX store and triggers re-renders at a throttled rate (~15fps)
// so the UI stays responsive while live frames arrive from the bridge.
export function useDMXStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    let throttleId = null;
    let lastRender = 0;

    const onNotify = () => {
      const now = Date.now();
      if (now - lastRender < 66) {
        if (!throttleId) {
          throttleId = setTimeout(() => {
            throttleId = null;
            lastRender = Date.now();
            setTick((t) => t + 1);
          }, 66 - (now - lastRender));
        }
      } else {
        lastRender = now;
        setTick((t) => t + 1);
      }
    };

    const unsub = dmxStore.subscribe(onNotify);

    return () => {
      unsub();
      if (throttleId) clearTimeout(throttleId);
    };
  }, []);

  return dmxStore;
}