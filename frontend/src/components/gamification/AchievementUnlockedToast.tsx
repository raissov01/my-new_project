"use client";

import { useEffect, useState } from "react";

interface AchievementToastProps {
  icon: string;
  title: string;
  xpBonus: number;
  onDismiss: () => void;
}

export function AchievementUnlockedToast({ icon, title, xpBonus, onDismiss }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Mount → slide in
    const t1 = setTimeout(() => setVisible(true), 50);
    // Auto dismiss after 4s
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400);
    }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 transition-all duration-400 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-yellow-300 dark:border-yellow-700 px-4 py-3">
        <span className="text-3xl animate-bounce">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-yellow-600 dark:text-yellow-400">
            Achievement Unlocked! 🎖️
          </p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{title}</p>
          {xpBonus > 0 && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400">+{xpBonus} XP bonus</p>
          )}
        </div>
        <button
          onClick={() => { setVisible(false); setTimeout(onDismiss, 400); }}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
