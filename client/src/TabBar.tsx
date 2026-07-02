import { type ReactNode } from "react";
import { motion } from "motion/react";

interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
}

export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  layoutId,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  layoutId: string;
}) {
  return (
    <div className="flex items-center gap-1 p-1 bg-bg rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={(e) => { onChange(tab.value); (e.currentTarget as HTMLButtonElement).blur(); }}
          className={`relative flex-1 flex items-center justify-center px-1 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 whitespace-nowrap ${
            value === tab.value ? "text-fg" : "text-muted hover:text-fg"
          }`}
        >
          {value === tab.value && (
            <motion.div
              layoutId={layoutId}
              className="absolute inset-0 bg-surface rounded-lg shadow-sm"
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
