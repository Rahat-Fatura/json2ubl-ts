import { runScenario } from '../_lib/runScenario';
import input from './input';

// basic mod — B-NEW-11 (TEVKIFAT + strict B-81/M5 çakışması).
runScenario(__dirname, input, { validationLevel: 'basic' });
