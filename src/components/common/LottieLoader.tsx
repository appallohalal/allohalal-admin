'use client';

import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import loadingAnimation from '@/assets/loading.json';

interface LottieLoaderProps {
  size?: number;
  className?: string;
}

export const LottieLoader: React.FC<LottieLoaderProps> = ({
  size = 120,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: loadingAnimation,
    });

    return () => {
      anim.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center pointer-events-none select-none ${className}`}
    />
  );
};
