import { runScenario } from '../_lib/runScenario';
import input from './input';

// validationLevel='basic' — SimpleInvoiceInput, IHRACKAYITLI+702 için zorunlu
// 11-haneli ALICIDIBSATIRKOD ağacını (shipment/transportHandlingUnits/customsDeclarations)
// doğrudan desteklemiyor. Kütüphane genişletilene kadar strict validation bu örnekte
// çalışmıyor. (ACIK-SORULAR §4.)
runScenario(__dirname, input, { validationLevel: 'basic' });
