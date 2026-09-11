import React, { useState } from 'react';
import {
  Compass,
  BatteryCharging,
  Radio,
  Navigation,
  Disc,
  Layers,
  Cpu,
  Zap,
} from 'lucide-react';
import { Equipamento } from '../types';

interface EquipamentoImageProps {
  equipamento: Equipamento;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'detail';
  forceMode?: 'auto' | 'real' | 'modelo';
  showBadge?: boolean;
}

export const EquipamentoImage: React.FC<EquipamentoImageProps> = ({
  equipamento,
  className = '',
  size = 'md',
  forceMode = 'auto',
  showBadge = true,
}) => {
  const [imgError, setImgError] = useState(false);

  // 1. Foto do Equipamento real (Google Drive ou câmera)
  const hasRealPhoto = Boolean(equipamento.fotoUrl && !imgError);

  // 2. Imagem Modelo (URL fonte ou referência de catálogo)
  const modelUrl =
    equipamento.urlFonteImagem && equipamento.urlFonteImagem.startsWith('http')
      ? equipamento.urlFonteImagem
      : undefined;

  const hasModelPhoto = Boolean(modelUrl && !imgError);

  // Determina URL com base na prioridade: Foto Real SEMPRE tem prioridade sobre Imagem Modelo
  let displayUrl: string | null = null;
  let isDisplayingReal = false;

  if (forceMode === 'real') {
    displayUrl = hasRealPhoto ? (equipamento.fotoUrl || null) : null;
    isDisplayingReal = true;
  } else if (forceMode === 'modelo') {
    displayUrl = hasModelPhoto ? (modelUrl || null) : null;
    isDisplayingReal = false;
  } else {
    // Modo auto: prioridade absoluta para a fotografia real
    if (hasRealPhoto) {
      displayUrl = equipamento.fotoUrl || null;
      isDisplayingReal = true;
    } else if (hasModelPhoto) {
      displayUrl = modelUrl || null;
      isDisplayingReal = false;
    }
  }

  // Placeholder icon & color scheme by category
  const getCategoryConfig = (categoria?: string) => {
    const cat = (categoria || '').toLowerCase();
    if (cat.includes('drone')) {
      return {
        icon: Navigation,
        bgGradient: 'from-blue-950/60 via-slate-900 to-slate-900',
        borderColor: 'border-blue-800/40',
        iconColor: 'text-blue-400',
        tag: 'DRONE RTK',
      };
    }
    if (cat.includes('bateria')) {
      return {
        icon: Zap,
        bgGradient: 'from-emerald-950/60 via-slate-900 to-slate-900',
        borderColor: 'border-emerald-800/40',
        iconColor: 'text-emerald-400',
        tag: 'BATERIA INTELIGENTE',
      };
    }
    if (cat.includes('carregador')) {
      return {
        icon: BatteryCharging,
        bgGradient: 'from-cyan-950/60 via-slate-900 to-slate-900',
        borderColor: 'border-cyan-800/40',
        iconColor: 'text-cyan-400',
        tag: 'ESTAÇÃO DE CARGA',
      };
    }
    if (cat.includes('gnss')) {
      return {
        icon: Radio,
        bgGradient: 'from-indigo-950/60 via-slate-900 to-slate-900',
        borderColor: 'border-indigo-800/40',
        iconColor: 'text-indigo-400',
        tag: 'RECEPTOR GNSS',
      };
    }
    if (cat.includes('trip')) {
      return {
        icon: Disc,
        bgGradient: 'from-amber-950/60 via-slate-900 to-slate-900',
        borderColor: 'border-amber-800/40',
        iconColor: 'text-amber-400',
        tag: 'TRIPÉ TOPOGRÁFICO',
      };
    }
    if (cat.includes('bast')) {
      return {
        icon: Layers,
        bgGradient: 'from-violet-950/60 via-slate-900 to-slate-900',
        borderColor: 'border-violet-800/40',
        iconColor: 'text-violet-400',
        tag: 'BASTÃO GRADUADO',
      };
    }
    return {
      icon: Cpu,
      bgGradient: 'from-slate-800/60 via-slate-900 to-slate-900',
      borderColor: 'border-slate-700/50',
      iconColor: 'text-slate-400',
      tag: 'EQUIPAMENTO M&B',
    };
  };

  const catConfig = getCategoryConfig(equipamento.categoria);
  const IconComponent = catConfig.icon;

  if (displayUrl) {
    return (
      <div
        className={`relative overflow-hidden bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center p-2 group ${className}`}
      >
        <img
          src={displayUrl}
          alt={equipamento.nome}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain max-h-full transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* Subtle source indicator badge */}
        {showBadge && (
          <span
            className={`absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold border backdrop-blur-sm pointer-events-none ${
              isDisplayingReal
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80'
                : 'bg-blue-950/90 text-blue-300 border-blue-700/80'
            }`}
          >
            {isDisplayingReal ? '📸 Foto Real' : '📘 Imagem Modelo'}
          </span>
        )}
      </div>
    );
  }

  // Professional Technical Placeholder
  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${catConfig.borderColor} bg-gradient-to-br ${catConfig.bgGradient} flex flex-col items-center justify-center p-3 select-none ${className}`}
    >
      {/* Background blueprint tech grid */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-1">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-center shadow-inner">
          <IconComponent className={`w-5 h-5 sm:w-6 sm:h-6 ${catConfig.iconColor}`} />
        </div>
        <span className="font-mono text-[9px] font-bold tracking-wider text-slate-400 uppercase">
          {catConfig.tag}
        </span>
        <span className="font-mono text-[10px] font-bold text-slate-300">
          {equipamento.codigo}
        </span>
      </div>

      <span className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-medium bg-slate-950/70 text-slate-400 border border-slate-800/80">
        Placeholder Técnico
      </span>
    </div>
  );
};
