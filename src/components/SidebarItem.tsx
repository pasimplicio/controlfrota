import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
  danger?: boolean;
  [key: string]: any;
}

export function SidebarItem({ icon: Icon, label, active, onClick, danger }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200",
        active 
          ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-r-2 border-emerald-500" 
          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
        danger && "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
      )}
    >
      <Icon size={18} className={cn(active ? "text-emerald-500" : "text-zinc-400", danger && "text-red-400")} />
      <span>{label}</span>
    </button>
  );
}
