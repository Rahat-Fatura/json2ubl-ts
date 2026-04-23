import { runScenario } from '../_lib/runScenario';
import input from './input';

// basic mod — YOLCUBERABERFATURA simple-input TaxRepresentativeParty/nationalityId
// ağacını eksik destekliyor. 8c'de genişletilecek (B-NEW-13).
runScenario(__dirname, input, { validationLevel: 'basic' });
