import React, { useRef, useState } from 'react';

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  motionEnabled?: boolean;
  variant?: 'lime' | 'gradient' | 'ghost';
  children: React.ReactNode;
}

interface ClickRipple {
  id: number;
  x: number;
  y: number;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  motionEnabled = true,
  variant = 'lime',
  className = '',
  children,
  onClick,
  ...rest
}) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [ripples, setRipples] = useState<ClickRipple[]>([]);
  const [justClicked, setJustClicked] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!motionEnabled || rest.disabled || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.16;
    const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.16;
    setOffset({ x: Math.max(-7, Math.min(7, dx)), y: Math.max(-5, Math.min(5, dy)) });
  };

  const handleMouseLeave = () => {
    if (offset.x !== 0 || offset.y !== 0) setOffset({ x: 0, y: 0 });
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!rest.disabled && btnRef.current && motionEnabled) {
      const rect = btnRef.current.getBoundingClientRect();
      const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
      const y = e.clientY ? e.clientY - rect.top : rect.height / 2;
      const rippleId = Date.now() + Math.random();
      setRipples((prev) => [...prev.slice(-2), { id: rippleId, x, y }]);
      setJustClicked(true);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== rippleId));
      }, 540);
      window.setTimeout(() => setJustClicked(false), 320);
    }
    onClick?.(e);
  };

  const variantClass =
    variant === 'lime'
      ? 'gw-btn-lime font-semibold'
      : variant === 'gradient'
      ? 'gw-gradient-secondary font-semibold hover:brightness-110'
      : 'border border-white/15 bg-white/5 text-[#e8f3f1] hover:bg-white/10 hover:border-[#22d3ee]/50 hover:shadow-[0_0_24px_-4px_rgba(34,211,238,0.4)] font-medium';

  const clickAuraShadow = justClicked
    ? variant === 'lime'
      ? '0 0 42px 2px rgba(198,255,61,0.85), 0 0 18px rgba(34,211,238,0.45)'
      : '0 0 32px rgba(34,211,238,0.72), 0 0 16px rgba(124,92,255,0.45)'
    : undefined;

  const rippleColor =
    variant === 'lime'
      ? 'radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(198,255,61,0.55) 45%, transparent 72%)'
      : 'radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(34,211,238,0.55) 45%, transparent 72%)';

  return (
    <button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        transform:
          motionEnabled && (offset.x !== 0 || offset.y !== 0)
            ? `translate3d(${offset.x}px, ${offset.y}px, 0)`
            : undefined,
        boxShadow: clickAuraShadow,
        transition: motionEnabled
          ? 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 260ms ease, filter 160ms ease, background-color 160ms ease, border-color 160ms ease'
          : undefined,
      }}
      className={`relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap ${variantClass} ${className}`}
      {...rest}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          className="gw-click-burst"
          style={{
            left: r.x,
            top: r.y,
            background: rippleColor,
          }}
        />
      ))}
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
};
