'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function LogoOverlay() {
  const path = usePathname();
  const isHome = path === '/';

  return (
    <div className="relative w-full">
      <Link
        href="/"
        className={`
          absolute
          left-1/2
          ${isHome ? '-translate-x-[50%]' : '-translate-x-[48%]'}
          ${isHome ? 'top-20 w-[300px]' : 'top-5 w-[180px]'}
          z-50
        `}
      >
        <Image
          src="/youtrition_logo_crop.png"
          alt="Youtrition Logo"
          width={isHome ? 300 : 180}
          height={isHome ? 100 : 60}
          priority
          className="w-full h-auto"
        />
      </Link>
    </div>
  );
}
