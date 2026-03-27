'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { NetworkNode } from '../lib/types';

interface Props {
  node: NetworkNode | null;
  onClose: () => void;
  /** overlay=true (default): absolute bottom-sheet / floating card
   *  overlay=false: in-flow element that fills its container (mobile split) */
  overlay?: boolean;
}

function CardContent({ node, onClose }: { node: NetworkNode; onClose: () => void }) {
  return (
    <>
      {/* Community */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0 border border-black/10"
          style={{ backgroundColor: node.communityHex }}
        />
        <span className="text-xs uppercase tracking-widest text-stone-800">
          {node.community} constellation
        </span>
      </div>

      {/* Invite number */}
      <p className="font-serif text-sm mb-2 text-stone-700">
        Invite {node.id}
      </p>

      {/* Personalized description */}
      <p className="font-serif text-base leading-relaxed mb-5 italic">
        {node.description}
      </p>

      {/* Stats row */}
      <div className="flex gap-6 text-sm mb-5 text-stone-700">
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
        <p className="font-serif text-sm text-[#902125]">
          we think you&apos;ll get on well with invite #{node.matchId}
        </p>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-lg leading-none text-stone-700 hover:opacity-100 opacity-50"
        aria-label="Close"
      >
        ×
      </button>
    </>
  );
}

export default function GuestCard({ node, onClose, overlay = true }: Props) {
  if (!overlay) {
    // In-flow layout for mobile split — animate in from below
    return (
      <AnimatePresence>
        {node && (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="relative h-full overflow-y-auto bg-[#f8f5ef] border-t border-stone-200 px-5 pt-5 pb-8"
          >
            <CardContent node={node} onClose={onClose} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Overlay / floating card (desktop)
  return (
    <AnimatePresence>
      {node && (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 48 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="
            absolute
            bottom-6 left-1/2 -translate-x-1/2
            w-[min(480px,92vw)]
            bg-white/92 border border-stone-200 text-stone-800
            backdrop-blur-md rounded-sm shadow-xl
            px-7 py-6 z-20
          "
        >
          <CardContent node={node} onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
