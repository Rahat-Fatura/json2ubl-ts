/**
 * UBL-TR zorunlu alan eksik hatası (M6 + AR-1).
 *
 * Serializer'da `cbcRequiredTag` boş/undefined değer aldığında ya da
 * runtime validator parent-child conditional kontrollerde fırlatılır.
 *
 * `fieldName` XSD cbc element adı (ör. `cbc:IssueDate`, `cbc:PaymentMeansCode`).
 * `parentContext` verildiğinde parent konteynerin adı (ör. `PaymentMeans`, `Party`).
 */
export class MissingRequiredFieldError extends Error {
  readonly fieldName: string;
  readonly parentContext?: string;

  constructor(fieldName: string, parentContext?: string) {
    const msg = parentContext
      ? `Required UBL field '${fieldName}' missing (parent: ${parentContext})`
      : `Required UBL field '${fieldName}' missing`;
    super(msg);
    this.name = 'MissingRequiredFieldError';
    this.fieldName = fieldName;
    this.parentContext = parentContext;
  }
}
