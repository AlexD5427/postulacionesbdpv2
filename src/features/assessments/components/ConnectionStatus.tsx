'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

/** Small online/offline indicator used during assessments. */
export function ConnectionStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${online ? 'text-success' : 'text-warning'}`}
    >
      {online ? <Wifi className="h-3.5 w-3.5" aria-hidden /> : <WifiOff className="h-3.5 w-3.5" aria-hidden />}
      {online ? 'Conectado' : 'Sin conexión'}
    </span>
  );
}
