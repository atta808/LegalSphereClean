import { getHearingCategories } from './src/services/hearing/HearingClassificationService.js';
console.log(getHearingCategories([{nextHearingISO: '2025-01-01', status: 'active'}]));
