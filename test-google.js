const google = require('googlethis');
const query = 'apple';
google.search(query, { page: 0, safe: false, additional_params: { hl: 'en' } }).then(res => console.log(res.results.length)).catch(console.error);
