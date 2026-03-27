'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { NetworkNode } from '../lib/types';

interface Props {
  node: NetworkNode | null;
  isDemo: boolean;
  darkMode: boolean;
  onClose: () => void;
}

export default function GuestCard({ node, isDemo, darkMode, onClose }: Props) {
  const bg = darkMode
    ? 'bg-stone-900/90 border-stone-700 text-stone-100'
    : 'bg-white/90 border-stone-200 text-stone-800';

  const accent = darkMode ? 'text-rose-300' : 'text-[#902125]';
  const subtle = darkMode ? 'text-stone-400' : 'text-stone-500';

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`
            absolute bottom-6 left-1/2 -translate-x-1/2
            w-[min(480px,90vw)]
            backdrop-blur-md border rounded-sm shadow-xl
            px-7 py-6 z-20
            ${bg}
          `}
        >
          {isDemo && (
            <div className={`text-xs uppercase tracking-widest mb-4 ${accent}`}>
              Demo mode
            </div>
          )}

          {/* Community */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0 border border-black/10"
              style={{ backgroundColor: node.communityHex }}
            />
            <span className={`text-xs uppercase tracking-widest ${subtle}`}>
              {node.community} constellation
            </span>
          </div>

          {/* Invite number */}
          <p className={`font-serif text-xs mb-2 ${subtle}`}>
            Invite {node.id}
          </p>

          {/* Personalized description */}
          <p className="font-serif text-base leading-relaxed mb-5 italic">
            {node.description}
          </p>

          {/* Stats row */}
          <div className={`flex gap-6 text-xs mb-5 ${subtle}`}>
            <div>
              <span className="block font-medium">{node.degree}</span>
              <span>connections</span>
            </div>
            <div>
              <span className="block font-medium">{node.community}</span>
              <span>community</span>
            </div>
          </div>

          {/* Predicted match */}
          {node.matchId && (
            <p className={`font-serif text-sm ${accent}`}>
              we think you&apos;ll get on well with invite #{node.matchId}
            </p>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 text-lg leading-none ${subtle} hover:opacity-100 opacity-50`}
            aria-label="Close"
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
