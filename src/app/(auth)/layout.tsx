import React from "react";
import ThemeToggle from "../components/ThemeToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[var(--bg-base)] overflow-hidden font-sans">
      {/* Theme toggle — top right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Decorative background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-900/20 dark:bg-purple-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-900/20 dark:bg-indigo-900/20 blur-[120px] pointer-events-none" />

      {/* Card */}
      <div className="relative w-full max-w-md p-8 sm:p-10 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-2xl z-10 mx-4">
        {children}
      </div>
    </div>
  );
}
