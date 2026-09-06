import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-demo-paywall.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-41-r30-buglog.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

assert(loader.includes('v10-42-demo-paywall.js'),'Canonical V10.42 loader must activate the Tutorial completion/paywall layer.');
assert(source.includes('const FALLBACK_PRICE="£1.99"'),'The draft launch price must remain £1.99 until the server-authoritative offer deliberately changes.');
assert(source.includes('const PRODUCT_SLUG="the-lost-sizzler-full-game"'),'The permanent entitlement must use the fixed Lost Sizzler product slug.');
assert(source.includes('window.CCG_LOST_SIZZLER_DEMO_MODE===true'),'Full-game button interception must remain explicit demo-mode opt-in.');
assert(source.includes('PERMANENT ACCOUNT UNLOCK'),'Purchase presentation must explain permanent account ownership.');
assert(source.includes('ALL FUTURE GAME UPDATES INCLUDED'),'Purchase presentation must state that future Lost Sizzler updates are included.');
assert(source.includes('SIGN IN OR CREATE A CCG ACCOUNT TO CONTINUE'),'Signed-out players must be directed to account access before checkout.');
assert(source.includes('if(!(await signedIn()))'),'Checkout must verify account authentication before invoking PayPal.');
assert(source.includes('purchase_not_verified'),'A browser checkout callback alone must never be enough to unlock the game.');
assert(source.includes('if(!activePermanent(entitlementValue))return false'),'Only a verified permanent entitlement may unlock the runtime.');
assert(source.includes('finally{state.checking=false}'),'Paywall presentation mutex must always release so Not Now and later full-game attempts can reopen it.');
assert(source.includes('if(!complete){completionQueued=false;return}'),'Tutorial completion detection must re-arm after the completion banner disappears so replayed training can trigger the offer again.');
assert(source.includes('event.stopImmediatePropagation()'),'Demo lock must stop the underlying full-game action before presenting the entitlement screen.');
assert(source.includes('credentials:')===false,'The presentation layer must not embed its own privileged network credentials.');

console.log('Lost Sizzler V10.42 Tutorial completion and permanent-unlock contract passed.');
