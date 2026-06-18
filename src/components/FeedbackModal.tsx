'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Send, CheckCircle } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const FeedbackModal = ({ isOpen, onClose }: FeedbackModalProps) => {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setMessage('');
      setStatus('idle');
    }, 300);
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'modal', message: trimmed }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-[#0d1117] rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            <button onClick={handleClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
              <X size={20} />
            </button>

            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white border border-slate-200 dark:border-white/10">
                  <MessageSquare size={20} />
                </div>
                <h2 className="text-2xl font-black dark:text-white text-slate-900 tracking-tight">Send Feedback</h2>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Tell us what you think. We read every message.</p>
            </div>

            {status === 'sent' ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle size={40} className="text-emerald-500" />
                <p className="text-slate-900 dark:text-white font-bold text-lg">Thank you!</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Your feedback helps make TypeMorph better.</p>
                <button onClick={handleClose} className="mt-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors underline underline-offset-2">Close</button>
              </div>
            ) : (
              <>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="What's on your mind? Bugs, ideas, missing features…"
                  rows={5}
                  className="w-full resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm px-4 py-3 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 transition"
                />

                {status === 'error' && (
                  <p className="mt-2 text-xs text-red-500">Something went wrong. Please try again.</p>
                )}

                <button
                  onClick={handleSend}
                  disabled={!message.trim() || status === 'sending'}
                  className="mt-4 w-full bg-slate-900 dark:bg-white hover:opacity-80 disabled:opacity-40 text-white dark:text-slate-900 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-opacity active:scale-95"
                >
                  {status === 'sending' ? (
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  <span>Send Feedback</span>
                </button>

                <p className="mt-3 text-center text-[10px] text-slate-400">
                  Your message is sent to the developer and stored securely. No account required.
                </p>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
