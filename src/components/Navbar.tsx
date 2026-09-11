import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  QrCode,
  RefreshCw,
  Sheet,
  CheckCircle2,
  AlertCircle,
  HardHat,
  ShieldCheck,
  ChevronDown,
  Users,
  LogOut,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PWAInstallButton } from './PWAInstallButton';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    permissions,
    isConnected,
    isSyncing,
    lastSyncTime,
    setConnectionModalOpen,
    openQrScanner,
    syncWithGoogleSheets,
    setActiveView,
    db,
    loginWithGoogleEmail,
    logout,
  } = useApp();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = permissions.isAdmin;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo e Nome Corporativo */}
          <div
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Compass className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-lg text-white">M&B</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 font-semibold border border-blue-800/50">
                  TOPOGRAFIA & DRONES
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Controle de Equipamentos</p>
            </div>
          </div>

          {/* Ações de Topo */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Status do Google Sheets */}
            <button
              onClick={() => setConnectionModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isConnected
                  ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300 hover:bg-emerald-900/80'
                  : 'bg-amber-950/60 border-amber-800/80 text-amber-300 hover:bg-amber-900/70'
              }`}
              title={isConnected ? 'Conectado ao Google Sheets' : 'Conectar ao Google Sheets'}
            >
              <Sheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isConnected ? 'Google Sheets Conectado' : 'Conectar Planilha'}
              </span>
              <span className="sm:hidden">
                {isConnected ? 'Conectado' : 'Conectar'}
              </span>
              {isConnected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>

            {/* Sincronizar Rápido */}
            {isConnected && (
              <button
                onClick={() => syncWithGoogleSheets()}
                disabled={isSyncing}
                aria-label="Sincronizar com Google Sheets"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                title={`Última sincronização: ${lastSyncTime || 'Nunca'}`}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            )}

            {/* Botão de Instalação PWA */}
            <PWAInstallButton />

            {/* Leitor de QR Code */}
            <button
              onClick={() => openQrScanner({ mode: 'lookup' })}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden md:inline">Ler QR Code</span>
              <span className="md:hidden">QR</span>
            </button>

            {/* Perfil Google Workspace com Dropdown de Governança / RBAC */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 pl-2 border-l border-slate-800 text-xs hover:bg-slate-800/60 p-1.5 rounded-xl transition-colors"
                title="Perfil Google Workspace Conectado"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    isAdmin
                      ? 'bg-purple-950 text-purple-300 border border-purple-800'
                      : 'bg-blue-950 text-blue-400 border border-blue-800'
                  }`}
                >
                  {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <HardHat className="w-4 h-4" />}
                </div>
                <div className="text-left leading-tight hidden lg:block">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-slate-200 truncate max-w-[120px]">
                      {currentUser?.nome || 'Operador'}
                    </p>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        isAdmin
                          ? 'bg-purple-900/60 text-purple-300 border border-purple-800'
                          : 'bg-blue-900/60 text-blue-300 border border-blue-800'
                      }`}
                    >
                      {currentUser?.perfil || 'Operador'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate max-w-[130px] font-mono">
                    {currentUser?.email || 'operador@mb.com.br'}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
              </button>

              {/* Menu Dropdown de Gestão de Usuários e Troca de Perfil */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 space-y-3 animate-fadeIn">
                  <div className="border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          isAdmin
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}
                      >
                        {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <HardHat className="w-5 h-5" />}
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-white text-xs truncate">{currentUser?.nome}</p>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{currentUser?.email}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] bg-slate-950 p-2 rounded-xl border border-slate-850">
                      <span className="text-slate-400">Perfil de Acesso:</span>
                      <strong className={isAdmin ? 'text-purple-300' : 'text-blue-300'}>
                        {currentUser?.perfil}
                      </strong>
                    </div>
                  </div>

                  {/* Ações Administrativas */}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setActiveView('usuarios');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800 text-purple-200 text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Gerenciar Usuários & Permissões
                    </button>
                  )}

                  {/* Alternador Rápido de Contas Autorizadas */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Alternar Conta Google Conectada:
                    </span>
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                      {db.usuarios.map((u) => {
                        const isCurrent = u.email.toLowerCase() === currentUser?.email?.toLowerCase();
                        return (
                          <button
                            key={u.id}
                            onClick={() => {
                              loginWithGoogleEmail(u.email);
                              setProfileDropdownOpen(false);
                            }}
                            className={`w-full text-left p-1.5 rounded-lg text-[11px] transition-all flex items-center justify-between ${
                              isCurrent
                                ? 'bg-blue-950 border border-blue-800 text-white font-bold'
                                : 'hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            <span className="truncate max-w-[160px]">{u.nome}</span>
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded ${
                                u.perfil === 'Administrador'
                                  ? 'text-purple-300 bg-purple-950'
                                  : 'text-blue-300 bg-blue-950'
                              }`}
                            >
                              {u.perfil === 'Administrador' ? 'Admin' : 'Oper.'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sair */}
                  <div className="pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        logout();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 p-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Desconectar Sessão
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
