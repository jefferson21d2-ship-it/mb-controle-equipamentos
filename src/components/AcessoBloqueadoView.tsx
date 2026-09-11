import React, { useState } from 'react';
import { AlertCircle, Compass, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { GoogleAuthService } from '../services/googleAuth';
import { Usuario } from '../types';

interface AcessoBloqueadoViewProps {
  motivo?: string;
}

/** Tela de entrada do modo local/offline. */
export const AcessoBloqueadoView: React.FC<AcessoBloqueadoViewProps> = ({ motivo }) => {
  const [username, setUsername] = useState(GoogleAuthService.getConfiguredUsername());
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSetup, setIsSetup] = useState(!GoogleAuthService.hasCredentials());
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    if (isSetup && password !== confirmPassword) {
      setIsSubmitting(false);
      setError('As senhas não conferem.');
      return;
    }
    const usuarios: Usuario[] = [
      {
        id: 'usr-admin-jefferson',
        nome: 'Administrador M&B',
        email: 'jefferson21D2@gmail.com',
        cargo: 'Administrador',
        perfil: 'Administrador',
        ativo: true,
      },
    ];
    const result = isSetup
      ? await GoogleAuthService.setupCredentials(username, password, usuarios)
      : await GoogleAuthService.authenticate(username, password, usuarios);
    setIsSubmitting(false);
    if (result.status !== 'AUTHORIZED') {
      setError(result.motivo || 'Usuário ou senha inválidos.');
      return;
    }
    window.location.reload();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
      <section className="w-full max-w-md space-y-5">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-950/40">
            <Compass className="w-9 h-9 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">M&B Controle de Equipamentos</h1>
            <p className="text-xs text-slate-400 mt-1">Acesso administrativo local</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-800 text-blue-300 flex items-center justify-center shrink-0">
              <LockKeyhole className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white">{isSetup ? 'Criar primeiro acesso' : 'Entrar no sistema'}</h2>
              <p className="text-xs text-slate-400 mt-1">
                {isSetup ? 'Defina o usuário e a senha deste dispositivo.' : 'A sessão local permanece ativa por 12 horas.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-xs font-semibold text-slate-300">
              Usuário
              <input
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-1.5 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                required
              />
            </label>

            {isSetup && (
              <label className="block text-xs font-semibold text-slate-300">
                Confirmar senha
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  required
                />
              </label>
            )}

            <label className="block text-xs font-semibold text-slate-300">
              Senha
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 pr-11 text-sm text-white outline-none focus:border-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            {(error || motivo) && (
              <div className="rounded-xl bg-rose-950/60 border border-rose-800 px-3 py-2.5 text-xs text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error || motivo}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 py-2.5 text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              {isSubmitting ? 'Validando…' : isSetup ? 'Criar acesso e entrar' : 'Entrar'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-amber-900/60 bg-amber-950/30 p-3.5 text-[11px] text-amber-200/90 flex gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <p>
            O acesso é gravado somente neste dispositivo. Como o GitHub Pages é estático, ele não substitui autenticação de servidor para proteger dados corporativos.
          </p>
        </div>
      </section>
    </main>
  );
};
