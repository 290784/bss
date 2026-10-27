/** Erro de regra de negócio: a mensagem é segura para exibir ao usuário. */
export class DomainError extends Error {
  constructor(message: string, public readonly code: string = "domain_error") {
    super(message);
    this.name = "DomainError";
  }
}

export type ActionState<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> }
  | null;
