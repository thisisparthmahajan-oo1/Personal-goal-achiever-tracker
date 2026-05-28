"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function StaggerFade({
  children,
  delayStep = 0.04,
}: {
  children: ReactNode;
  delayStep?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: delayStep } },
      }}
      className="contents"
    >
      {children}
    </motion.div>
  );
}

export function FadeInItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 6 },
        show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
