import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Download, CheckCircle2, QrCode as QrCodeIcon } from 'lucide-react';
import { SmartBin } from '../../types';

interface BinQrModalProps {
  bin: SmartBin;
  onClose: () => void;
}

/**
 * Generates the printable citizen-facing QR code for one physical bin
 * (destination: #/bin/<code>, see BinAccessView) — completes the QR-access
 * feature by giving admins something to actually put on a sticker.
 */
export const BinQrModal: React.FC<BinQrModalProps> = ({ bin, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const targetUrl = `${window.location.origin}${window.location.pathname}#/bin/${bin.code}`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(targetUrl, { width: 480, margin: 2, color: { dark: '#0F172A', light: '#FFFFFF' } })
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) setQrDataUrl(null); });
    return () => { cancelled = true; };
  }, [targetUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the URL is still shown as selectable text.
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <QrCodeIcon className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-['Outfit',sans-serif] text-base font-bold text-slate-900">Citizen QR code</h3>
              <p className="text-[11px] text-slate-500">{bin.code} · {bin.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-5">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR code linking to ${targetUrl}`} className="h-48 w-48 rounded-xl" />
          ) : (
            <div className="h-48 w-48 animate-pulse rounded-xl bg-slate-200" />
          )}
        </div>

        <p className="mt-3 text-center text-[11px] text-slate-500">
          Print this on a sticker for the physical bin. Scanning it takes citizens straight to {bin.code}'s live status and a one-tap report form.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <code className="flex-1 truncate text-[11px] text-slate-600">{targetUrl}</code>
          <button type="button" onClick={handleCopy} className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800" title="Copy link">
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        <a
          href={qrDataUrl || undefined}
          download={`klinghana-${bin.code}-qr.png`}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            qrDataUrl ? 'bg-[#1D70F5] text-white hover:bg-blue-600 shadow-md shadow-blue-500/20' : 'bg-slate-100 text-slate-400 pointer-events-none'
          }`}
        >
          <Download className="h-3.5 w-3.5" />
          Download PNG
        </a>
      </div>
    </div>
  );
};
