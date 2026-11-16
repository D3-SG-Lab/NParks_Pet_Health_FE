export type ArrivalErrorKind = 'microchip_taken' | 'incomplete' | 'already_registered' | 'upload_failed';

export class ArrivalError extends Error {
  readonly kind: ArrivalErrorKind;
  constructor(kind: ArrivalErrorKind, message: string) {
    super(message);
    this.name = 'ArrivalError';
    this.kind = kind;
  }
}
