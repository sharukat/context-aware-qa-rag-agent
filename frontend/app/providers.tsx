// app/providers.tsx
"use client";

import React, { useEffect, useState } from "react";
import {HeroUIProvider} from "@heroui/react";
import {ThemeProvider } from "next-themes";
import {ToastProvider} from "@heroui/toast";

export function Providers({children}: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return ( isClient ?
    <HeroUIProvider>
      <ToastProvider placement="top-right" />
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
        {children}
      </ThemeProvider>
    </HeroUIProvider> : <></>
  )
}