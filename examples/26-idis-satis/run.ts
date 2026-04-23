import { runScenario } from '../_lib/runScenario';
import input from './input';

// basic mod — ETIKETNO format runtime regex simple-input akışında reject
// ediyor. Doğru format 8c'de netleştirilecek.
runScenario(__dirname, input, { validationLevel: 'basic' });
