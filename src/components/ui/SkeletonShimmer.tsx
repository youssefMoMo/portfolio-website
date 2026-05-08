// src/components/ui/SkeletonShimmer.tsx
// GPU-accelerated shimmer skeleton presets built on the CSS skeleton-shimmer class.

import { HTMLAttributes } from "react";

interface SkeletonBaseProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "rect" | "circle" | "text";
  width?: string | number;
  height?: string | number;
}

export function SkeletonShimmer({
  variant = "rect",
  width,
  height,
  className = "",
  style,
  ...rest
}: SkeletonBaseProps) {
  const shape =
    variant === "circle" ? "rounded-full" :
    variant === "text"   ? "rounded-md"   : "rounded-lg";

  const inlineStyle: React.CSSProperties = {
    width:  width  !== undefined ? (typeof width  === "number" ? `${width}px`  : width)  : undefined,
    height: height !== undefined ? (typeof height === "number" ? `${height}px` : height) : undefined,
    ...style,
  };

  return (
    <div
      {...rest}
      className={`relative overflow-hidden bg-white/5 ${shape} ${className}`}
      style={inlineStyle}
      aria-hidden="true"
    >
      <span className="skeleton-shimmer" />
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl overflow-hidden bg-card/40 border border-white/5 ${className}`}>
      <SkeletonShimmer className="w-full aspect-video rounded-none" />
      <div className="p-5 space-y-3">
        <SkeletonShimmer className="h-4 w-3/4" />
        <SkeletonShimmer className="h-3 w-1/2" />
        <SkeletonShimmer className="h-3 w-2/3" />
        <SkeletonShimmer className="h-10 w-full mt-3 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  const widths = ["w-full", "w-5/6", "w-4/6", "w-3/4", "w-2/3"];
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonShimmer key={i} variant="text" className={`h-3.5 ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 40, className = "" }: { size?: number; className?: string }) {
  return <SkeletonShimmer variant="circle" width={size} height={size} className={className} />;
}
