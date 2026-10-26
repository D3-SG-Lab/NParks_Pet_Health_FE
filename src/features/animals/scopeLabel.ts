import { mockContractorKennels } from '@/mock/db';

/**
 * "KC2-1–KC2-6": the contractor's assigned kennels for the picker note.
 * MOCK: from the demo store; later this comes with the user's profile (BE-005, BE-007).
 */
export const mockContractorKennelsLabel =
  mockContractorKennels.length > 1
    ? `${mockContractorKennels[0]}–${mockContractorKennels[mockContractorKennels.length - 1]}`
    : (mockContractorKennels[0] ?? 'none');