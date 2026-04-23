import { InvoiceProfileId, InvoiceTypeCode } from '../types/enums';

/**
 * B-62: Schematron "1460415308 VKN" kuralı (CommonSchematron:275-277)
 * — TaxFreeInvoice özel VKN'si. Bu VKN taraflarda varsa fatura profil
 * YOLCUBERABERFATURA/IHRACAT/OZELFATURA/KAMU'dan biri olmalı.
 */
export const TAXFREE_SPECIAL_VKN = '1460415308';

export const TAXFREE_ALLOWED_PROFILES: ReadonlySet<InvoiceProfileId> = new Set<InvoiceProfileId>([
  InvoiceProfileId.YOLCUBERABERFATURA,
  InvoiceProfileId.IHRACAT,
  InvoiceProfileId.OZELFATURA,
  InvoiceProfileId.KAMU,
]);

/**
 * B-63: Schematron "7750409379 VKN" kuralı (CommonSchematron:508-510)
 * — SGK özel VKN'si. Bu VKN taraflarda varsa fatura tipi SGK veya TEVKIFAT olmalı.
 */
export const SGK_SPECIAL_VKN = '7750409379';

export const SGK_ALLOWED_TYPES: ReadonlySet<InvoiceTypeCode> = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.SGK,
  InvoiceTypeCode.TEVKIFAT,
]);
