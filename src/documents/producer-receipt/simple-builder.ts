/**
 * `SimpleProducerReceiptBuilder` — basit JSON'dan e-MM XML'i.
 *
 * Akış `SimpleSelfEmployedVoucherBuilder` ile BİREBİR aynıdır:
 *   1. `SimpleProducerReceiptInput` → hesap
 *   2. Sonuç → `ProducerReceiptInput` (mapper)
 *   3. Ham girdi → `ProducerReceiptBuilder` (doğrulama + serileştirme)
 *
 * ⚠️ Faturadaki "simple katmanı doğrulayıcıları" ailesi (istisna/SGK/profil
 * kapıları) burada YOKTUR ve bu bilerekdir: o kapılar profil×tip ekseninden
 * doğar, e-MM'de o eksen TEK DEĞERLİDİR. e-MM'e özgü kurallar (kesinti kod
 * kümesi, işaret, toplam tutarlılığı) ham katmanda yaşar ve eşleme birebir
 * olduğu için orada doğrulamak AYNI şeydir.
 */

import type { BuilderOptions } from '../../types/builder-options';
import type { ProducerReceiptInput } from './input';
import type { SimpleProducerReceiptInput } from './simple-input';
import type { CalculatedProducerReceipt } from './mapper';
import { calculateProducerReceipt, mapSimpleToProducerReceiptInput } from './mapper';
import { ProducerReceiptBuilder } from './builder';

export interface SimpleProducerReceiptBuilderOptions extends BuilderOptions {
  /** `true` ise hesaplama ve ham girdi de döner (hata ayıklama). */
  returnCalculation?: boolean;
}

export interface SimpleProducerReceiptBuildResult {
  /** Üretilen UBL XML. */
  xml: string;
  /** Hesaplama sonucu (`returnCalculation: true` ise). */
  calculation?: CalculatedProducerReceipt;
  /** Dönüştürülmüş ham girdi (`returnCalculation: true` ise). */
  receiptInput?: ProducerReceiptInput;
}

export class SimpleProducerReceiptBuilder {
  private readonly options: SimpleProducerReceiptBuilderOptions;
  private readonly receiptBuilder: ProducerReceiptBuilder;

  constructor(options?: Partial<SimpleProducerReceiptBuilderOptions>) {
    this.options = {
      prettyPrint: true,
      indentSize: 2,
      xmlDeclaration: true,
      validationLevel: 'basic',
      returnCalculation: false,
      ...options,
    };
    this.receiptBuilder = new ProducerReceiptBuilder(this.options);
  }

  /** Basit girdiden XML üretir. */
  build(input: SimpleProducerReceiptInput): SimpleProducerReceiptBuildResult {
    const calculation = calculateProducerReceipt(input);
    const receiptInput = mapSimpleToProducerReceiptInput(input, calculation);
    return this.result(this.receiptBuilder.build(receiptInput), calculation, receiptInput);
  }

  /** Doğrulamasız XML üretir (test/hata ayıklama). */
  buildUnsafe(input: SimpleProducerReceiptInput): SimpleProducerReceiptBuildResult {
    const calculation = calculateProducerReceipt(input);
    const receiptInput = mapSimpleToProducerReceiptInput(input, calculation);
    const unsafe = new ProducerReceiptBuilder({ ...this.options, validationLevel: 'none' });
    return this.result(unsafe.build(receiptInput), calculation, receiptInput);
  }

  /** Yalnız hesaplar — XML üretmez. */
  calculate(input: SimpleProducerReceiptInput): CalculatedProducerReceipt {
    return calculateProducerReceipt(input);
  }

  /** Yalnız ham girdiye çevirir — XML üretmez. */
  toReceiptInput(input: SimpleProducerReceiptInput): ProducerReceiptInput {
    return mapSimpleToProducerReceiptInput(input);
  }

  private result(
    xml: string,
    calculation: CalculatedProducerReceipt,
    receiptInput: ProducerReceiptInput,
  ): SimpleProducerReceiptBuildResult {
    const result: SimpleProducerReceiptBuildResult = { xml };
    if (this.options.returnCalculation) {
      result.calculation = calculation;
      result.receiptInput = receiptInput;
    }
    return result;
  }
}
