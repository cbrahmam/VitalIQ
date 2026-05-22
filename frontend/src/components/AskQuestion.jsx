import { useState } from 'react';
import { Send, Loader2, Bot } from 'lucide-react';
import useHealthStore from '../store/healthStore';

export default function AskQuestion() {
  const [question, setQuestion] = useState('');
  const askQuestion = useHealthStore((s) => s.askQuestion);
  const askAnswer = useHealthStore((s) => s.askAnswer);
  const askLoading = useHealthStore((s) => s.askLoading);
  const showToast = useHealthStore((s) => s.showToast);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || askLoading) return;
    try {
      await askQuestion(question.trim());
    } catch {
      showToast('Failed to get answer', 'error');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-medium text-white">Ask About Your Health</h3>
        {askAnswer && (
          <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded ml-auto">
            {askAnswer.source === 'rule_engine' ? 'Rule Engine' : 'AI'}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. How is my Vitamin D? Is my iron supplement working?"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
          disabled={askLoading}
        />
        <button
          type="submit"
          disabled={askLoading || !question.trim()}
          className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg px-3 py-2 transition-colors"
        >
          {askLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>

      {askAnswer && (
        <div className="mt-3 bg-slate-800 rounded-lg p-3">
          <p className="text-sm text-slate-300 whitespace-pre-line">{askAnswer.answer}</p>
          {askAnswer.relevant_data.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {askAnswer.relevant_data.map((d, i) => (
                <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                  {d.name || d.metric}: {d.value ?? d.avg} {d.unit || ''}
                  {d.status && ` (${d.status})`}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
