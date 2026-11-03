import type { BrowserContext, Route } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';

type MyAccountResponse = components['schemas']['MyAccountResponse'];

const sessionCookie = 'afj-session';
const minimumPasswordLength = 10;
const maxFailedAttempts = 5;

type Credentials = { email: string; password: string };

/** Role of an account (ADR 0008), with the capabilities /me publishes for it. */
export type Role = 'user' | 'validator' | 'administrator';

const capabilitiesOf: Record<Role, string[]> = {
  user: ['propose'],
  validator: ['propose', 'validate-proposals'],
  administrator: ['propose', 'validate-proposals', 'manage-roles'],
};

export type Account = Credentials & { role: Role };

/**
 * Simulated identity API (ADR 0006): accounts, session cookies, lock-out, outages. Its answers mirror
 * ASP.NET Core Identity (DuplicateEmail, PasswordTooShort, detail "LockedOut"), pinned by AcroFunJam.Api.Tests.
 * Installed on the browser context so that several tabs share it, with the cookies and the storage.
 */
export class IdentityApi {
  private readonly accounts = new Map<string, Account>();
  private readonly failures = new Map<string, number>();
  private readonly sessions = new Map<string, string>();
  private unreachable = false;
  readonly requests: string[] = [];
  /** Credentials of the people of the scenario (Alice…), to sign them in again. */
  readonly people = new Map<string, Credentials>();

  constructor(private readonly context: BrowserContext) {}

  addAccount(email: string, password: string, role: Role = 'user'): void {
    this.accounts.set(email.toLowerCase(), { email, password, role });
  }

  get isUnreachable(): boolean {
    return this.unreachable;
  }

  /** The account whose session cookie the request carries, or undefined (visitor, expired session). */
  accountOf(route: Route): Account | undefined {
    const id = this.sessionIdOf(route);
    const email = id ? this.sessions.get(id) : undefined;
    return email ? this.accounts.get(email.toLowerCase()) : undefined;
  }

  failSignIns(email: string, attempts: number): void {
    this.failures.set(email.toLowerCase(), attempts);
  }

  setUnreachable(unreachable: boolean): void {
    this.unreachable = unreachable;
  }

  /** The session ends on the server side; the browser still holds its (now useless) cookie. */
  expireSessionsOf(email: string): void {
    for (const [id, owner] of this.sessions)
      if (owner.toLowerCase() === email.toLowerCase()) {
        this.sessions.delete(id);
        this.expired.set(id, owner);
      }
  }

  private readonly expired = new Map<string, string>();

  /** Sessions expired by the scenario become valid again (see beforeTheIncidents); returns them. */
  restoreExpiredSessions(): Map<string, string> {
    const restored = new Map(this.expired);
    for (const [id, owner] of restored) this.sessions.set(id, owner);
    this.expired.clear();
    return restored;
  }

  expireSessions(sessions: Map<string, string>): void {
    for (const [id, owner] of sessions) {
      this.sessions.delete(id);
      this.expired.set(id, owner);
    }
  }

  async start(): Promise<void> {
    await this.context.route('**/identity/register', (route) =>
      this.handle(route, () => this.register(route)),
    );
    await this.context.route('**/identity/login**', (route) => this.handle(route, () => this.login(route)));
    await this.context.route('**/identity/logout', (route) => this.handle(route, () => this.logout(route)));
    await this.context.route('**/me', (route) => this.handle(route, () => this.me(route)));
  }

  private async handle(route: Route, answer: () => Promise<void>): Promise<void> {
    this.requests.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
    if (this.unreachable) return route.abort('connectionrefused');
    return answer();
  }

  private async register(route: Route): Promise<void> {
    const { email, password } = route.request().postDataJSON() as Credentials;
    if (this.accounts.has(email.toLowerCase())) return this.validationProblem(route, 'DuplicateEmail');
    if (password.length < minimumPasswordLength) return this.validationProblem(route, 'PasswordTooShort');
    this.addAccount(email, password);
    return route.fulfill({ status: 200 });
  }

  private async login(route: Route): Promise<void> {
    const { email, password } = route.request().postDataJSON() as Credentials;
    const key = email.toLowerCase();
    const account = this.accounts.get(key);
    // Like ASP.NET Core Identity: only existing accounts are locked out.
    if (account && (this.failures.get(key) ?? 0) >= maxFailedAttempts)
      return this.unauthorized(route, 'LockedOut');
    if (!account || account.password !== password) {
      if (account) this.failures.set(key, (this.failures.get(key) ?? 0) + 1);
      return this.unauthorized(route, 'Failed');
    }

    const id = crypto.randomUUID();
    this.sessions.set(id, account.email);
    await this.context.addCookies([
      {
        name: sessionCookie,
        value: id,
        url: new URL(route.request().url()).origin,
        httpOnly: true,
        sameSite: 'Strict',
      },
    ]);
    return route.fulfill({ status: 200, json: {} });
  }

  private async logout(route: Route): Promise<void> {
    const id = this.sessionIdOf(route);
    if (id) this.sessions.delete(id);
    await this.context.clearCookies({ name: sessionCookie });
    return route.fulfill({ status: 204 });
  }

  private async me(route: Route): Promise<void> {
    const account = this.accountOf(route);
    if (!account) return route.fulfill({ status: 401 });
    const body: MyAccountResponse = {
      email: account.email,
      role: account.role,
      capabilities: capabilitiesOf[account.role],
    };
    return route.fulfill({ status: 200, json: body });
  }

  private sessionIdOf(route: Route): string | undefined {
    const cookies = route.request().headers()['cookie'] ?? '';
    return cookies
      .split(';')
      .map((part) => part.trim().split('='))
      .find(([name]) => name === sessionCookie)?.[1];
  }

  private validationProblem(route: Route, key: string) {
    return route.fulfill({
      status: 400,
      json: { title: 'One or more validation errors occurred.', status: 400, errors: { [key]: ['…'] } },
    });
  }

  private unauthorized(route: Route, detail: string) {
    return route.fulfill({ status: 401, json: { title: 'Unauthorized', status: 401, detail } });
  }
}
