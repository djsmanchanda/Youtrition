// src/components/NavButtons.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NavButtons() {
  const router = useRouter();
  return (
    <div className="flex items-center space-x-2 mb-6">
      <Link href="/">
        <Button variant="outline" aria-label="Home">
          <Home className="h-5 w-5" />
        </Button>
      </Link>
      <Button variant="outline" aria-label="Back" onClick={() => router.back()}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
    </div>
  );
}
