"use client";

import { useEffect, useRef, useState } from "react";

// Each card occupies 1/4 of the total SVG width (viewBox 0 0 400 100).
// We scale each card's path (originally 0..100 in x) into its slot:
//   card 0: x → x*1      (0..100)
//   card 1: x → 100+x    (100..200)
//   card 2: x → 200+x    (200..300)
//   card 3: x → 300+x    (300..400)
//
// Original paths per card (viewBox 0 0 100 100):
//   0: M 0 60 C 100 60, 100 15, 50 15 C 0 15, 0 40, 100 40
//   1: M 0 40 C 50 40, 30 55, 60 55 C 90 55, 50 30, 100 30
//   2: M 0 30 C 80 30, 20 55, 60 55 C 100 55, 40 40, 100 40
//   3: M 0 40 C 30 40, 30 15, 60 25 C 90 35, 70 50, 100 50
//
// Translated to the 400-wide canvas (just shift x by card*100, y unchanged):
const COMBINED_PATH =
  "M 0 60 C 100 60, 100 15, 50 15 C 0 15, 0 40, 100 40 " +
  "C 150 40, 130 55, 160 55 C 190 55, 150 30, 200 30 " +
  "C 280 30, 220 55, 260 55 C 300 55, 240 40, 300 40 " +
  "C 330 40, 330 15, 360 25 C 390 35, 370 50, 400 50";

export default function WhySiesieCarAnimation() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => setIsPlaying(entries[0].isIntersecting),
      { threshold: 0.15 }
    );
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="pointer-events-none absolute inset-0 z-30 hidden lg:block"
      aria-hidden="true"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media (prefers-reduced-motion: no-preference) {
          .why-car {
            offset-path: path('${COMBINED_PATH}');
            offset-distance: 0%;
            animation: why-car-drive 16s cubic-bezier(0.45, 0, 0.55, 1) infinite;
            animation-play-state: paused;
          }
          .why-car-playing {
            animation-play-state: running;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .why-car {
            offset-path: path('${COMBINED_PATH}');
            offset-distance: 0%;
          }
        }

        @keyframes why-car-drive {
          0%   { offset-distance: 0%; opacity: 1; }
          85%  { offset-distance: 100%; opacity: 1; }
          90%  { offset-distance: 100%; opacity: 0; }
          91%  { offset-distance: 0%; opacity: 0; }
          95%  { offset-distance: 0%; opacity: 1; }
          100% { offset-distance: 0%; opacity: 1; }
        }
      `}} />

      {/* SVG sized to match the 4-card grid — 400 wide, 100 tall in viewBox units */}
      <svg
        className="h-full w-full"
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/*
            Clip the car to card regions only — hides it in the white CSS gaps.
            In a 4-col grid with gap-5 (20px) at ~1200px container width:
              card ≈ 95 units wide, gap ≈ 6 units (400 viewBox units total).
            These are intentionally approximate; the gap is thin so any mismatch is imperceptible.
          */}
          <clipPath id="why-card-clip" clipPathUnits="userSpaceOnUse">
            <rect x="0"   y="0" width="95" height="100" />
            <rect x="102" y="0" width="95" height="100" />
            <rect x="204" y="0" width="95" height="100" />
            <rect x="305" y="0" width="95" height="100" />
          </clipPath>
        </defs>

        {/* Car — clipped to card regions, hidden while crossing gaps */}
        <g clipPath="url(#why-card-clip)">
          <g
            className={`why-car ${isPlaying ? "why-car-playing" : ""}`}
            style={{ offsetRotate: "auto" }}
          >
            {/* Offset anchor is at (0,0); car body centered around that */}
            <g transform="translate(-5, -3) scale(0.1)">
              {/* Body */}
              <path
                d="M 12 14 L 22 4 L 48 4 L 58 14 L 65 14 Q 70 14 70 19 L 70 26 L 0 26 L 0 19 Q 0 14 5 14 Z"
                fill="#008F4C"
              />
              {/* Windscreen */}
              <path d="M 24 6 L 46 6 L 52 13 L 18 13 Z" fill="#EAF4EF" opacity="0.9" />
              {/* Wheels */}
              <circle cx="16" cy="27" r="5" fill="#111" />
              <circle cx="54" cy="27" r="5" fill="#111" />
            </g>
          </g>
        </g>
      </svg>

    </div>
  );
}
