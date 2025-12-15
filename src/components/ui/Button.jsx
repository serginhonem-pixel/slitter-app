import React from 'react';

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, title = "" }) => {
  const variants = {
    primary:
      "bg-blue-600/90 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed",
    secondary:
      "bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed",
    danger:
      "bg-red-600/15 text-red-300 border border-red-500/20 hover:bg-red-600/25 disabled:opacity-50 disabled:cursor-not-allowed",
    success:
      "bg-emerald-600/90 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed",
    warning:
      "bg-amber-500/90 text-white hover:bg-amber-500 shadow-lg shadow-amber-900/10 disabled:opacity-50 disabled:cursor-not-allowed",
    info:
      "bg-sky-500/15 text-sky-300 border border-sky-500/25 hover:bg-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 justify-center focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${variants[variant]} ${className}`}
      title={title}
    >
      {children}
    </button>
  );
};

export default Button; // <--- OBRIGATÓRIO: Isso permite que outros arquivos usem ele
