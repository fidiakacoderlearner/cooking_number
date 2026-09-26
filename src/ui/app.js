/**
 * Entry point. Restores the stored language, then hands over to the controller.
 */

import { restoreLanguage } from './i18n.js';
import { init } from './controller.js';

restoreLanguage();
init();
