import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  HardHat,
  CheckCircle2,
  XCircle,
  Mail,
  Edit2,
  UserCheck,
  UserX,
  Search,
  Filter,
  Shield,
  KeyRound,
  History,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Usuario } from '../../types';

export const UsuariosView: React.FC = () => {
  const { db, currentUser, permissions, salvarUsuario, alternarStatusUsuario, loginWithGoogleEmail } = useApp();

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'Administrador' | 'Operador'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);

  // Formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState('');
  const [perfil, setPerfil] = useState<'Administrador' | 'Operador'>('Operador');
  const [ativo, setAtivo] = useState(true);

  if (!permissions.canAdministrarUsuarios) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 mx-auto flex items-center justify-center">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">Acesso Restrito a Administradores</h2>
        <p className="text-xs text-slate-400">
          O perfil de Operador não tem permissão para gerenciar contas de usuários e permissões da M&B.
        </p>
      </div>
    );
  }

  const handleOpenAdd = () => {
    setEditingUser(null);
    setNome('');
    setEmail('');
    setCargo('Operador Técnico de Campo');
    setPerfil('Operador');
    setAtivo(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (user: Usuario) => {
    setEditingUser(user);
    setNome(user.nome);
    setEmail(user.email);
    setCargo(user.cargo);
    setPerfil(user.perfil === 'Administrador' ? 'Administrador' : 'Operador');
    setAtivo(user.ativo);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      alert('Informe o nome e o e-mail Google Workspace do colaborador.');
      return;
    }

    const payload: Usuario = {
      id: editingUser ? editingUser.id : `usr-${Date.now()}`,
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      cargo: cargo.trim() || 'Colaborador M&B',
      perfil,
      ativo,
    };

    await salvarUsuario(payload);
    setModalOpen(false);
  };

  const filteredUsuarios = db.usuarios.filter((u) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      u.nome.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.cargo.toLowerCase().includes(q);

    const matchRole = filterRole === 'all' || u.perfil === filterRole;

    return matchSearch && matchRole;
  });

  const totalAdmins = db.usuarios.filter((u) => u.perfil === 'Administrador').length;
  const totalOperadores = db.usuarios.filter((u) => u.perfil === 'Operador').length;
  const totalAtivos = db.usuarios.filter((u) => u.ativo).length;

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-800 text-purple-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Gestão de Usuários e Permissões (RBAC)
            </h1>
            <p className="text-xs text-slate-400">
              Controle de acesso por conta Google Workspace. Sem senhas armazenadas no Google Sheets.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Cadastrar Novo Usuário
        </button>
      </div>

      {/* Métricas e Governança */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Total Cadastrado</span>
          <p className="text-xl font-bold text-white">{db.usuarios.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
          <span className="text-[11px] text-purple-400 font-medium">Administradores</span>
          <p className="text-xl font-bold text-purple-300">{totalAdmins}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
          <span className="text-[11px] text-blue-400 font-medium">Operadores</span>
          <p className="text-xl font-bold text-blue-300">{totalOperadores}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
          <span className="text-[11px] text-emerald-400 font-medium">Usuários Ativos</span>
          <p className="text-xl font-bold text-emerald-300">
            {totalAtivos} <span className="text-xs text-slate-500 font-normal">/ {db.usuarios.length}</span>
          </p>
        </div>
      </div>

      {/* Regras e Notificação de Permissões */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 text-xs space-y-2 text-slate-300">
        <h3 className="font-bold text-white flex items-center gap-1.5 text-xs">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          Matriz de Segurança da M&B:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-400">
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <strong className="text-purple-300 block mb-0.5">ADMINISTRADOR:</strong>
            Acesso total, cadastro/edição de patrimônio, gestão de usuários, kits e obras, visualização do histórico e correções autorizadas.
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <strong className="text-blue-300 block mb-0.5">OPERADOR:</strong>
            Consulta equipamentos, saída por QR, checklist, devolução com avaria e abertura de manutenção. <em>Não pode excluir ativos, alterar UUID, apagar saídas ou alterar histórico concluído.</em>
          </div>
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail Google ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterRole('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              filterRole === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Todos ({db.usuarios.length})
          </button>
          <button
            onClick={() => setFilterRole('Administrador')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              filterRole === 'Administrador'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Admins ({totalAdmins})
          </button>
          <button
            onClick={() => setFilterRole('Operador')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              filterRole === 'Operador'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Operadores ({totalOperadores})
          </button>
        </div>
      </div>

      {/* Lista de Usuários */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsuarios.map((user) => {
          const isCurrentUser = currentUser?.id === user.id || currentUser?.email === user.email;
          const isAdmin = user.perfil === 'Administrador';

          return (
            <div
              key={user.id}
              className={`bg-slate-900 border rounded-2xl p-4 space-y-3 flex flex-col justify-between transition-all ${
                isCurrentUser
                  ? 'border-purple-500/80 shadow-lg shadow-purple-950/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                        isAdmin
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}
                    >
                      {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <HardHat className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white line-clamp-1 flex items-center gap-1.5">
                        {user.nome}
                        {isCurrentUser && (
                          <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.2 rounded">
                            Você
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-400">{user.cargo}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      user.ativo
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {user.ativo ? 'Ativo' : 'Bloqueado'}
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 space-y-1 text-[11px]">
                  <p className="flex items-center gap-1.5 text-slate-300 font-mono">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </p>
                  <p className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-900 text-[10px]">
                    <span>Perfil de Acesso:</span>
                    <strong
                      className={isAdmin ? 'text-purple-300' : 'text-blue-300'}
                    >
                      {user.perfil}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Ações Administrativas */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(user)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                    title="Editar Perfil"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => alternarStatusUsuario(user.id)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      user.ativo
                        ? 'bg-rose-950/50 border-rose-900 text-rose-400 hover:bg-rose-900/60'
                        : 'bg-emerald-950/50 border-emerald-900 text-emerald-400 hover:bg-emerald-900/60'
                    }`}
                    title={user.ativo ? 'Bloquear Acesso' : 'Desbloquear Acesso'}
                  >
                    {user.ativo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {!isCurrentUser && (
                  <button
                    onClick={() => loginWithGoogleEmail(user.email)}
                    className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                  >
                    Simular Perfil
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Adicionar / Editar Usuário */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                {editingUser ? 'Editar Usuário M&B' : 'Cadastrar Usuário Google Workspace'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Nome Completo <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  E-mail Google Workspace <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="usuario@mbtopografia.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Identificação automática via Google Workspace. Sem armazenamento de senhas.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Cargo / Função</label>
                <input
                  type="text"
                  placeholder="Ex: Piloto de Drone / Topógrafo"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Perfil de Acesso</label>
                  <select
                    value={perfil}
                    onChange={(e) => setPerfil(e.target.value as 'Administrador' | 'Operador')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
                  >
                    <option value="Operador">Operador</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Status da Conta</label>
                  <select
                    value={ativo ? 'true' : 'false'}
                    onChange={(e) => setAtivo(e.target.value === 'true')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
                  >
                    <option value="true">Ativo (Liberado)</option>
                    <option value="false">Inativo (Bloqueado)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
