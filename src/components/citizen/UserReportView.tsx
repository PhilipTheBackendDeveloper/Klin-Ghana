import React from 'react';
import { Bell, Bot, LogOut, Search, Upload } from 'lucide-react';
import { useSmartBin } from '../../context/SmartBinContext';

interface UserReportViewProps {
  onReportSuccess?: () => void;
}

const problems = ['Bin full', 'Overflow', 'Lid problem', 'Sensor issue', 'Other'];

export const UserReportView: React.FC<UserReportViewProps> = ({ onReportSuccess }) => {
  const { submitCitizenReport, bins } = useSmartBin();
  const [problemType, setProblemType] = React.useState('Overflow');
  const [selectedBinId, setSelectedBinId] = React.useState('');
  const [locationText, setLocationText] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priority, setPriority] = React.useState<'Standard' | 'Urgent'>('Urgent');
  const [evidenceName, setEvidenceName] = React.useState<string | null>(null);
  const [generatedTicket, setGeneratedTicket] = React.useState<string | null>(null);

  const selectedBin = bins.find((bin) => bin.id === selectedBinId);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const ticketId = submitCitizenReport({
      problemType,
      locationText: selectedBin ? selectedBin.location.address : locationText,
      description,
      priority,
      evidenceUrl: evidenceName || undefined,
      reporterName: 'Citizen Reporter',
      binId: selectedBin?.id,
      binName: selectedBin?.name,
    });
    setGeneratedTicket(ticketId);
    window.setTimeout(() => onReportSuccess?.(), 900);
  };

  return (
    <main className="relative h-[1382px] w-[1440px] overflow-hidden bg-white" data-node-id="91:100" data-name="User report">
      <header className="absolute left-0 top-0 h-[93px] w-[1440px] bg-white shadow-[0_4px_4px_rgba(0,0,0,0.05)]">
        <a href="#/user/report" className="absolute left-[37px] top-[26px] h-[32px] w-[130px]" aria-label="KlinGhana home">
          <span className="absolute left-0 top-0 whitespace-pre font-['Inter',sans-serif] text-[24px] font-extrabold leading-none text-[#1174e6]">KlinGh    na</span>
          <span className="absolute left-[78px] top-[3px] flex h-[24px] w-[24px] items-center justify-center rounded bg-[#1174e6] text-[12px] font-black text-white">K</span>
        </a>
        <div className="absolute left-[286px] top-[27px] h-[43px] w-[260px] rounded-[20px] bg-[#d9d9d9]/20"><Search className="absolute left-[21px] top-[10px] h-[24px] w-[24px] text-black/45" /><input className="absolute left-[65px] top-0 h-[43px] w-[170px] bg-transparent text-[12px] outline-none placeholder:text-black/50" placeholder="Search" /></div>
        <nav className="absolute left-[511px] top-[21px] flex h-[48px] w-[600px] items-center justify-center gap-[30px] text-[14px] leading-[20px]"><a href="#/user/bins" className="font-medium text-[#0b1f1a]/70">Nearby bins</a><a href="#/user/report" className="font-semibold text-[#047857]">Report issue</a><a href="#/user/complaints" className="font-medium text-[#0b1f1a]/70">My complaints</a><a href="#/user/bins" className="font-medium text-[#0b1f1a]/70">Learn</a></nav>
        <button type="button" className="figma-button-hit absolute left-[1124px] top-[29px] h-[24px] w-[24px] text-black" aria-label="Notifications"><Bell className="h-[24px] w-[24px]" fill="currentColor" /></button>
        <div className="absolute left-[1161px] top-[14px] h-[50px] w-px bg-black/10" />
        <div className="absolute left-[1217px] top-[26px] text-[12px] font-bold leading-[1.18] text-[#3b82f6]">Citizen</div>
        <div className="absolute left-[1217px] top-[44px] text-[9px] font-medium leading-[1.18] text-[#8daac0]">Live report</div>
        <span className="absolute left-[1303px] top-[25px] h-[40px] w-[40px] rounded-full bg-[#d9d9d9]" />
        <a href="#/login" className="figma-button-hit absolute left-[1388px] top-[32px] h-[24px] w-[24px] text-black" aria-label="Logout"><LogOut className="h-[24px] w-[24px]" /></a>
      </header>

      <img alt="SmartBin mini illustration" src="/figma-assets/login-smartbin-illustration.jpeg" className="absolute left-[843px] top-[161px] h-[109px] w-[109px] rotate-[11.21deg] object-contain" />
      <h1 className="absolute left-[429px] top-[202px] whitespace-nowrap text-[32px] font-bold leading-[46px] text-[#0b1f1a]">Report a smart-bin problem</h1>
      <p className="absolute left-[367px] top-[270px] w-[850px] text-[16px] font-normal leading-[23px] text-[#0b1f1a]/65">Tell us what failed. Live bin choices come from the current Supabase asset register.</p>

      <form onSubmit={handleSubmit} className="absolute left-[156px] top-[371px] h-[759px] w-[1105px] overflow-visible">
        <h2 className="absolute left-[108px] top-[50px] whitespace-nowrap text-[22px] font-semibold leading-[32px] text-[#0b1f1a]">Problem details</h2>
        <p className="absolute left-[108px] top-[98px] w-[720px] text-[13px] font-normal leading-[19px] text-[#0b1f1a]/60">Required fields are marked. We will create a trackable complaint after submission.</p>

        <label className="absolute left-[101px] top-[136px] text-[13px] font-semibold leading-[19px] text-[#0b1f1a]">What went wrong? *</label>
        <div className="absolute left-[101px] top-[171px] flex h-[42px] w-[752px] gap-[10px] overflow-hidden">
          {problems.map((problem) => <button key={problem} type="button" onClick={() => setProblemType(problem)} className={`h-[40px] rounded-full border px-[28px] text-[12px] leading-[17px] ${problemType === problem ? 'border-[#047857] bg-[#ecfdf5] font-semibold' : 'border-[#d8e4e0] bg-white font-medium'}`}>{problem}</button>)}
        </div>

        <label className="absolute left-[788px] top-[118px] text-[13px] font-semibold leading-normal text-[#0b1f1a]">Bin or location *</label>
        <select value={selectedBinId} onChange={(event) => setSelectedBinId(event.target.value)} className="absolute left-[788px] top-[144px] h-[46px] w-[247px] rounded-[10px] border border-[#d8e4e0] bg-white px-[14px] text-[14px] text-[#52675f] outline-none">
          <option value="">{bins.length === 0 ? 'No live bins registered' : 'Select a live bin'}</option>
          {bins.map((bin) => <option key={bin.id} value={bin.id}>{bin.code} - {bin.name}</option>)}
        </select>
        <p className="absolute left-[788px] top-[197px] whitespace-nowrap text-[12px] font-normal text-[#52675f]">No demo locations are inserted in live mode.</p>

        <div className="absolute left-[96px] top-[285px] h-[336px] w-[941px] overflow-hidden rounded-[15px] bg-[#f0f0f0]">
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the issue..." className="absolute left-[63px] top-[84px] h-[140px] w-[690px] resize-none bg-transparent text-[14px] leading-[20px] text-[#0b1f1a]/70 outline-none placeholder:text-[#0b1f1a]/40" required />
          <input value={locationText} onChange={(event) => setLocationText(event.target.value)} placeholder="Optional street/location when no bin is selected" className="absolute left-[63px] top-[40px] h-[34px] w-[690px] rounded-[10px] border border-[#d8e4e0] bg-white px-3 text-[13px] outline-none" />
          <div className="absolute left-[27px] top-[248px] h-[76px] w-[886px] overflow-hidden rounded-[15px] bg-white">
            <label className="absolute left-[15px] top-[4px] text-[13px] font-semibold leading-[19px] text-[#0b1f1a]">Priority</label>
            <div className="absolute left-[12px] top-[29px] flex h-[40px] gap-[8px]">{(['Standard', 'Urgent'] as const).map((nextPriority) => <button key={nextPriority} type="button" onClick={() => setPriority(nextPriority)} className={`h-[40px] w-[150px] rounded-[10px] border text-[12px] ${priority === nextPriority ? 'border-[#ef4444] bg-[#fee2e2] font-semibold' : 'border-[#d8e4e0] bg-white font-medium'}`}>{nextPriority}</button>)}</div>
            <button type="submit" className="figma-button-hit absolute left-[741px] top-[12px] h-[55px] w-[135px] rounded-[10px] bg-black text-white"><span className="absolute left-[41px] top-[19px] text-[16px] font-semibold leading-[17px]">Send</span><span className="absolute left-[93px] top-[12px] text-[34px] leading-[34px]">&gt;</span></button>
          </div>
        </div>

        <button type="button" onClick={() => setEvidenceName(evidenceName ? null : 'evidence-upload.local')} className="figma-button-hit absolute left-[93px] top-[632px] flex h-[78px] w-[274px] items-center gap-[12px] rounded-[12px] border border-dashed border-[#d8e4e0] bg-[#f7faf9] px-[16px] text-left">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#ecfdf5] text-[#047857]"><Upload className="h-[16px] w-[16px]" /></span>
          <span><span className="block text-[13px] font-semibold leading-[19px] text-[#0b1f1a]">{evidenceName ? 'Evidence attached' : 'Add photo or short video'}</span><span className="block text-[11px] font-normal leading-[16px] text-[#0b1f1a]/60">Optional - JPG, PNG or MP4 up to 10 MB</span></span>
        </button>
      </form>

      <p className="absolute left-[579px] top-[1205px] w-[430px] text-[11px] font-normal leading-[16px] text-[#0b1f1a]/60">{generatedTicket ? `Complaint ${generatedTicket} created. Redirecting to tracking.` : 'Your contact details are only shared with the response team.'}</p>
      <div className="absolute left-[257px] top-[1166px] h-[169px] w-[178px] overflow-hidden rounded-[15px] bg-[#dbeafe]"><p className="absolute left-[10px] top-[18px] h-[34px] w-[150px] text-[10px] font-semibold leading-[26px] text-[#0b1f1a]">Need help identifying the issue?</p><p className="absolute left-[12px] top-[49px] h-[75px] w-[159px] text-[8px] font-normal leading-[19px] text-[#0b1f1a]">Ask the KlinGhana assistant about sorting, bin status or what to include in your report.</p><a href="#/admin/ai" className="figma-button-hit absolute left-[25px] top-[114px] h-[45px] w-[135px] rounded-[10px] bg-black text-white"><span className="absolute left-[41px] top-[13px] text-[16px] font-semibold leading-[17px]">Ask</span><Bot className="absolute left-[76px] top-[8px] h-[15px] w-[15px]" /></a></div>
    </main>
  );
};
