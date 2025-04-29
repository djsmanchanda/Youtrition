// src/components/ScrollButton.tsx
'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ScrollButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

export default function ScrollButton({
  children = 'See How It Works',
  className = '',
  ...props
}: ScrollButtonProps) {
  const scrollToSection = () => {
    document
      .getElementById('how-it-works')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <button
      {...props}
      onClick={scrollToSection}
      className={`${className}`}
    >
      {children}
    </button>
  );
}
