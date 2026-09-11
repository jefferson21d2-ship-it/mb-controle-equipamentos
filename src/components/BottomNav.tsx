import React from 'react';
import {
  LayoutDashboard,
  Box,
  PlusCircle,
  Truck,
  RotateCcw,
  Wrench,
  History,
  Settings,
  Layers,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppView } from '../types';

interface NavItem {
  id: AppView;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const BottomNav: React.FC = () => {
  const { activeView, setActiveView, db, permissions } = useApp();

  const emCampoCount = db.equipamentos.filter(
    (e) => e.status === 'EM CAMPO' || e.status === 'Em Campo'
  ).length;

  const manutencaoCount = db.equipamentos.filter(
    (e) =>
      e.status === 'MANUTENÇÃO' ||
      e.status === 'Manutenção' ||
      e.status === 'Calibração'
  ).length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Início', icon: LayoutDashboard },
    { id: 'equipamentos', label: 'Equipamentos', shortLabel: 'Equip.', icon: Box },
    { id: 'nova-saida', label: 'Nova Saída', shortLabel: 'Saída', icon: PlusCircle },
    { id: 'em-campo', label: 'Em Campo', shortLabel: 'Campo', icon: Truck, badge: emCampoCount },
    { id: 'devolucao', label: 'Devolução', shortLabel: 'Devolver', icon: RotateCcw },
    { id: 'kits', label: 'Kits', shortLabel: 'Kits', icon: Layers },
    { id: 'manutencao', label: 'Manutenção', shortLabel: 'Manut.', icon: Wrench, badge: manutencaoCount },
    { id: 'historico', label: 'Histórico', shortLabel: 'Hist.', icon: History },
    ...(permissions.canAdministrarUsuarios
      ? [{ id: 'usuarios' as AppView, label: 'Usuários (RBAC)', shortLabel: 'Usuários', icon: Users }]
      : []),
    { id: 'configuracao', label: 'Google Sheets', shortLabel: 'Planilha', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Horizontal Navigation */}
      <nav className="hidden lg:block bg-slate-900/90 border-b border-slate-800 sticky top-16 z-30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white text-blue-700' : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Sticky Bottom Bar (Thumb-optimized for Android / iPhone) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur border-t border-slate-800 pb-safe">
        <div className="grid grid-cols-6 items-stretch px-1 py-1 max-w-lg mx-auto">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex min-w-0 flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all relative ${
                  isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 bg-blue-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-slate-900">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="block max-w-full truncate text-[10px] leading-3 tracking-tight mt-1">{item.shortLabel}</span>
              </button>
            );
          })}

          {/* Botão para Kits & Mais no Mobile */}
          <button
            onClick={() => {
              if (activeView === 'kits') setActiveView('manutencao');
              else if (activeView === 'manutencao') setActiveView('historico');
              else if (activeView === 'historico') setActiveView('configuracao');
              else setActiveView('kits');
            }}
            className={`flex min-w-0 flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all relative ${
              activeView === 'kits' || activeView === 'manutencao' || activeView === 'historico' || activeView === 'configuracao'
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Layers className="w-5 h-5" />
              {manutencaoCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-slate-900">
                  {manutencaoCount}
                </span>
              )}
            </div>
            <span className="block max-w-full truncate text-[10px] leading-3 tracking-tight mt-1">
              {activeView === 'kits'
                ? 'Kits'
                : activeView === 'manutencao'
                ? 'Manut.'
                : activeView === 'historico'
                ? 'Hist.'
                : activeView === 'configuracao'
                ? 'Planilha'
                : 'Mais'}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
