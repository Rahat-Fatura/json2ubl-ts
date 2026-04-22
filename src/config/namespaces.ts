/** UBL-TR Invoice namespace'leri */
export const INVOICE_NAMESPACES = {
  default: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
  cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  ds: 'http://www.w3.org/2000/09/xmldsig#',
  xades: 'http://uri.etsi.org/01903/v1.3.2#',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
  schemaLocation: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 UBL-Invoice-2.1.xsd',
} as const;

/** UBL-TR DespatchAdvice namespace'leri */
export const DESPATCH_NAMESPACES = {
  default: 'urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2',
  cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  ds: 'http://www.w3.org/2000/09/xmldsig#',
  xades: 'http://uri.etsi.org/01903/v1.3.2#',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
  schemaLocation: 'urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2 UBL-DespatchAdvice-2.1.xsd',
} as const;

/** Sabit UBL-TR değerleri */
export const UBL_CONSTANTS = {
  ublVersionId: '2.1',
  customizationId: 'TR1.2',
  copyIndicator: 'false',
} as const;
