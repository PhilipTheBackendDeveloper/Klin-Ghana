import React from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';

type FleetCard = {
  code: string;
  location: string;
  fill: number;
  status: string;
  battery: string;
};

type ChatMessage = {
  id: number;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  cards?: FleetCard[];
};

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const ChatBotAiView: React.FC = () => {
  const { bins, alerts, fleetHealth, overflowCount, routeStops } = useSmartBin();
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { id: 1, sender: 'assistant', text: 'Ask about the live fleet. I will only summarize records loaded from Supabase in this session.', time: nowTime() },
  ]);
  const [inputText, setInputText] = React.useState('');

  const generateAiAnswer = (query: string): { text: string; cards?: FleetCard[] } => {
    const qLower = query.toLowerCase();

    if (qLower.includes('fleet') || qLower.includes('health') || qLower.includes('stats')) {
      return { text: `Current fleet health is ${fleetHealth}% across ${bins.length} loaded assets. Active overflows: ${overflowCount}. Online nodes: ${bins.filter((bin) => bin.wifiConnected).length}/${bins.length}. Active alerts: ${alerts.filter((alert) => !alert.read).length}.` };
    }

    if (qLower.includes('full') || qLower.includes('overflow') || qLower.includes('urgent') || qLower.includes('pickup')) {
      const fullBins = bins.filter((bin) => bin.currentFillLevel >= 75).sort((a, b) => b.currentFillLevel - a.currentFillLevel);
      return {
        text: fullBins.length === 0 ? 'No high-fill bins were returned by the live data source.' : `Found ${fullBins.length} high-fill SmartBin asset(s) from live data.`,
        cards: fullBins.slice(0, 3).map((bin) => ({ code: bin.code, location: bin.name, fill: bin.currentFillLevel, status: bin.status.toUpperCase(), battery: bin.batteryLevel == null ? 'N/A' : `${bin.batteryLevel}%` })),
      };
    }

    if (qLower.includes('route')) {
      return { text: routeStops.length === 0 ? 'No live route stops are currently loaded.' : `There are ${routeStops.length} live route stops loaded, with ${routeStops.filter((stop) => stop.status === 'COLLECTED').length} already collected.` };
    }

    const matchedBin = bins.find((bin) => qLower.includes(bin.code.toLowerCase()) || qLower.includes(bin.name.toLowerCase()));
    if (matchedBin) {
      return {
        text: `${matchedBin.code} at ${matchedBin.name} is currently at ${matchedBin.currentFillLevel}% fill with status ${matchedBin.status.toUpperCase()}. Distance: ${matchedBin.distanceCm ?? 'N/A'}cm. Battery: ${matchedBin.batteryLevel ?? 'N/A'}%. RSSI: ${matchedBin.wifiSignal ?? 'N/A'} dBm.`,
        cards: [{ code: matchedBin.code, location: matchedBin.name, fill: matchedBin.currentFillLevel, status: matchedBin.status.toUpperCase(), battery: matchedBin.batteryLevel == null ? 'N/A' : `${matchedBin.batteryLevel}%` }],
      };
    }

    return { text: bins.length === 0 ? 'No live bins are loaded yet, so there is nothing to summarize.' : 'I could not match that request to a loaded bin, alert, or route stop.' };
  };

  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg: ChatMessage = { id: Date.now(), sender: 'user', text: query, time: nowTime() };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');

    setTimeout(() => {
      const answer = generateAiAnswer(query);
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'assistant', text: answer.text, cards: answer.cards, time: nowTime() }]);
    }, 300);
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
        <span className="rounded-full bg-blue-50 px-2.5 py-1 font-mono text-[10px] font-bold text-blue-700">Live data only</span>
      </div>

      <div className="flex min-h-[500px] flex-col justify-between space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-h-[460px] space-y-4 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] space-y-3 rounded-3xl p-4 text-xs sm:max-w-[80%] ${message.sender === 'user' ? 'rounded-br-none bg-[#1D70F5] font-medium text-white shadow-md shadow-blue-500/10' : 'rounded-bl-none border border-slate-200 bg-slate-50 text-slate-900'}`}>
                {message.sender === 'assistant' && <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600"><Sparkles className="h-3.5 w-3.5" /><span>KlinGhana AI</span></div>}
                <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                {message.cards && message.cards.length > 0 && (
                  <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-3">
                    {message.cards.map((card) => (
                      <div key={card.code} className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 text-left">
                        <div className="flex items-center justify-between"><span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700">{card.code}</span><span className="font-mono text-[10px] font-black text-rose-600">{card.fill}%</span></div>
                        <div><div className="truncate text-[11px] font-bold text-slate-900">{card.location}</div><div className="text-[10px] text-slate-400">{card.status} - Battery {card.battery}</div></div>
                      </div>
                    ))}
                  </div>
                )}
                <div className={`text-right text-[9px] opacity-60 ${message.sender === 'user' ? 'text-white' : 'text-slate-400'}`}>{message.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-slate-400">Suggested:</span>
            <button onClick={() => handleSend('Show urgent pickup bins')} className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100">Urgent pickups</button>
            <button onClick={() => handleSend('Show fleet stats')} className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200">Fleet stats</button>
          </div>
          <div className="flex items-center gap-2">
            <input type="text" value={inputText} onChange={(event) => setInputText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleSend()} placeholder="Ask SmartBin AI about your fleet..." className="flex-1 rounded-2xl border border-transparent bg-[#ECEEF2] px-4 py-3.5 text-xs text-slate-900 placeholder-slate-400 transition-all focus:border-[#1D70F5] focus:bg-white focus:outline-none" />
            <button onClick={() => handleSend()} className="rounded-2xl bg-[#1D70F5] p-3.5 font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-600"><Send className="h-4 w-4" /></button>
          </div>
          <p className="text-center text-[10px] text-slate-400">AI can make mistakes. Verify critical fleet data.</p>
        </div>
      </div>
    </div>
  );
};
