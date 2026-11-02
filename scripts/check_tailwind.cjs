// Rebuild to a temporary file; do not silently update the shipped stylesheet in CI.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'ash-tailwind-'));
try{
 const output=path.join(temp,'tailwind.css');
 const result=spawnSync(process.execPath,[path.join(root,'node_modules/@tailwindcss/cli/dist/index.mjs'),'-i','./frontend/tailwind.input.css','-o',output,'--minify'],{cwd:root,encoding:'utf8'});
 if(result.status!==0)throw new Error(result.stderr||'Tailwind build failed; run npm ci first.');
 if(!fs.readFileSync(output).equals(fs.readFileSync(path.join(root,'frontend/tailwind.css'))))throw new Error('Shipped CSS is stale. Run npm run build:css and include frontend/tailwind.css.');
 console.log('Tailwind 4.3.3: shipped CSS matches source; no runtime CDN/build needed.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
