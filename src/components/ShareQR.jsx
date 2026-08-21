import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, QrCode, X } from 'lucide-react';

export default function ShareQR({ t }) {
  const [qr, setQr] = useState(false);
  const [copied, setCopied] = useState(false);
  // The QR/share link always points at the permanent public deployment, never
  // at localhost or a LAN address — a traveler's phone must be able to open it.
  const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || 'https://arman-chaudhury.github.io/tripcompare-nyc/';
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const url = PUBLIC_URL.replace(/\/?$/, '/') + search;

  const share = async () => {
    const data = { title: t('appName'), text: t('tagline'), url };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <>
      <div className="share-row">
        <button type="button" className="btn btn-ghost" onClick={share}>
          <Share2 size={16} aria-hidden="true" /> {copied ? t('copied') : t('share')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setQr(true)}>
          <QrCode size={16} aria-hidden="true" /> {t('qr')}
        </button>
      </div>
      {qr && (
        <div className="modal-backdrop" onClick={() => setQr(false)} role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-label={t('qr')} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" aria-label={t('close')} onClick={() => setQr(false)}>
              <X size={20} />
            </button>
            <h2 className="h2">{t('appName')}</h2>
            <div className="qr-wrap">
              <QRCodeSVG value={url} size={260} level="M" includeMargin bgColor="#ffffff" fgColor="#111111" />
            </div>
            <p className="muted">{t('qrHint')}</p>
            <p className="small url">{url}</p>
          </div>
        </div>
      )}
    </>
  );
}
