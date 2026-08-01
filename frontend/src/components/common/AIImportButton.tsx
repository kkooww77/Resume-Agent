import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIImportButtonProps {
  onClick: () => void;
  className?: string;
  variant?: 'outline' | 'ghost' | 'default';
  showIcon?: boolean;
  text?: string;
}

export const AIImportButton: React.FC<AIImportButtonProps> = ({
  onClick,
  className,
  variant = 'outline',
  showIcon = true,
  text = 'AI 智能导入',
}) => {
  const baseStyles = "inline-flex h-11 items-center justify-center gap-2 rounded-none fresh:rounded-md px-4 text-sm font-mono fresh:font-sans font-bold uppercase fresh:normal-case tracking-wide fresh:tracking-normal transition-[transform,box-shadow,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 fresh:focus-visible:ring-blue-300 disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    outline: "bg-[#F0F0E8] fresh:bg-white text-black border-2 fresh:border border-black fresh:border-slate-200 shadow-[2px_2px_0px_0px_#000000] fresh:shadow-sm dark:shadow-[2px_2px_0px_0px_#ffffff] hover:bg-[#E5E5E0] fresh:hover:bg-slate-50 hover:translate-y-[1px] hover:translate-x-[1px] fresh:hover:translate-y-0 fresh:hover:translate-x-0 hover:shadow-none active:translate-y-[2px] active:translate-x-[2px]",
    ghost: "bg-transparent text-black border-none shadow-none hover:bg-[#E5E5E0] fresh:hover:bg-slate-50 active:bg-[#E5E5E0]",
    default: "bg-blue-700 text-white border border-black fresh:border-blue-600 shadow-[2px_2px_0px_0px_#000000] fresh:shadow-sm hover:bg-blue-800 hover:translate-y-[1px] hover:translate-x-[1px] fresh:hover:translate-y-0 fresh:hover:translate-x-0 hover:shadow-none active:translate-y-[2px] active:translate-x-[2px]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(baseStyles, variants[variant], className)}
    >
      {showIcon && <Sparkles aria-hidden="true" className="h-4 w-4" />}
      {text}
    </button>
  );
};
