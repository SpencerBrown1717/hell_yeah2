import {cp,mkdir} from 'node:fs/promises';
await mkdir('public',{recursive:true});
for(const name of ['assets','js','styles.css','product.css','foundation.css'])await cp(`web/${name}`,`public/${name}`,{recursive:true});
console.log('Prepared the existing HellYeah interface for the server runtime.');
