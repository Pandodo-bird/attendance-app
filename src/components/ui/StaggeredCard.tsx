"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface StaggeredCardProps {
  children: ReactNode;
  index: number;
  isGhostCard?: boolean;
}

export default function StaggeredCard({ children, index, isGhostCard }: StaggeredCardProps) {
  if (isGhostCard) {
    // Ghost card: opacity only, no y movement, with extra delay
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          delay: index * 0.05 + 0.1,
          duration: 0.25,
          ease: "easeOut",
        }}
      >
        {children}
      </motion.div>
    );
  }

  // Regular cards: subtle y:8 lift with stagger delay
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.05,
        duration: 0.25,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}
