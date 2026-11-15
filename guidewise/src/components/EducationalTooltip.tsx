import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface EducationalTooltipProps {
  /** Trigger element rendered inline inside the table cell */
  children: React.ReactNode;
  /** Rich educational content displayed inside the floating glass tooltip */
  content: React.ReactNode;
  /** Optional accent color theme for border/glow */
  tone?: 'cyan' | 'lime' | 'amber' | 'rose' | 'slate';
  /** Max width in pixels (defaults to 320) */
  maxWidth?: number;
  /** Respects app motion setting */
  motionEnabled?: boolean;
}

interface TooltipCoords {
  left: number;
  top: number;
  placement: 'top' | 'bottom';
  arrowLeftOffset: number;
}

const TONE_CLASSES: Record<NonNullable<EducationalTooltipProps['tone']>, string> = {
  cyan: 'border-[#22d3ee]/45 shadow-[0_18px_46px_rgba(0,0,0,0.72),0_0_24px_-6px_rgba(34,211,238,0.28)]',
  lime: 'border-[#c6ff3d]/45 shadow-[0_18px_46px_rgba(0,0,0,0.72),0_0_24px_-6px_rgba(198,255,61,0.25)]',
  amber: 'border-[#ffb020]/50 shadow-[0_18px_46px_rgba(0,0,0,0.72),0_0_24px_-6px_rgba(255,176,32,0.25)]',
  rose: 'border-[#ff4d6d]/50 shadow-[0_18px_46px_rgba(0,0,0,0.72),0_0_24px_-6px_rgba(255,77,109,0.28)]',
  slate: 'border-white/25 shadow-[0_18px_46px_rgba(0,0,0,0.72)]',
};

const ARROW_BORDER: Record<NonNullable<EducationalTooltipProps['tone']>, string> = {
  cyan: 'border-[#22d3ee]/45',
  lime: 'border-[#c6ff3d]/45',
  amber: 'border-[#ffb020]/50',
  rose: 'border-[#ff4d6d]/50',
  slate: 'border-white/25',
};

export const EducationalTooltip: React.FC<EducationalTooltipProps> = ({
  children,
  content,
  tone = 'cyan',
  maxWidth = 320,
  motionEnabled = true,
}) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipId = useId();

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl || typeof window === 'undefined') return;

    const rect = triggerEl.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    const width = tooltipRect?.width ?? Math.min(maxWidth, window.innerWidth - 24);
    const height = tooltipRect?.height ?? 140;

    const margin = 12;
    const gap = 10;

    // Prefer placing above the hovered badge; flip below if insufficient headroom
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement: 'top' | 'bottom' =
      spaceAbove >= height + gap + margin || spaceAbove >= spaceBelow ? 'top' : 'bottom';

    const triggerCenterX = rect.left + rect.width / 2;
    const clampedLeft = Math.max(
      margin,
      Math.min(triggerCenterX - width / 2, window.innerWidth - width - margin)
    );
    const arrowLeftOffset = Math.max(16, Math.min(triggerCenterX - clampedLeft, width - 16));

    const top =
      placement === 'top'
        ? Math.max(margin, rect.top - height - gap)
        : Math.min(window.innerHeight - height - margin, rect.bottom + gap);

    setCoords({
      left: clampedLeft,
      top,
      placement,
      arrowLeftOffset,
    });
  }, [maxWidth]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, content, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleReposition = () => updatePosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [open, updatePosition]);

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6ff3d] rounded-full"
      >
        {children}
      </span>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={tooltipRef}
                id={tooltipId}
                role="tooltip"
                initial={
                  motionEnabled
                    ? {
                        opacity: 0,
                        scale: 0.95,
                        y: coords?.placement === 'bottom' ? -6 : 6,
                      }
                    : { opacity: 1, scale: 1, y: 0 }
                }
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={
                  motionEnabled
                    ? {
                        opacity: 0,
                        scale: 0.96,
                        y: coords?.placement === 'bottom' ? -4 : 4,
                      }
                    : { opacity: 0 }
                }
                transition={{ duration: motionEnabled ? 0.16 : 0, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'fixed',
                  left: coords?.left ?? -9999,
                  top: coords?.top ?? -9999,
                  maxWidth: `min(${maxWidth}px, calc(100vw - 24px))`,
                  visibility: coords ? 'visible' : 'hidden',
                  zIndex: 80,
                }}
                className={`pointer-events-none rounded-2xl border bg-[#060d1c]/95 backdrop-blur-xl px-3.5 py-3 text-left text-xs text-[#c7d8d6] ${TONE_CLASSES[tone]}`}
              >
                {coords && (
                  <span
                    aria-hidden="true"
                    style={{ left: coords.arrowLeftOffset - 5 }}
                    className={`absolute w-2.5 h-2.5 rotate-45 bg-[#060d1c] ${
                      coords.placement === 'top'
                        ? `-bottom-[6px] border-r border-b ${ARROW_BORDER[tone]}`
                        : `-top-[6px] border-l border-t ${ARROW_BORDER[tone]}`
                    }`}
                  />
                )}
                {content}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};
