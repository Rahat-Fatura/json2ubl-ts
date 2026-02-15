/**
 * SimpleInvoiceBuilder — basitleştirilmiş JSON'dan UBL-TR XML üreten ana sınıf.
 *
 * Kullanım:
 * ```typescript
 * const builder = new SimpleInvoiceBuilder();
 * const xml = builder.build(simpleInput);
 * ```
 *
 * Dahili akış:
 * 1. SimpleInvoiceInput → hesaplama motoru (line-calculator + document-calculator)
 * 2. Hesaplama sonucu → InvoiceInput mapper (simple-invoice-mapper)
 * 3. InvoiceInput → InvoiceBuilder (mevcut XML serializer)
 * 4. XML çıktısı
 */

import type { SimpleInvoiceInput } from './simple-types';
import type { CalculatedDocument } from './document-calculator';
import { calculateDocument } from './document-calculator';
import { mapSimpleToInvoiceInput } from './simple-invoice-mapper';
import { InvoiceBuilder } from '../builders/invoice-builder';
import type { BuilderOptions } from '../types/builder-options';
import type { InvoiceInput } from '../types/invoice-input';

export interface SimpleBuilderOptions extends BuilderOptions {
  /** true ise hesaplama sonuçlarını da döner (debug için) */
  returnCalculation?: boolean;
}

export interface SimpleBuildResult {
  /** Üretilen UBL-TR XML */
  xml: string;
  /** Hesaplama sonuçları (returnCalculation=true ise) */
  calculation?: CalculatedDocument;
  /** Dönüştürülmüş InvoiceInput (returnCalculation=true ise) */
  invoiceInput?: InvoiceInput;
}

export class SimpleInvoiceBuilder {
  private readonly options: SimpleBuilderOptions;
  private readonly invoiceBuilder: InvoiceBuilder;

  constructor(options?: Partial<SimpleBuilderOptions>) {
    this.options = {
      prettyPrint: true,
      indentSize: 2,
      xmlDeclaration: true,
      validationLevel: 'basic',
      returnCalculation: false,
      ...options,
    };
    this.invoiceBuilder = new InvoiceBuilder(this.options);
  }

  /**
   * Basit JSON girişinden UBL-TR Invoice XML üretir.
   *
   * @param input Basitleştirilmiş fatura verisi
   * @returns XML string veya detaylı sonuç objesi
   * @throws UblBuildError validasyon hatalarında
   */
  build(input: SimpleInvoiceInput): SimpleBuildResult {
    // 1. Hesapla + map
    const calculation = calculateDocument(input);
    const invoiceInput = mapSimpleToInvoiceInput(input);

    // 2. XML üret (mevcut builder validasyon + serialization yapar)
    const xml = this.invoiceBuilder.build(invoiceInput);

    const result: SimpleBuildResult = { xml };

    if (this.options.returnCalculation) {
      result.calculation = calculation;
      result.invoiceInput = invoiceInput;
    }

    return result;
  }

  /**
   * Validasyonsuz XML üretir (test/debug amaçlı).
   */
  buildUnsafe(input: SimpleInvoiceInput): SimpleBuildResult {
    const calculation = calculateDocument(input);
    const invoiceInput = mapSimpleToInvoiceInput(input);

    const unsafeBuilder = new InvoiceBuilder({
      ...this.options,
      validationLevel: 'none',
    });

    const xml = unsafeBuilder.build(invoiceInput);

    const result: SimpleBuildResult = { xml };

    if (this.options.returnCalculation) {
      result.calculation = calculation;
      result.invoiceInput = invoiceInput;
    }

    return result;
  }

  /**
   * Sadece hesaplama yapar, XML üretmez.
   * Ara sonuçları görmek veya debug etmek için kullanışlı.
   */
  calculate(input: SimpleInvoiceInput): CalculatedDocument {
    return calculateDocument(input);
  }

  /**
   * Sadece InvoiceInput'a dönüştürür, XML üretmez.
   * Mevcut InvoiceBuilder ile doğrudan kullanmak için.
   */
  toInvoiceInput(input: SimpleInvoiceInput): InvoiceInput {
    return mapSimpleToInvoiceInput(input);
  }
}
