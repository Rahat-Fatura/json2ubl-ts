import { runScenario } from '../_lib/runScenario';
import input from './input';

// M4/B-96: 555 kodu için allowReducedKdvRate opt-in flag zorunlu.
runScenario(__dirname, input, { allowReducedKdvRate: true });
