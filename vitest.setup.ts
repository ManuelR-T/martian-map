import { beforeEach } from 'vitest';
import i18n from './apps/web/src/i18n';

// Existing UI assertions use French explicitly, independently of the test host's locale.
beforeEach(async () => { await i18n.changeLanguage('fr'); });
