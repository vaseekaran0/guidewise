import { useEffect, useState } from 'react';

const STORAGE_KEY = 'guidewise-motion-enabled';

export function useMotionEnabled() {
  const [motionEnabled, setMotionEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') return true;
    if (saved === 'false') return false;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, String(motionEnabled));
    document.documentElement.classList.toggle('gw-no-motion', !motionEnabled);
  }, [motionEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMotionEnabled(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggleMotion = () => setMotionEnabled((prev) => !prev);

  return { motionEnabled, setMotionEnabled, toggleMotion };
}

export function useCountUp(target: number, motionEnabled: boolean, durationMs = 520, decimals = 0): string {
  const [display, setDisplay] = useState<number>(target);

  useEffect(() => {
    if (!motionEnabled) {
      setDisplay(target);
      return;
    }

    const startVal = 0;
    const startTime = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(startVal + (target - startVal) * eased);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplay(target);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, motionEnabled, durationMs]);

  return display.toFixed(decimals);
}
