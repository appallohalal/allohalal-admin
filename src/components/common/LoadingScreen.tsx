'use client';

import React from 'react';
import { LottieLoader } from './LottieLoader';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading Allo Halal Admin...',
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center gap-1">
        <LottieLoader size={130} />
        {message && (
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

