export type ArrivalErrorKind = 'microchip_taken' | 'incomplete';

export class ArrivalError extends Error {
  readonly kind: ArrivalErrorKind;
  constructor(kind: ArrivalErrorKind, message: string) {
    super(message);
    this.name = 'ArrivalError';
    this.kind = kind;
  }
}
