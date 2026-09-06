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
assert(source.includes('await start({product:PRODUCT_SLUG});status("Verifying permanent entitlement…");const value=await entitlement();'),'Checkout completion must be followed by a fresh provider entitlement read before the runtime can unlock.');
assert(!source.includes('const result=await start({product:PRODUCT_SLUG})'),'Checkout must not retain or trust a returned entitlement payload from the PayPal callback.');
assert(source.includes('purchase_not_verified'),'A browser checkout callback alone must never be enough to unlock the game.');
assert(source.includes('if(!activePermanent(entitlementValue))return false'),'Only a permanent entitlement returned through the commerce-provider path may unlock the runtime.');
assert(source.includes('finally{state.checking=false}'),'Paywall presentation mutex must always release so Not Now and later full-game attempts can reopen it.');
assert(source.includes('if(!complete){completionQueued=false;return}'),'Tutorial completion detection must re-arm after the completion banner disappears so replayed training can trigger the offer again.');
assert(source.includes('event.stopImmediatePropagation()'),'Demo lock must stop the underlying full-game action before presenting the entitlement screen.');
assert(source.includes('"continue-save-btn","join-btn"'),'Demo mode must also guard saved-run resume and room-code join entry paths.');
assert(source.includes('#continue-save-btn')&&source.includes('#join-btn'),'Saved-run resume and room-code join controls must receive the same visible demo-lock treatment as the main paid modes.');
assert(!source.includes('"tutorial-zone-btn"'),'The free Tutorial must remain outside the paid full-game guard set.');
assert(source.includes('const safeOfferText=')&&source.includes('.trim().slice(0,32)'),'Commerce-controlled offer text must be normalized and length-bounded before presentation.');
assert(source.includes('${esc(offer.display)} ONE-OFF'),'Commerce-controlled display-price text must be HTML-escaped before entering the paywall template.');
assert(!source.includes('${offer.display} ONE-OFF'),'Raw commerce display-price text must never be interpolated directly into paywall HTML.');
assert(source.includes('function diagnostics(){return Object.freeze({'),'Public diagnostics must expose only an immutable snapshot rather than the mutable entitlement state object.');
assert(source.includes('Object.freeze({productSlug:PRODUCT_SLUG,demoMode:DEMO_MODE,showPaywall,closePaywall,refreshEntitlement,diagnostics})'),'The browser-facing paywall API must not export the internal unlock function or mutable state object.');
assert(!source.includes('refreshEntitlement,unlockRuntime})'),'Direct browser access to unlockRuntime must remain unavailable.');
assert(!source.includes('refreshEntitlement,state,')&&!source.includes('state,showPaywall'),'Mutable entitlement state must not be exported through the public paywall API.');
assert(source.includes('credentials:')===false,'The presentation layer must not embed its own privileged network credentials.');

console.log('Lost Sizzler V10.42 Tutorial completion, full entry-path guard, safe offer rendering and server-refresh permanent-unlock contract passed.');
