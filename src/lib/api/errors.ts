import type { ApiErrorBody } from '@/lib/types/whatsapp';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(`API ${status}: ${code}`);
    this.name = 'ApiError';
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    try {
      const body: ApiErrorBody = await res.json();
      const err = new ApiError(res.status, body.code ?? 'UNKNOWN', body.details);
      if (body.error) err.message = body.error;
      return err;
    } catch {
      return new ApiError(res.status, 'UNKNOWN');
    }
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isValidation() {
    return this.status === 422;
  }

  get isNotConnected() {
    return this.code === 'WA_NOT_CONNECTED';
  }

  get isMissingTenant() {
    return this.code === 'MISSING_TENANT_ID';
  }
}
