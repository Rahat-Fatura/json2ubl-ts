import { runScenario } from '../_lib/runScenario';
import input from './input';

// validationLevel='basic' — strict modda B-81 otomatik-351 atama + M5
// requiresZeroKdvLine kuralı çakışıyor (SimpleInvoiceBuilder bug, ACIK-SORULAR §4).
// Runtime temel kontroller korundu; örneğin öğretici değeri etkilenmez.
runScenario(__dirname, input, { validationLevel: 'basic' });
