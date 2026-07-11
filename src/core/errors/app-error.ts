/**
 * Normalised application error taxonomy.
 *
 * Providers throw provider-specific errors; the repository layer maps them into
 * these stable, user-safe categories. UI never renders raw provider errors —
 * it renders `AppError.userMessage` (Spanish, non-technical).
 */
export type AppErrorCode =
  | 'network'
  | 'timeout'
  | 'not_found'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'conflict'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'unknown';

const DEFAULT_MESSAGES: Record<AppErrorCode, string> = {
  network: 'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.',
  timeout: 'La operación tardó demasiado. Por favor, inténtalo de nuevo.',
  not_found: 'No encontramos lo que buscabas.',
  validation: 'Revisa la información ingresada e inténtalo de nuevo.',
  unauthorized: 'Tu sesión no es válida o expiró. Inicia sesión nuevamente.',
  forbidden: 'No tienes permiso para realizar esta acción.',
  conflict: 'Esta acción ya fue realizada o entra en conflicto con datos existentes.',
  rate_limited: 'Demasiados intentos. Espera un momento antes de volver a intentar.',
  provider_unavailable:
    'El servicio no está disponible temporalmente. Inténtalo de nuevo en unos minutos.',
  unknown: 'Ocurrió un problema inesperado. Inténtalo de nuevo.',
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly userMessage: string;
  readonly retryable: boolean;
  override readonly cause?: unknown;

  constructor(
    code: AppErrorCode,
    options?: { userMessage?: string; retryable?: boolean; cause?: unknown; message?: string },
  ) {
    super(options?.message ?? code);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = options?.userMessage ?? DEFAULT_MESSAGES[code];
    this.retryable =
      options?.retryable ?? ['network', 'timeout', 'provider_unavailable'].includes(code);
    this.cause = options?.cause;
  }

  static from(error: unknown): AppError {
    if (error instanceof AppError) return error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      return new AppError('timeout', { cause: error });
    }
    if (error instanceof TypeError && /fetch/i.test(error.message)) {
      return new AppError('network', { cause: error });
    }
    return new AppError('unknown', { cause: error });
  }
}
