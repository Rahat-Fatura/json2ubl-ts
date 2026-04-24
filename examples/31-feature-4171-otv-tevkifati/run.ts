import { runScenario } from '../_lib/runScenario';
import input from './input';

// Sprint 8c.9: strict — B-NEW-11 fix sonrası 351 çakışması yok; input'a
// withholdingTaxCode eklendi (TEVKIFAT + 4171 kombinasyonu için WithholdingTaxTotal zorunlu).
runScenario(__dirname, input);
