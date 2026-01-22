'use client';

import { useEffect, useState } from 'react';
import Hero from './Hero';
import HeroSectionSkeleton from '@/components/shadcn-studio/blocks/hero-section-41/hero-section-41-skeleton';

const HeroWrapper = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <HeroSectionSkeleton />;
  }
  return <Hero />;
};

export default HeroWrapper;
