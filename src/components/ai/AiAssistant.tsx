import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Scan, 
  Trash2, 
  Recycle, 
  CheckCircle2, 
  HelpCircle, 
  Leaf, 
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { AiChatMessage, WasteCategory } from '../../types';
import { WASTE_GUIDES, GHANA_WASTE_FACTS } from '../../data/educationGuides';
import { useSmartBin } from '../../context/SmartBinContext';

export const AiAssistant: React.FC = () => {
  const { bins } = useSmartBin();
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: 'Akwaaba! I am your KlinGhana AI Waste Intelligence Assistant. Ask me about waste segregation, recycling guidelines in Ghana, smart bin telemetry diagnostics, or use the interactive Scanner below to identify any item!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [activeItemScan, setActiveItemScan] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const sampleItems = [
    { name: 'Pure Water Sachet Rubber', category: 'plastic', desc: 'Low-Density Polyethylene (LDPE) sachet film' },
    { name: 'Plantain & Yam Peels', category: 'organic', desc: 'Biodegradable kitchen biomass' },
    { name: 'Old Lithium Phone Battery', category: 'electronic', desc: 'Hazardous rechargeable cell containing cobalt/lithium' },
    { name: 'Corrugated Shipping Box', category: 'paper', desc: 'Clean unsoiled packaging cardboard' },
    { name: 'Broken Beverage Bottle', category: 'glass', desc: 'Recyclable silica glass container' }
  ];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: AiChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');

    // Generate smart contextual AI response
    setTimeout(() => {
      const response = generateAiAnswer(query.toLowerCase(), bins);
      const aiMsg: AiChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        categoryTag: response.category
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 600);
  };

  const scanSpecificItem = (item: typeof sampleItems[0]) => {
    setActiveItemScan(item.name);
    handleSend(`Classify item: "${item.name}" and tell me which smart bin to use in Ghana.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 7 Cols: Conversational Assistant */}
      <div className="lg:col-span-7 glass-panel rounded-3xl border border-slate-800 flex flex-col h-[650px] overflow-hidden shadow-2xl">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-brand-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">KlinGhana AI Assistant</h3>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Trained on Ghana Waste & SDG Environmental Frameworks
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
            v2.4-LLM
          </span>
        </div>

        {/* Chat Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-brand-500 text-slate-950 font-semibold rounded-br-none shadow-md shadow-brand-500/10'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                {msg.sender === 'assistant' && (
                  <div className="flex items-center gap-1.5 text-brand-400 font-bold mb-1 text-[11px]">
                    <Sparkles className="w-3 h-3" />
                    <span>KlinGhana AI Engine</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <div className="text-[9px] text-right mt-1 opacity-60">
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>

        {/* Suggested Quick Prompt Pills */}
        <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-bold shrink-0">Try:</span>
          {[
            'Which bin is closest to overflow?',
            'How do I dispose of pure water sachets?',
            'Explain how ultrasonic fill detection works',
            'Composting food waste in Accra'
          ].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about waste segregation, recycling, or bin diagnostics..."
            className="flex-1 bg-slate-900 border border-slate-700 text-white placeholder-slate-400 text-xs rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500"
          />
          <button
            onClick={() => handleSend()}
            className="p-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold transition-all shadow-lg shadow-brand-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right 5 Cols: Educational Waste Classifier & Eco-Guide */}
      <div className="lg:col-span-5 space-y-6">
        {/* Interactive Item Classifier Scanner */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="font-bold text-white text-sm">Interactive Waste Item Classifier</h3>
              <p className="text-xs text-slate-400">Click any common Ghanaian waste item to test AI classification</p>
            </div>
          </div>

          <div className="space-y-2">
            {sampleItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => scanSpecificItem(item)}
                className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  activeItemScan === item.name
                    ? 'bg-purple-500/20 border-purple-500/50 shadow-md shadow-purple-500/10'
                    : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white">{item.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-800 text-purple-300">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Ghana Environmental Eco-Fact Card */}
        <div className="glass-panel p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <Leaf className="w-4 h-4" />
            <span>Ghana Environmental Fact of the Day</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            "{GHANA_WASTE_FACTS[Math.floor(Math.random() * GHANA_WASTE_FACTS.length)]}"
          </p>
        </div>
      </div>
    </div>
  );
};

// AI Knowledge response engine
function generateAiAnswer(query: string, bins: any[]): { text: string; category?: WasteCategory } {
  if (query.includes('closest') || query.includes('overflow') || query.includes('status') || query.includes('full')) {
    const fullBins = bins.filter(b => b.currentFillLevel >= 80);
    if (fullBins.length > 0) {
      const highest = [...fullBins].sort((a, b) => b.currentFillLevel - a.currentFillLevel)[0];
      return {
        text: `Currently, **${highest.name}** (${highest.code}) is closest to overflow at **${highest.currentFillLevel}% capacity** (${highest.location.address}).\n\nThere are ${fullBins.length} total bins requiring municipal collection dispatch. You can trigger an automatic truck collection from the Dashboard or Fleet Map.`
      };
    }
    return {
      text: 'All smart dustbins are currently operating within safe limits (<80% fill capacity). The highest fill level detected is at 45%.'
    };
  }

  if (query.includes('sachet') || query.includes('pure water') || query.includes('plastic') || query.includes('bottle')) {
    return {
      text: `💧 **Plastic & Pure Water Sachets:**\n- **Target Bin:** Blue (Plastics & Sachets)\n- **Recycling Value:** High. LDPE water sachets are shredded, pelletized, and recycled into pavement blocks, garbage liners, and irrigation pipes in Ghana.\n- **Carbon Savings:** ~1.8 kg CO2 saved per kg recycled.\n- **Best Practice:** Ensure the sachet is drained of residual water before dropping into the smart bin.`,
      category: 'plastic'
    };
  }

  if (query.includes('plantain') || query.includes('organic') || query.includes('food') || query.includes('yam') || query.includes('peel') || query.includes('compost')) {
    return {
      text: `🌱 **Organic & Food Waste:**\n- **Target Bin:** Green (Organic & Food)\n- **Composting Value:** Organic waste constitutes ~60% of municipal solid waste in Accra. When separated, it creates nutrient-dense compost for peri-urban agriculture in Abokobi and Prampram.\n- **Key Rule:** Do NOT mix plastic wraps or styrofoam packs into the organic smart bin.`,
      category: 'organic'
    };
  }

  if (query.includes('battery') || query.includes('electronic') || query.includes('phone') || query.includes('e-waste')) {
    return {
      text: `⚡ **E-Waste & Batteries:**\n- **Target Bin:** Purple (E-Waste & Batteries)\n- **Safety Hazard:** Spent lithium and alkaline cells can leach heavy metals (lead, cadmium, lithium) into groundwater if dumped in ordinary landfills.\n- **Disposal:** Dispose only in designated smart electronic drop points (e.g. KNUST or University Hubs).`,
      category: 'electronic'
    };
  }

  if (query.includes('ultrasonic') || query.includes('sensor') || query.includes('how it works') || query.includes('esp32')) {
    return {
      text: `📡 **How SmartBin IoT Telemetry Works:**\n1. **Fill Level Sensing:** An HC-SR04 ultrasonic sensor at the bin ceiling emits 40kHz sound waves downwards. It measures time-of-flight to calculate the distance to the waste surface ($d = \\frac{v \\times t}{2}$).\n2. **Proximity Lid Actuation:** A secondary ultrasonic/PIR sensor detects an approaching citizen (<25cm), commanding an SG90 servo motor to open the lid 90° for 5 seconds.\n3. **Cloud Telemetry:** An onboard ESP32 microcontroller publishes fill percentage, battery level, internal temperature, and GPS coordinates over Wi-Fi to the central KlinGhana dashboard.`
    };
  }

  return {
    text: `Smart waste management helps Ghana achieve cleaner cities, reduced flood risks, and optimal garbage truck dispatch.\n\nYou can inspect specific bins from the **Live Dashboard**, test hardware sensors in the **Hardware & IoT Lab**, or simulate a collection route on the **GPS Fleet Map**.`
  };
}
