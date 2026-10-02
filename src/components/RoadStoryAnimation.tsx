"use client";

import { useEffect, useRef, useState } from "react";

export default function RoadStoryAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsPlaying(entry.isIntersecting);
        });
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isPlaying ? "is-playing" : ""}`}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
        .story-anim { animation-play-state: paused; animation-fill-mode: both; }
        .is-playing .story-anim { animation-play-state: running; }

        @media (prefers-reduced-motion: no-preference) {
          .anim-car { animation: story-car 9s linear infinite; }
          .anim-customer { animation: story-customer 9s linear infinite; }
          .anim-mechanic { animation: story-mechanic 9s linear infinite; }
          .anim-fixed { animation: story-fixed 9s linear infinite; }
          .anim-cap-1 { animation: caption-1 9s linear infinite; }
          .anim-cap-2 { animation: caption-2 9s linear infinite; }
          .anim-cap-3 { animation: caption-3 9s linear infinite; }
          .anim-cap-4 { animation: caption-4 9s linear infinite; }
        }

        @keyframes story-car {
          0% { transform: translateX(-250px); }
          15%, 85% { transform: translateX(0); }
          100% { transform: translateX(250px); }
        }
        @keyframes story-customer {
          0%, 20% { opacity: 0; }
          25%, 85% { opacity: 1; }
          90%, 100% { opacity: 0; }
        }
        @keyframes story-mechanic {
          0%, 40% { opacity: 0; transform: translateX(10px); }
          45%, 85% { opacity: 1; transform: translateX(0); }
          90%, 100% { opacity: 0; }
        }
        @keyframes story-fixed {
          0%, 60% { opacity: 0; transform: translateY(10px) scale(0.5); }
          65%, 80% { opacity: 1; transform: translateY(0) scale(1); }
          85%, 100% { opacity: 0; transform: translateY(-10px) scale(0.5); }
        }

        @keyframes caption-1 { 0%, 22% { opacity: 1; } 25%, 100% { opacity: 0; } }
        @keyframes caption-2 { 0%, 22% { opacity: 0; } 25%, 42% { opacity: 1; } 45%, 100% { opacity: 0; } }
        @keyframes caption-3 { 0%, 42% { opacity: 0; } 45%, 62% { opacity: 1; } 65%, 100% { opacity: 0; } }
        @keyframes caption-4 { 0%, 62% { opacity: 0; } 65%, 90% { opacity: 1; } 95%, 100% { opacity: 0; } }
        
        @media (prefers-reduced-motion: reduce) {
          .anim-car { transform: translateX(-30px); }
          .anim-customer { opacity: 1; }
          .anim-mechanic { opacity: 1; transform: translateX(0); }
          .anim-fixed { opacity: 1; transform: translateY(0) scale(1); }
          .anim-cap-1, .anim-cap-2, .anim-cap-3 { opacity: 0; display: none; }
          .anim-cap-4 { opacity: 1; position: relative; }
        }
      `}} />

      <div className="relative mx-auto flex h-32 max-w-[400px] items-center justify-center overflow-hidden sm:overflow-visible">
        {/* Road line */}
        <div className="absolute inset-x-[-150px] top-[75%] bottom-0 h-[33px] border-b-[7px] border-dashed border-[#C2E5D3]"></div>

        {/* Scene Container */}
        <div className="relative flex h-full w-full items-end justify-center pb-[3.5px]">

          {/* Car */}
          <div className="story-anim anim-car absolute left-1/2 -ml-16 z-10 flex flex-col items-center">
            {/* Simple SVG Car in Siesie green */}
            <svg width="70" height="35" viewBox="0 0 70 35" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 14 L22 4 L48 4 L58 14 L65 14 Q70 14 70 19 L70 26 L0 26 L0 19 Q0 14 5 14 Z" fill="#008F4C" />
              <circle cx="16" cy="26" r="6" fill="#111111" />
              <circle cx="54" cy="26" r="6" fill="#111111" />
              <path d="M24 6 L46 6 L52 13 L18 13 Z" fill="#EAF4EF" />
            </svg>

            {/* Fixed Indicator */}
            <div className="story-anim anim-fixed absolute -top-8 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#008F4C] text-white shadow-md border-[2.5px] border-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>

          {/* Customer */}
          <div className="story-anim anim-customer absolute left-1/2 ml-[22px] z-0">
            <svg width="24" height="48" viewBox="0 0 24 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Head */}
              <circle cx="12" cy="10" r="5" fill="#111111" />
              {/* Body */}
              <line x1="12" y1="15" x2="12" y2="30" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
              {/* Arms */}
              <line x1="12" y1="18" x2="6" y2="26" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="12" y1="18" x2="18" y2="24" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
              {/* Legs */}
              <line x1="12" y1="30" x2="7" y2="45" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="12" y1="30" x2="17" y2="45" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Mechanic */}
          <div className="story-anim anim-mechanic absolute left-1/2 ml-[55px] z-0">
            <svg width="28" height="48" viewBox="0 0 28 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Head with cap */}
              <path d="M14 5 A 5 5 0 0 1 14 15 A 5 5 0 0 1 14 5 Z" fill="#008F4C" />
              <path d="M9 6 Q14 1 19 6 L24 6 L19 10 Z" fill="#008F4C" />
              {/* Body */}
              <line x1="14" y1="15" x2="14" y2="30" stroke="#008F4C" strokeWidth="3.5" strokeLinecap="round" />
              {/* Arms */}
              <line x1="14" y1="18" x2="7" y2="26" stroke="#008F4C" strokeWidth="3" strokeLinecap="round" />
              <line x1="14" y1="18" x2="21" y2="24" stroke="#008F4C" strokeWidth="3" strokeLinecap="round" />
              {/* Wrench in hand */}
              <path d="M20 22 L26 16 C27 15 29 16.5 28 17.5 L22 23.5 Z" fill="#111111" />
              <circle cx="27" cy="16" r="2" fill="#111111" />
              {/* Legs */}
              <line x1="14" y1="30" x2="9" y2="45" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="14" y1="30" x2="19" y2="45" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Caption container */}
      <div className="relative mt-2 h-6 text-center text-[15px] font-semibold text-[var(--ink)] hidden">
        <span className="story-anim anim-cap-1 absolute inset-x-0">Breakdown — mechanic needed</span>
        <span className="story-anim anim-cap-2 absolute inset-x-0">Request sent — on the way</span>
        <span className="story-anim anim-cap-3 absolute inset-x-0">Mechanic arrives</span>
        <span className="story-anim anim-cap-4 absolute inset-x-0">Fixed — back on the road</span>
      </div>
    </div>
  );
}
