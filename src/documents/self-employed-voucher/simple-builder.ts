/**
 * `SimpleSelfEmployedVoucherBuilder` — basit JSON'dan e-SMM XML'i.
 *
 * Akış `SimpleInvoiceBuilder` ile BİREBİR aynıdır:
 *   1. `SimpleSelfEmployedVoucherInput` → ORTAK hesap motoru
 *   2. Sonuç → `SelfEmployedVoucherInput` (mapper)
 *   3. Ham girdi → `SelfEmployedVoucherBuilder` (doğrulama + serileştirme)
 *
 * ⚠️ Faturadaki "simple katmanı doğrulayıcıları" ailesi (istisna/SGK/profil
 * kapıları) burada YOKTUR ve bu bilerekdir: o kapılar profil×tip ekseninden
 * doğar, e-SMM'de o eksen TEK DEĞERLİDİR. e-SMM'e özgü kurallar (kod kümesi,
 * istisna metni, kur) ham katmanda yaşar ve eşleme birebir olduğu için orada
 * doğrulamak AYNI şeydir — iki kopya kural riski taşımaz (irsaliye kararıyla aynı).
 */

import type { BuilderOptions } from '../../types/builder-options';
import type { SelfEmployedVoucherInput } from './input';
import type { SimpleSelfEmployedVoucherInput } from './simple-input';
import type { CalculatedSelfEmployedVoucher } from './mapper';
import { calculateSelfEmployedVoucher, mapSimpleToSelfEmployedVoucherInput } from './mapper';
import { SelfEmployedVoucherBuilder } from './builder';

export interface SimpleSelfEmployedVoucherBuilderOptions extends BuilderOptions {
  /** `true` ise hesaplama ve ham girdi de döner (hata ayıklama). */
  returnCalculation?: boolean;
}

export interface SimpleSelfEmployedVoucherBuildResult {
  /** Üretilen UBL XML. */
  xml: string;
  /** Hesaplama sonucu (`returnCalculation: true` ise). */
  calculation?: CalculatedSelfEmployedVoucher;
  /** Dönüştürülmüş ham girdi (`returnCalculation: true` ise). */
  voucherInput?: SelfEmployedVoucherInput;
}

export class SimpleSelfEmployedVoucherBuilder {
  private readonly options: SimpleSelfEmployedVoucherBuilderOptions;
  private readonly voucherBuilder: SelfEmployedVoucherBuilder;

  constructor(options?: Partial<SimpleSelfEmployedVoucherBuilderOptions>) {
    this.options = {
      prettyPrint: true,
      indentSize: 2,
      xmlDeclaration: true,
      validationLevel: 'basic',
      returnCalculation: false,
      ...options,
    };
    this.voucherBuilder = new SelfEmployedVoucherBuilder(this.options);
  }

  /** Basit girdiden XML üretir. */
  build(input: SimpleSelfEmployedVoucherInput): SimpleSelfEmployedVoucherBuildResult {
    const calculation = calculateSelfEmployedVoucher(input);
    const voucherInput = mapSimpleToSelfEmployedVoucherInput(input, calculation);
    return this.result(this.voucherBuilder.build(voucherInput), calculation, voucherInput);
  }

  /** Doğrulamasız XML üretir (test/hata ayıklama). */
  buildUnsafe(input: SimpleSelfEmployedVoucherInput): SimpleSelfEmployedVoucherBuildResult {
    const calculation = calculateSelfEmployedVoucher(input);
    const voucherInput = mapSimpleToSelfEmployedVoucherInput(input, calculation);
    const unsafe = new SelfEmployedVoucherBuilder({ ...this.options, validationLevel: 'none' });
    return this.result(unsafe.build(voucherInput), calculation, voucherInput);
  }

  /** Yalnız hesaplar — XML üretmez. */
  calculate(input: SimpleSelfEmployedVoucherInput): CalculatedSelfEmployedVoucher {
    return calculateSelfEmployedVoucher(input);
  }

  /** Yalnız ham girdiye çevirir — XML üretmez. */
  toVoucherInput(input: SimpleSelfEmployedVoucherInput): SelfEmployedVoucherInput {
    return mapSimpleToSelfEmployedVoucherInput(input);
  }

  private result(
    xml: string,
    calculation: CalculatedSelfEmployedVoucher,
    voucherInput: SelfEmployedVoucherInput,
  ): SimpleSelfEmployedVoucherBuildResult {
    const result: SimpleSelfEmployedVoucherBuildResult = { xml };
    if (this.options.returnCalculation) {
      result.calculation = calculation;
      result.voucherInput = voucherInput;
    }
    return result;
  }
}
