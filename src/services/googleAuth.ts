/**
 * Autenticação local do aplicativo.
 *
 * O GitHub Pages é uma hospedagem estática: não existe servidor confiável para
 * guardar senhas. Este módulo funciona como uma barreira local para o modo
 * offline. Para operação multiusuário, mantenha o Google Apps Script/Google
 * Sheets configurado ou substitua este módulo por um provedor com backend.
 */

import { Usuario } from '../types';

const STORAGE_KEY_AUTH = 'mb_local_session_v3';
const STORAGE_KEY_CREDENTIALS = 'mb_local_credentials_v1';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const configuredUsername = (import.meta.env.VITE_ADMIN_USERNAME || 'admin').trim();

export type AuthStatus =
  | 'AUTHORIZED'
  | 'BLOCKED_INACTIVE'
  | 'BLOCKED_UNREGISTERED'
  | 'UNAUTHENTICATED';

export interface AuthValidationResult {
  status: AuthStatus;
  user?: Usuario;
  email?: string;
  motivo?: string;
}

interface StoredSession {
  username: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

interface StoredCredentials {
  username: string;
  passwordHash: string;
}

const normalize = (value: string) => value.trim().toLowerCase();

const hashPassword = async (password: string): Promise<string> => {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export class GoogleAuthService {
  static getCurrentUser(): Usuario | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AUTH);
      if (!raw) return null;
      const session = JSON.parse(raw) as StoredSession;
      if (!session.expiresAt || session.expiresAt <= Date.now()) {
        this.logout();
        return null;
      }
      const cachedUser = localStorage.getItem(`${STORAGE_KEY_AUTH}:user`);
      return cachedUser ? (JSON.parse(cachedUser) as Usuario) : null;
    } catch (error) {
      console.warn('Sessão local inválida; iniciando sessão limpa.', error);
      this.logout();
      return null;
    }
  }

  /** Mantém compatibilidade com o contrato anterior do contexto. */
  static detectConnectedGoogleEmail(): string {
    return this.getCurrentUser()?.email || '';
  }

  static validateUserAccess(
    email: string,
    usuariosCadastrados: Usuario[],
  ): AuthValidationResult {
    if (!email) {
      return {
        status: 'UNAUTHENTICATED',
        motivo: 'Informe o usuário e a senha para iniciar uma sessão.',
      };
    }

    const activeSession = this.getCurrentUser();
    if (!activeSession || normalize(activeSession.email) !== normalize(email)) {
      return {
        status: 'UNAUTHENTICATED',
        email: normalize(email),
        motivo: 'A sessão expirou ou não foi iniciada. Faça login novamente.',
      };
    }

    const matched = usuariosCadastrados.find(
      (user) => normalize(user.email) === normalize(email),
    );

    if (!matched) {
      return {
        status: 'BLOCKED_UNREGISTERED',
        email: normalize(email),
        motivo: 'O usuário autenticado não possui cadastro ativo na base local da M&B.',
      };
    }

    if (!matched.ativo) {
      return {
        status: 'BLOCKED_INACTIVE',
        user: matched,
        email: normalize(email),
        motivo: 'O acesso deste usuário foi desativado pelo Administrador da M&B.',
      };
    }

    return { status: 'AUTHORIZED', user: matched, email: normalize(email) };
  }

  static hasCredentials(): boolean {
    return Boolean(localStorage.getItem(STORAGE_KEY_CREDENTIALS));
  }

  static getConfiguredUsername(): string {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CREDENTIALS);
      if (raw) return (JSON.parse(raw) as StoredCredentials).username || configuredUsername;
    } catch {
      // Recomeça com o usuário padrão de configuração.
    }
    return configuredUsername;
  }

  /** Cria o primeiro acesso local neste dispositivo e inicia uma sessão. */
  static async setupCredentials(
    username: string,
    password: string,
    usuariosCadastrados: Usuario[],
  ): Promise<AuthValidationResult> {
    const cleanUsername = username.trim();
    if (!cleanUsername || password.length < 8) {
      return {
        status: 'UNAUTHENTICATED',
        motivo: 'Informe um usuário e uma senha com pelo menos 8 caracteres.',
      };
    }

    const admin = usuariosCadastrados.find(
      (user) => user.perfil === 'Administrador' && user.ativo,
    );
    if (!admin) {
      return {
        status: 'BLOCKED_INACTIVE',
        motivo: 'Não existe um administrador ativo na base local.',
      };
    }

    localStorage.setItem(
      STORAGE_KEY_CREDENTIALS,
      JSON.stringify({ username: cleanUsername, passwordHash: await hashPassword(password) }),
    );
    return this.createSession(cleanUsername, admin);
  }

  /** Valida a credencial local e cria uma sessão de 12 horas. */
  static async authenticate(
    username: string,
    password: string,
    usuariosCadastrados: Usuario[],
  ): Promise<AuthValidationResult> {
    const cleanUsername = username.trim();
    const admin = usuariosCadastrados.find(
      (user) => user.perfil === 'Administrador' && user.ativo,
    );

    let credentials: StoredCredentials | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CREDENTIALS);
      credentials = raw ? (JSON.parse(raw) as StoredCredentials) : null;
    } catch {
      credentials = null;
    }

    if (!credentials) {
      return {
        status: 'UNAUTHENTICATED',
        motivo: 'Este dispositivo ainda não foi configurado. Crie o primeiro acesso.',
      };
    }

    if (
      !cleanUsername ||
      cleanUsername !== credentials.username ||
      (await hashPassword(password)) !== credentials.passwordHash
    ) {
      return { status: 'UNAUTHENTICATED', motivo: 'Usuário ou senha inválidos.' };
    }

    if (!admin) {
      return {
        status: 'BLOCKED_INACTIVE',
        motivo: 'Não existe um administrador ativo na base local.',
      };
    }

    return this.createSession(cleanUsername, admin);
  }

  private static createSession(username: string, admin: Usuario): AuthValidationResult {
    const now = Date.now();
    const session: StoredSession = {
      username,
      userId: admin.id,
      createdAt: now,
      expiresAt: now + SESSION_DURATION_MS,
    };

    try {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(session));
      localStorage.setItem(`${STORAGE_KEY_AUTH}:user`, JSON.stringify(admin));
    } catch {
      return {
        status: 'UNAUTHENTICATED',
        motivo: 'Não foi possível salvar a sessão neste navegador.',
      };
    }

    return { status: 'AUTHORIZED', user: admin, email: admin.email };
  }

  static setCurrentUser(user: Usuario): void {
    const now = Date.now();
    const session: StoredSession = {
      username: this.getConfiguredUsername(),
      userId: user.id,
      createdAt: now,
      expiresAt: now + SESSION_DURATION_MS,
    };
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(session));
    localStorage.setItem(`${STORAGE_KEY_AUTH}:user`, JSON.stringify(user));
  }

  static logout(): void {
    localStorage.removeItem(STORAGE_KEY_AUTH);
    localStorage.removeItem(`${STORAGE_KEY_AUTH}:user`);
  }

  /** Mantido somente para evitar quebra de integrações antigas; não autentica. */
  static switchConnectedEmail(_newEmail?: string): void {
    this.logout();
  }

  static getSessionExpiry(): number | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AUTH);
      return raw ? (JSON.parse(raw) as StoredSession).expiresAt : null;
    } catch {
      return null;
    }
  }
}
