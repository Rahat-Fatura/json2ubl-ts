import { runInvalid } from '../../../_lib/runInvalid';
import input from './input';
import expected from './expected-error.json';

runInvalid(__dirname, input, expected);
