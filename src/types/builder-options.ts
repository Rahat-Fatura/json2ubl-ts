/** Builder yapılandırma seçenekleri */
export interface BuilderOptions {
  /** Pretty print (indented) XML çıktısı — varsayılan: true */
  prettyPrint?: boolean;
  /** Indent boyutu (boşluk sayısı) — varsayılan: 2 */
  indentSize?: number;
  /** Validasyon seviyesi — varsayılan: 'basic' */
  validationLevel?: ValidationLevel;
  /** XML declaration eklensin mi — varsayılan: true */
  xmlDeclaration?: boolean;
  /**
   * 555 (Demirbaş KDV / Bedelsiz Demirbaş İstisnası) kodunu kabul eder.
   * Kütüphane 555 için iş mantığı uygulamaz; tüketici farklı KDV oranından
   * kesme hesabından sorumludur. Default: false.
   */
  allowReducedKdvRate?: boolean;
  /**
   * Boş `ext:UBLExtensions` iskeleti üretilsin mi — **varsayılan: `false`**.
   *
   * `true` iken kök elemanın İLK çocuğu olarak şu blok yazılır:
   * ```xml
   * <ext:UBLExtensions>
   *   <ext:UBLExtension>
   *     <ext:ExtensionContent/>
   *   </ext:UBLExtension>
   * </ext:UBLExtensions>
   * ```
   *
   * Neden gerekli: GİB `UBL-Invoice-2.1.xsd` kök sequence'ında
   * `ext:UBLExtensions` İLK elemandır; iskelet yokken XSD doğrulaması
   * *"UBLVersionID elementi bu konumda geçersiz. Bu noktada beklenen:
   * UBLExtensions."* ile düşer. İmzalayıcı XAdES'i `ExtensionContent`
   * içine yazar.
   *
   * Neden varsayılan `false`: kütüphane imza üretmez ve yerleşik
   * tüketicilerin çoğunda zarfı/imzayı ENTEGRATÖR ekler — koşulsuz emit
   * onların çıktısını değiştirirdi. İmzayı kendi atan tüketiciler açar.
   */
  includeUblExtensions?: boolean;
}

/** Validasyon seviyeleri */
export type ValidationLevel =
  /** Sadece zorunlu alan ve format kontrolleri (§1) */
  | 'basic'
  /** Tip-bazlı + profil-bazlı + çapraz matris kontrolleri (§1-§4) */
  | 'strict'
  /** Validasyon yapılmasın (kullanıcı kendi sorumluluğunda) */
  | 'none';
