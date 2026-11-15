import React, { useRef, useState } from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  tilt?: boolean;
  motionEnabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  tilt = false,
  motionEnabled = true,
  onClick,
  style,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tiltTransform, setTiltTransform] = useState<string>('');
  const [spotlight, setSpotlight] = useState<{ x: number; y: number; active: boolean }>({
    x: 50,
    y: 50,
    active: false,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!motionEnabled || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    setSpotlight({ x: px, y: py, active: true });

    if (tilt) {
      const x = px / 100 - 0.5;
      const y = py / 100 - 0.5;
      const rotY = (x * 9).toFixed(2);
      const rotX = (-y * 9).toFixed(2);
      setTiltTransform(
        `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translate3d(0, -3px, 8px)`
      );
    }
  };

  const handleMouseLeave = () => {
    if (tiltTransform) setTiltTransform('');
    if (spotlight.active) setSpotlight((prev) => ({ ...prev, active: false }));
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: tiltTransform || undefined,
        transformStyle: tilt ? 'preserve-3d' : undefined,
        transition: motionEnabled
          ? 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 180ms ease, box-shadow 220ms ease'
          : undefined,
        ...style,
      }}
      className={`relative gw-glass ${
        tilt
          ? 'hover:border-[#22d3ee]/40 hover:shadow-[0_18px_52px_rgba(34,211,238,0.16)]'
          : ''
      } ${className}`}
    >
      {/* Subtle 3D Glass Pointer Specular Sheen */}
      {motionEnabled && spotlight.active && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[20px] transition-opacity duration-200"
          style={{
            background: `radial-gradient(280px circle at ${spotlight.x.toFixed(1)}% ${spotlight.y.toFixed(
              1
            )}%, rgba(34, 211, 238, 0.14), rgba(124, 92, 255, 0.05) 45%, transparent 72%)`,
          }}
        />
      )}
      <div className="relative z-[1] h-full">{children}</div>
    </div>
  );
};
