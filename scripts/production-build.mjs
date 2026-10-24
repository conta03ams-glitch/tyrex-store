import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
for(const [command,args] of [
 ['python3',['scripts/responsive-images.py']],
 ['python3',['scripts/optimize-images.py']],
 [process.execPath,['--experimental-strip-types','--test','tests/seo-analytics.test.mjs']],
 [process.execPath,['scripts/run-framework.mjs','build']],
]){
 const result=spawnSync(command,args,{cwd:root,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
