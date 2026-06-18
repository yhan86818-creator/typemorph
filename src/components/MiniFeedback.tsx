'use client';
import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Send, CheckCircle } from 'lucide-react';

interface MiniFeedbackProps {
  context: string;
}

export const MiniFeedback = ({ context }: MiniFeedbackProps) => {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleVote = (v: 'up' | 'down') => {
    if (submitted) return;
    setVote(v);
  };

  const handleSend = async () => {
    if (sending || submitted) return;
    setSending(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'mini',
          vote,
          message: note.trim() || null,
          context,
        }),
      });
    } finally {
      setSending(false);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
        <CheckCircle size={13} />
        <span>Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Was this helpful?</span>
        <button
          onClick={() => handleVote('up')}
          title="Yes, helpful"
          className={`p-1 rounded-lg transition-all ${vote === 'up' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'}`}
        >
          <ThumbsUp size={14} />
        </button>
        <button
          onClick={() => handleVote('down')}
          title="Not helpful"
          className={`p-1 rounded-lg transition-all ${vote === 'down' ? 'text-red-400 bg-red-50 dark:bg-red-950/40' : 'text-slate-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'}`}
        >
          <ThumbsDown size={14} />
        </button>
      </div>

      {vote !== null && (
        <>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Anything to add? (optional)"
              className="flex-1 text-[11px] bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition"
            />
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-80 disabled:opacity-50 transition"
            >
              {sending ? (
                <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={11} />
              )}
              <span>Send</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Sent to the developer only. No account required.</p>
        </>
      )}
    </div>
  );
};
