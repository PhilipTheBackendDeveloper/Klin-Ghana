import React from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';
import { supabase } from '../../services/supabaseClient';

type ChatMessage = {
  id: number;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  isError?: boolean;
};

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// How many prior turns to send back for conversational context — enough to
// follow up ("what about SB-024?") without the request growing unbounded.
const HISTORY_TURNS = 10;

export const ChatBotAiView: React.FC = () => {
  const { bins, alerts, fleetHealth, routeStops } = useSmartBin();
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { id: 1, sender: 'assistant', text: 'Ask about the fleet — bin fill levels, active alerts, or today’s route. I can reason over whatever data is loaded in this session.', time: nowTime() },
  ]);
  const [inputText, setInputText] = React.useState('');
  const [isThinking, setIsThinking] = React.useState(false);

  const askAssistant = async (query: string, priorMessages: ChatMessage[]): Promise<{ text: string; isError?: boolean }> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        return { text: 'Your session has expired — sign in again to keep chatting with the assistant.', isError: true };
      }

      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: query,
          history: priorMessages
            .filter((m) => !m.isError)
            .slice(-HISTORY_TURNS)
            .map((m) => ({ role: m.sender, text: m.text })),
          fleet: {
            fleetHealthPercent: fleetHealth,
            bins: bins.map((bin) => ({
              code: bin.code,
              name: bin.name,
              status: bin.status,
              fillPercentage: bin.currentFillLevel,
              batteryPercentage: bin.batteryLevel ?? null,
              wifiSignal: bin.wifiSignal ?? null,
              lastUpdated: bin.lastUpdated ?? null,
              zone: bin.assignedZone ?? null,
            })),
            alerts: alerts.map((a) => ({ binCode: a.binCode, type: a.type, message: a.message, read: a.read })),
            routeStops: routeStops.map((r) => ({ binCode: r.binCode, name: r.name, status: r.status })),
          },
        }),
      });
      const body = await res.json();

      if (!res.ok || !body.ok) {
        return { text: body.message || 'The assistant could not answer that just now.', isError: true };
      }
      return { text: body.text };
    } catch {
      return { text: 'Could not reach the assistant — check your connection and try again.', isError: true };
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim() || isThinking) return;

    const userMsg: ChatMessage = { id: Date.now(), sender: 'user', text: query, time: nowTime() };
    const priorMessages = messages;
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsThinking(true);

    const answer = await askAssistant(query, priorMessages);
    setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'assistant', text: answer.text, isError: answer.isError, time: nowTime() }]);
    setIsThinking(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1D70F5] text-white shadow-md shadow-blue-500/20"><Bot className="h-5 w-5" /></div>
          <div>
            <h2 className="font-['Outfit',sans-serif] text-base font-bold text-slate-900">KlinGhana AI Assistant</h2>
            <p className="text-xs text-slate-500">Read-only fleet telemetry analysis and dispatch assistance</p>
          </div>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 font-mono text-[10px] font-bold text-blue-700">Fleet-data only</span>
      </div>

      <div className="flex min-h-[500px] flex-col justify-between space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-h-[460px] space-y-4 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] space-y-2 rounded-3xl p-4 text-xs sm:max-w-[80%] ${message.sender === 'user' ? 'rounded-br-none bg-[#1D70F5] font-medium text-white shadow-md shadow-blue-500/10' : message.isError ? 'rounded-bl-none border border-rose-200 bg-rose-50 text-rose-700' : 'rounded-bl-none border border-slate-200 bg-slate-50 text-slate-900'}`}>
                {message.sender === 'assistant' && (
                  <div className={`flex items-center gap-1.5 text-[11px] font-bold ${message.isError ? 'text-rose-600' : 'text-blue-600'}`}><Sparkles className="h-3.5 w-3.5" /><span>KlinGhana AI</span></div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                <div className={`text-right text-[9px] opacity-60 ${message.sender === 'user' ? 'text-white' : message.isError ? 'text-rose-400' : 'text-slate-400'}`}>{message.time}</div>
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-3xl rounded-bl-none border border-slate-200 bg-slate-50 p-4">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-slate-400">Suggested:</span>
            <button onClick={() => handleSend('Show urgent pickup bins')} disabled={isThinking} className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50">Urgent pickups</button>
            <button onClick={() => handleSend('Show fleet stats')} disabled={isThinking} className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50">Fleet stats</button>
          </div>
          <div className="flex items-center gap-2">
            <input type="text" value={inputText} onChange={(event) => setInputText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleSend()} disabled={isThinking} placeholder="Ask SmartBin AI about your fleet..." className="flex-1 rounded-2xl border border-transparent bg-[#ECEEF2] px-4 py-3.5 text-xs text-slate-900 placeholder-slate-400 transition-all focus:border-[#1D70F5] focus:bg-white focus:outline-none disabled:opacity-60" />
            <button onClick={() => handleSend()} disabled={isThinking || !inputText.trim()} className="rounded-2xl bg-[#1D70F5] p-3.5 font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-[#1D70F5]"><Send className="h-4 w-4" /></button>
          </div>
          <p className="text-center text-[10px] text-slate-400">AI can make mistakes. Verify critical fleet data.</p>
        </div>
      </div>
    </div>
  );
};
