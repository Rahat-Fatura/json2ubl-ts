import type { ValidationError } from '../errors/ubl-build-error';
import type { InvoiceInput } from '../types/invoice-input';
import { PROFILE_TYPE_MATRIX } from '../config/constants';
import { crossMatrixError } from './validation-result';

/**
 * §4 Profil×Tip çapraz matris kontrolü
 */
export function validateCrossMatrix(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];

  const allowedTypes = PROFILE_TYPE_MATRIX[input.profileId];
  if (!allowedTypes) {
    errors.push({
      code: 'INVALID_PROFILE',
      message: `Bilinmeyen ProfileID: ${input.profileId}`,
      path: 'profileId',
    });
    return errors;
  }

  if (!allowedTypes.has(input.invoiceTypeCode)) {
    errors.push(crossMatrixError(input.profileId, input.invoiceTypeCode));
  }

  return errors;
}
