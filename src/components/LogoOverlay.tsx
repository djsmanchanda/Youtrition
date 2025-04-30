// src/components/LogoOverlay.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function LogoOverlay() {
  const path = usePathname();
  const isHome = path === '/';

  return (
    <Link
      href="/"
      className={`
        absolute
        ${isHome ? 'top-18 w-72' : 'top-5 w-50'}
        left-1/2 -translate-x-1/2
        z-50
      `}
    >
      <Image
        src="/youtrition_logo_crop.png"
        alt="Youtrition Logo"
        width={isHome ? 300 : 150}   // match your w-32 / w-24
        height={isHome ? 100 : 50}
        priority
      />
    </Link>
  );
}
