import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../../..");
const paywallPath=path.join(root,"arcade/lost-sizzler/js/v10-42-demo-paywall.js");
const commercePath=path.join(root,"arcade/lost-sizzler/js/v10-42-paypal-commerce.js");
const cssPath=path.join(root,"resources/css/c64-dungeon-carnage-trial-paywall.css");
const paywall=fs.readFileSync(paywallPath,"utf8");
const commerce=fs.readFileSync(commercePath,"utf8");
const css=fs.readFileSync(cssPath,"utf8");

assert.match(paywall,/const TRIAL_MS=120000;/,"trial duration must remain exactly two minutes");
assert.match(paywall,/data-trial-time>02:00/,"visible trial clock must start at 02:00");
assert.match(paywall,/dataset\?\.runActive==="true"/,"trial must start from the canonical active-run state");
assert.match(paywall,/localStorage\.setItem\(TRIAL_STORAGE_KEY/,"trial deadline must survive reloads and new tabs in the same browser profile");
assert.match(paywall,/mode="trial-paywall"/,"expired trial must leave normal gameplay mode");
assert.match(paywall,/showPaywall\(\{reason:"trial-expired"\}\)/,"timer expiry must open the paywall");
assert.match(paywall,/if\(state\.expired&&!state\.entitled\)return false;/,"expired paywall must not be dismissible without entitlement");
assert.match(paywall,/demoMode:false,trialMode:true,trialMs:TRIAL_MS/,"legacy pre-run demo locking must stay disabled while timed trial mode is enabled");
assert.match(paywall,/v10-42-paypal-commerce\.js/,"paywall must load the secure PayPal commerce adapter");
assert.match(paywall,/BUY SECURELY WITH PAYPAL/,"paywall must present the PayPal checkout path");
assert.match(paywall,/purchase==="success"/,"successful PayPal return must trigger payment capture and entitlement restoration");
assert.match(paywall,/capturePayPalReturn\(\)/,"successful PayPal return must call the server capture path");
assert.match(paywall,/refreshEntitlement\(\{poll:true\}\)/,"successful PayPal return must tolerate entitlement propagation delay");
assert.match(paywall,/data-download>DOWNLOAD GAME/,"owned presentation must expose the secure downloadable build when ready");
assert.doesNotMatch(paywall,/patreon\.com|youtube\.com\/@CheekyCommodoreGamer\/join/i,"support links must not masquerade as purchase/unlock actions inside the paywall");
assert.match(paywall,/\/resources\/css\/c64-dungeon-carnage-trial-paywall\.css/,"paywall styling must load from resources/css");
assert.doesNotMatch(paywall,/createElement\("style"\)/,"runtime must not inject a replacement inline stylesheet");

assert.match(commerce,/const ENDPOINT="ccg-commerce";/,"browser commerce must use the dedicated Supabase Edge Function");
assert.match(commerce,/provider:"paypal-supabase"/,"browser commerce must identify the PayPal provider");
assert.match(commerce,/productSlug:PRODUCT_SLUG/,"commerce adapter must expose the canonical product identity");
assert.match(commerce,/functions\.invoke\(ENDPOINT/,"commerce calls must route through authenticated Supabase function invocation");
assert.match(commerce,/invoke\("status"\)/,"commerce adapter must expose an ownership/status check");
assert.match(commerce,/invoke\("create_checkout"\)/,"PayPal order creation must be server-side");
assert.match(commerce,/invoke\("capture_checkout",\{orderId:value\}\)/,"PayPal order capture must be server-side");
assert.match(commerce,/invoke\("download"\)/,"download authorization must be created server-side");
assert.match(commerce,/checkout_configured:Boolean\(data\.checkoutConfigured\)/,"server checkout readiness must be surfaced to the paywall");
assert.doesNotMatch(commerce,/PAYPAL_CLIENT_SECRET|STRIPE_SECRET|service_role|SUPABASE_SERVICE_ROLE/i,"browser adapter must never contain payment or Supabase server secrets");

assert.match(css,/#v142-trial-countdown/,"countdown styling must be present");
assert.match(css,/#v142-demo-paywall/,"paywall styling must be present");
assert.match(css,/\.v142-download/,"owned download action must be styled");
assert.match(css,/body\.ccg-game-cursor-idle #v142-demo-paywall/,"paywall must override the r20 idle-game cursor suppression so checkout controls retain a visible pointer");
assert.match(css,/body\.ccg-game-cursor-idle #v142-demo-paywall button[^}]*cursor:pointer!important/,"paywall buttons must retain an interactive cursor under the r20 idle-game cursor layer");
assert.match(css,/@media\(max-width:650px\)/,"paywall must retain a phone layout rule");

console.log("C64 Dungeon Carnage two-minute PayPal trial paywall contract passed");
