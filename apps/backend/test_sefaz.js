import fs from 'fs';

async function test() {
  const url = 'https://www.sefaz.mt.gov.br/nfce/consultanfce?p=51260719300772000843650010002465571284548371|2|1|1|D8E6F8934E2BD39D';
  console.log('Fetching URL:', url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('Status:', res.status);
    const html = await res.text();
    console.log('HTML Length:', html.length);
    fs.writeFileSync('sefaz_response.html', html);
    console.log('Saved response to sefaz_response.html (first 300 chars):', html.slice(0, 300));
  } catch (error) {
    console.error('Error fetching:', error);
  }
}
test();
