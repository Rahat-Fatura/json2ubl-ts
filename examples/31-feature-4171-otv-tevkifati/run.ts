import { runScenario } from '../_lib/runScenario';
import input from './input';

// basic mod — 4171 ÖTV tevkifatı strict'te B-81/M5 + TEVKIFAT zorunluluk
// çakışması. 8c'de 4171 special-case handle edilecek.
runScenario(__dirname, input, { validationLevel: 'basic' });
