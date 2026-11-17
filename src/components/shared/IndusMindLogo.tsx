import React from "react";

interface IndusMindLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export const IndusMindLogo: React.FC<IndusMindLogoProps> = ({
  size = "md",
  showText = true,
  className = "",
}) => {
  const iconDim = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-8 w-8" : "h-6 w-6";
  const textCls =
    size === "sm"
      ? "text-sm font-bold tracking-tight"
      : size === "lg"
      ? "text-xl font-bold tracking-tight"
      : "text-base font-bold tracking-tight";

  return (
    <span className={`inline-flex items-center gap-2 select-none ${className}`}>
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconDim} shrink-0`}
        aria-hidden="true"
      >
        <path
          d="M18 2.5L31.4 10.25V25.75L18 33.5L4.6 25.75V10.25L18 2.5Z"
          fill="#0F1626"
          stroke="#3FD8FF"
          strokeWidth="2.2"
        />
        <path
          d="M11.5 14L18 10.2L24.5 14V22L18 25.8L11.5 22V14Z"
          stroke="#C6FF2E"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <circle cx="18" cy="18" r="2.7" fill="#3FD8FF" />
        <path
          d="M18 10.2V15.3M11.5 22L15.6 19.5M24.5 22L20.4 19.5"
          stroke="#3FD8FF"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
      {showText && (
        <span className={`font-tight text-[#f4f6fa] whitespace-nowrap ${textCls}`}>
          Indus<span className="text-[#3fd8ff]">Mind</span>
          <span className="text-[#c6ff2e]">AI</span>
        </span>
      )}
    </span>
  );
};
