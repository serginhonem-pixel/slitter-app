import React from 'react';

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, title = "" }) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-500 disabled:bg-blue-900/50 disabled:text-gray-400 shadow-lg shadow-blue-900/20",
    secondary: "bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500",
    danger: "bg-red-600/20 text-red-400 border border-red-900/50 hover:bg-red-600/30",
    success: "bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-emerald-900/50 shadow-lg shadow-emerald-900/20",
    warning: "bg-amber-600 text-white hover:bg-amber-500 shadow-lg",
    info: "bg-sky-600/20 text-sky-400 border border-sky-600/50 hover:bg-sky-600/30"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 justify-center ${variants[variant]} ${className}`} title={title}>
      {children}
    </button>
  );
};

export default Button; // <--- OBRIGATÓRIO: Isso permite que outros arquivos usem ele