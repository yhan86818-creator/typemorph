'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, ExternalLink } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const FeedbackModal = ({ isOpen, onClose }: FeedbackModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-[#0d1117] rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
              <X size={20} />
            </button>

            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white border border-slate-200 dark:border-white/10">
                  <MessageSquare size={20} />
                </div>
                <h2 className="text-2xl font-black dark:text-white text-slate-900 tracking-tight">Feedback & Community</h2>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Join the community and help shape TypeMorph.</p>
            </div>

            <div className="space-y-4">
              {/* Discord */}
              <a
                href="https://discord.gg/dQHqsa8g8J"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-slate-900 dark:bg-white hover:opacity-80 text-white dark:text-slate-900 font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-opacity active:scale-95 group"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.112 18.1.13 18.116a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                <span>Chat on Discord</span>
                <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>

              {/* Twitter/X */}
              <a
                href="https://x.com/jopnuk9"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                <span>Follow on X / Twitter</span>
                <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </div>

            <p className="mt-6 text-center text-[9px] text-slate-400 font-medium">
              We read every message. Thank you for making TypeMorph better. 🙏
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
