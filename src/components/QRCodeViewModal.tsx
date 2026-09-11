import React, { useEffect, useState } from 'react';
import {
  X,
  QrCode,
  Download,
  Copy,
  Check,
  Printer,
  ShieldCheck,
  ExternalLink,
  Layers,
  MapPin,
  User,
} from 'lucide-react';
import { Equipamento } from '../types';
import { generateEquipamentoQRCode } from '../utils/qrCodeGenerator';
import { EquipamentoImage } from './EquipamentoImage';

interface QRCodeViewModalProps {
  equipamento: Equipamento | null;
  onClose: () => void;
  onOpenPrintModal?: (equipamentoId: string) => void;
}

export const QRCodeViewModal: React.FC<QRCodeViewModalProps> = ({
  equipamento,
  onClose,
  onOpenPrintModal,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!equipamento) {
      setQrDataUrl('');
      return;
    }

    setLoading(true);
    // Conforme especificado: O conteúdo do QR Code é EXCLUSIVAMENTE o Código do Equipamento
    generateEquipamentoQRCode(equipamento.codigo, { width: 400, margin: 1 })
      .then((url) => {
        setQrDataUrl(url);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [equipamento]);

  if (!equipamento) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(equipamento.codigo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `QR_${equipamento.codigo}.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintSingle = () => {
    if (onOpenPrintModal) {
      onClose();
      onOpenPrintModal(equipamento.id);
    } else {
      window.print();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in"
    >
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Identificador Patrimonial
              </h3>
              <p className="font-mono text-sm font-bold text-white leading-tight">
                {equipamento.codigo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar visualização de QR Code"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-center">
          {/* Tag de identificação */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-950/80 text-blue-300 border border-blue-800">
              {equipamento.categoria}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {equipamento.status}
            </span>
          </div>

          <h2 className="text-base font-bold text-white leading-tight">
            {equipamento.nome}
          </h2>
          <p className="text-xs text-slate-400 -mt-2">
            {equipamento.marca || ''} {equipamento.modelo || equipamento.modeloNumero || ''}
          </p>

          {/* Cartão de Etiqueta Física Simulada com QR Code de Alta Resolução */}
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 text-slate-900 mx-auto max-w-[280px] flex flex-col items-center select-none">
            {/* Header da Etiqueta */}
            <div className="w-full border-b border-slate-300 pb-2 mb-2 flex items-center justify-between text-left">
              <div>
                <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase block">
                  M&B Topografia
                </span>
                <span className="text-[11px] font-bold text-slate-900 block truncate max-w-[170px]">
                  {equipamento.nome}
                </span>
              </div>
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            </div>

            {/* Imagem do QR Code puro */}
            <div className="w-44 h-44 bg-white p-1 flex items-center justify-center rounded-lg border border-slate-200/80 shadow-sm my-1">
              {loading ? (
                <div className="animate-pulse text-xs text-slate-400 font-mono">
                  Gerando QR...
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code para ${equipamento.codigo}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-rose-500">Erro ao renderizar</span>
              )}
            </div>

            {/* Código Grande em Monospace */}
            <div className="w-full pt-2 border-t border-slate-300 mt-2 text-center">
              <span className="font-mono text-base font-black tracking-widest text-slate-950 block">
                {equipamento.codigo}
              </span>
              {equipamento.numeroSerie && (
                <span className="font-mono text-[9px] text-slate-600 block mt-0.5">
                  S/N: {equipamento.numeroSerie}
                </span>
              )}
            </div>
          </div>

          {/* Nota técnica sobre o conteúdo do QR */}
          <p className="text-[11px] text-slate-400">
            Conteúdo exclusivo gravado no QR Code:{' '}
            <strong className="font-mono text-blue-300">{equipamento.codigo}</strong>
          </p>

          {/* Ações Rápidas da Etiqueta */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              onClick={handleCopy}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex flex-col items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span className="text-[10px]">{copied ? 'Copiado!' : 'Copiar Código'}</span>
            </button>

            <button
              onClick={handleDownloadPNG}
              disabled={!qrDataUrl}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex flex-col items-center gap-1 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span className="text-[10px]">Baixar PNG</span>
            </button>

            <button
              onClick={handlePrintSingle}
              className="px-2.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex flex-col items-center gap-1 transition-colors shadow"
            >
              <Printer className="w-4 h-4" />
              <span className="text-[10px]">Imprimir Etiqueta</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
