import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { ConnectionModal } from './components/ConnectionModal';
import { QRScannerModal } from './components/QRScannerModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AcessoBloqueadoView } from './components/AcessoBloqueadoView';
import { DashboardView } from './components/views/DashboardView';
import { EquipamentosView } from './components/views/EquipamentosView';
import { NovaSaidaView } from './components/views/NovaSaidaView';
import { EmCampoView } from './components/views/EmCampoView';
import { DevolucaoView } from './components/views/DevolucaoView';
import { KitsView } from './components/views/KitsView';
import { ManutencaoView } from './components/views/ManutencaoView';
import { HistoricoView } from './components/views/HistoricoView';
import { ConfiguracaoView } from './components/views/ConfiguracaoView';
import { UsuariosView } from './components/views/UsuariosView';

const MainLayout: React.FC = () => {
  const { activeView, authValidation } = useApp();

  if (authValidation.status !== 'AUTHORIZED') {
    return <AcessoBloqueadoView motivo={authValidation.motivo} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white font-sans antialiased">
      <Navbar />
      <BottomNav />
      <main className="flex-1 w-full min-w-0 overflow-x-hidden pb-24 lg:pb-0">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'equipamentos' && <EquipamentosView />}
        {activeView === 'nova-saida' && <NovaSaidaView />}
        {activeView === 'em-campo' && <EmCampoView />}
        {activeView === 'devolucao' && <DevolucaoView />}
        {activeView === 'kits' && <KitsView />}
        {activeView === 'manutencao' && <ManutencaoView />}
        {activeView === 'historico' && <HistoricoView />}
        {activeView === 'usuarios' && <UsuariosView />}
        {activeView === 'configuracao' && <ConfiguracaoView />}
      </main>
      <ConnectionModal />
      <QRScannerModal />
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
