import { useState } from 'react';

export function PixPaymentInstructions({ pix }) {
  const [copied, setCopied] = useState(false);
  if (!pix?.qrCode && !pix?.qrCodeBase64 && !pix?.ticketUrl) return null;

  async function copyPix() {
    if (!pix?.qrCode) return;
    await navigator.clipboard?.writeText(pix.qrCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="rounded-[1.75rem] border border-lazule-gold/25 bg-slate-950/75 p-5 text-left shadow-2xl shadow-black/20">
      <p className="text-xs uppercase tracking-[0.26em] text-lazule-gold/80">Pix</p>
      <h2 className="mt-3 text-xl text-white">Use o Pix abaixo para confirmar sua seleção.</h2>
      <p className="mt-2 text-sm text-lazule-mist/70">Após o pagamento, a confirmação acontece automaticamente.</p>
      {pix.qrCodeBase64 && <img className="mx-auto mt-5 h-48 w-48 rounded-2xl border border-white/10 bg-white p-3" src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code Pix" />}
      {pix.qrCode && <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-lazule-mist/75 break-all">{pix.qrCode}</div>}
      <div className="mt-4 flex flex-wrap gap-3">
        {pix.qrCode && <button type="button" onClick={copyPix} className="rounded-full border border-lazule-gold/40 bg-lazule-gold/15 px-5 py-2 text-sm text-lazule-gold">{copied ? 'Copiado' : 'Copiar código Pix'}</button>}
        {pix.ticketUrl && <a href={pix.ticketUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-5 py-2 text-sm text-lazule-mist">Abrir instruções</a>}
      </div>
      {pix.expiresAt && <p className="mt-3 text-xs text-lazule-mist/55">Expira em {new Date(pix.expiresAt).toLocaleString('pt-BR')}.</p>}
    </section>
  );
}
