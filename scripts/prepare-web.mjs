import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Small text source chunks preserve the original image across upload transports.
// Rebuild and verify it before preparing any public assets.
const source = new URL('../web/encoded-assets/owners/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', source), 'utf8'));
const encoded = await Promise.all(manifest.parts.map(name => readFile(new URL(name, source), 'utf8')));
const asset = Buffer.from(encoded.join('').replace(/\s/g, ''), 'base64');
if (asset.length !== manifest.bytes || createHash('sha256').update(asset).digest('hex') !== manifest.sha256) {
  throw new Error('Original owners image failed integrity verification. Restore its encoded source parts.');
}
await mkdir(new URL('../web/assets/', import.meta.url), {recursive:true});
await writeFile(new URL('../web/assets/owners.webp', import.meta.url), asset);
await mkdir('public',{recursive:true});
for(const name of ['assets','js','styles.css','product.css','foundation.css'])await cp(`web/${name}`,`public/${name}`,{recursive:true});
console.log('Prepared the existing HellYeah interface for the server runtime.');
