import { runScenario } from '../_lib/runScenario';
import input from './input';

// basic mod — B-NEW-12 (IHRACKAYITLI+702 simple-input AlıcıDİBKod eksiği).
runScenario(__dirname, input, { validationLevel: 'basic' });
