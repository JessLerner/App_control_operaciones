import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-xl bg-amber-500/90 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-xl border border-amber-300">
      <span className="h-2 w-2 rounded-full bg-slate-950 animate-ping" />
      <WifiOff className="h-4 w-4" />
      <span>Modo Sin Conexión — Las ventas se guardarán en tu dispositivo y se enviarán al reconectar.</span>
    </div>
  );
};
