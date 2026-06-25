'use client';
import React, { useState } from 'react';
import { Lock, ThumbsUp, ThumbsDown, MessageSquare, RefreshCw } from 'lucide-react';

interface FeedbackRow {
  id: number;
  source: string;
  message: string | null;
  vote: string | null;
  context: string | null;
  created_at: string | null;
}

export default function AdminClient() {
  const [password, setPassword] = useState('');
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchFeedback = async (pw: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError('パスワードが違います');
        setRows(null);
      } else {
        setRows(data.rows);
      }
    } catch {
      setError('通信エラー');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFeedback(password);
  };

  const ups = rows?.filter(r => r.vote === 'up').length ?? 0;
  const downs = rows?.filter(r => r.vote === 'down').length ?? 0;
  const withMessage = rows?.filter(r => r.message && r.message.trim()).length ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Lock size={20} className="text-slate-400" />
          <h1 className="text-xl font-black tracking-tight">TypeMorph Admin</h1>
        </div>

        {rows === null ? (
          <form onSubmit={handleSubmit} className="max-w-sm">
            <label className="block text-sm text-slate-400 mb-2">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-500 mb-3"
              placeholder="••••••••"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-white text-slate-900 font-black py-3 rounded-xl disabled:opacity-40 hover:opacity-80 transition-opacity"
            >
              {loading ? '確認中...' : 'ログイン'}
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-6">
                <div className="flex items-center gap-2 text-emerald-400">
                  <ThumbsUp size={16} />
                  <span className="font-black text-lg">{ups}</span>
                  <span className="text-slate-500 text-sm">いいね</span>
                </div>
                <div className="flex items-center gap-2 text-red-400">
                  <ThumbsDown size={16} />
                  <span className="font-black text-lg">{downs}</span>
                  <span className="text-slate-500 text-sm">よくない</span>
                </div>
                <div className="flex items-center gap-2 text-blue-400">
                  <MessageSquare size={16} />
                  <span className="font-black text-lg">{withMessage}</span>
                  <span className="text-slate-500 text-sm">コメントあり</span>
                </div>
                <div className="text-slate-500 text-sm self-center">計 {rows.length} 件</div>
              </div>
              <button
                onClick={() => fetchFeedback(password)}
                className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
              >
                <RefreshCw size={14} />
                更新
              </button>
            </div>

            <div className="space-y-2">
              {rows.length === 0 && (
                <p className="text-slate-500 text-center py-16">まだフィードバックはありません</p>
              )}
              {rows.map(row => (
                <div
                  key={row.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-start gap-4"
                >
                  <div className="mt-0.5">
                    {row.vote === 'up' && <ThumbsUp size={14} className="text-emerald-400" />}
                    {row.vote === 'down' && <ThumbsDown size={14} className="text-red-400" />}
                    {!row.vote && <MessageSquare size={14} className="text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {row.message && (
                      <p className="text-white text-sm mb-1">{row.message}</p>
                    )}
                    <div className="flex gap-3 text-xs text-slate-500 flex-wrap">
                      {row.context && <span className="bg-slate-800 px-2 py-0.5 rounded">{row.context}</span>}
                      <span>{row.source}</span>
                      {row.created_at && <span>{row.created_at}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
