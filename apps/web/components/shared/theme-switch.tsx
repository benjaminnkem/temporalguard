"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted)
    return <span className="inline-block size-9" aria-hidden="true" />;

  const next =
    theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Laptop;

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${theme}. Switch to ${next}.`}
      title={`Theme: ${theme}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -35, scale: 0.55, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 35, scale: 0.55, opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="grid place-items-center"
        >
          <Icon className="size-5" strokeWidth={2.5} />
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
