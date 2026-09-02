import React from 'react';
import {
  Bell,
  Bot,
  BarChart3,
  FileText,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Route,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';

interface FigmaSidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
}

const navItems = [
  { id: 'command-center', label: 'Overview', icon: LayoutDashboard, top: 167 },
  { id: 'bins-locations', label: 'Bins', icon: Trash2, top: 234 },
  { id: 'device-detail', label: 'Device detail', icon: ListChecks, top: 280 },
  { id: 'alerts', label: 'Alerts', icon: Bell, top: 326 },
  { id: 'complaints', label: 'Complaints', icon: FileText, top: 372 },
  { id: 'routes', label: 'Routes', icon: Route, top: 418 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, top: 464 },
  { id: 'users', label: 'Users', icon: Users, top: 505 },
  { id: 'settings', label: 'Settings', icon: Settings, top: 553 },
];

export const FigmaSidebar: React.FC<FigmaSidebarProps> = ({ currentView, onSelectView }) => {
  return (
    <aside className="absolute left-0 top-0 h-[1057px] w-[189px] overflow-hidden bg-white" data-name="side bar">
      <div className="absolute left-[11px] top-[89px] h-px w-[166px] bg-black/10" />
      <button
        type="button"
        onClick={() => onSelectView('command-center')}
        className="absolute left-[29px] top-[35px] h-[32px] w-[130px] text-left"
        aria-label="KlinGhana overview"
      >
        <span className="absolute left-0 top-0 whitespace-pre text-[24px] font-extrabold leading-none text-[#1174e6] font-['Inter',sans-serif]">
          KlinGh    na
        </span>
        <span className="absolute left-[78px] top-[3px] flex h-[24px] w-[24px] items-center justify-center rounded bg-[#1174e6] text-[12px] font-black text-white">
          K
        </span>
      </button>

      {navItems.map((item) => {
        const Icon = item.icon;
        const active = currentView === item.id || (item.id === 'users' && currentView === 'settings');
        if (item.id === 'command-center') {
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className="figma-button-hit absolute left-[15px] top-[167px] h-[36px] w-[162px] rounded-[20px] border border-[#3b82f6] bg-white text-[#3b82f6]"
            >
              <Icon className="absolute left-[9px] top-[5px] h-[24px] w-[24px]" strokeWidth={1.7} />
              <span className="absolute left-[38px] top-[7px] whitespace-nowrap text-[16px] font-medium leading-normal font-['Inter',sans-serif]">
                Overview
              </span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => onSelectView(item.id)}
            className={`figma-button-hit absolute left-0 h-[36px] w-[189px] text-left ${active ? 'text-[#3b82f6]' : 'text-[#8daac0]'}`}
            style={{ top: item.top }}
          >
            <Icon className="absolute left-[26px] top-[5px] h-[20px] w-[20px] text-black" strokeWidth={1.8} />
            <span className="absolute left-[68px] top-[5px] w-[112px] text-[12px] font-medium leading-[1.18]">
              {item.label}
            </span>
          </button>
        );
      })}

      <div className="absolute left-[4px] top-[806px] h-[169px] w-[178px] overflow-hidden rounded-[15px] bg-[#dbeafe]">
        <p className="absolute left-[10px] top-[18px] h-[34px] w-[150px] text-[10px] font-semibold leading-[26px] text-[#0b1f1a]">
          Need help identifying the issue?
        </p>
        <p className="absolute left-[12px] top-[49px] h-[75px] w-[159px] text-[8px] font-normal leading-[19px] text-[#0b1f1a]">
          Ask the KlinGhana assistant about sorting, bin status or what to include in your report. It cannot operate the lid.
        </p>
        <button
          type="button"
          onClick={() => onSelectView('ai')}
          className="figma-button-hit absolute left-[25px] top-[114px] h-[45px] w-[135px] rounded-[10px] bg-black text-white"
        >
          <span className="absolute left-[41px] top-[13px] text-[16px] font-semibold leading-[17px]">Ask</span>
          <Bot className="absolute left-[77px] top-[8px] h-[15px] w-[15px]" />
          <MapPin className="absolute left-[75px] top-[17px] h-[19px] w-[19px]" />
        </button>
      </div>
    </aside>
  );
};
