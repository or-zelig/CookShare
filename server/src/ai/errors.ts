export class AiAppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export class AiValidationError extends AiAppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "invalid_body", details);
  }
}

export class AiLowConfidenceError extends AiAppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, "low_confidence", details);
  }
}

export class AiRateLimitError extends AiAppError {
  constructor(message = "AI rate limit exceeded") {
    super(message, 429, "rate_limit_exceeded");
  }
}

export class AiProviderError extends AiAppError {
  constructor(message: string, details?: unknown) {
    super(message, 503, "provider_unavailable", details);
  }
}
