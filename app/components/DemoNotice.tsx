'use client';

import { motion } from 'framer-motion';

interface Props {
  darkMode: boolean;
}

export default function DemoNotice({ darkMode }: Props) {
  const bg = darkMode
    ? 'bg-stone-800/80 text-stone-300 border-stone-600'
    : 'bg-stone-50/90 text-stone-500 border-stone-200';

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.8, duration: 0.5 }}
      className={`
        absolute top-4 left-1/2 -translate-x-1/2
        text-xs text-center px-5 py-2 border rounded-sm
        backdrop-blur-sm z-20 max-w-sm
        ${bg}
      `}
    >
      Demo mode &mdash; each wedding guest received a unique invite number
      that reveals their personalised position in the network.
    </motion.div>
  );
}
