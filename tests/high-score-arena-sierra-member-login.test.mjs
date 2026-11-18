import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {safeSierraReturn,signInHelioHostMember} from '../resources/js/auth/heliohost-score-login.js';

const SITE='https://www.cheekycommodoregamer.co.uk';
const API='https://api.cheekycommodoregamer.co.uk';
const GAME='/emulator/c64/?game=owner-crt-more-crossfiresierraonline-0c60e852f438&autoplay=1&start=1&scores=1';
const csrf='a'.repeat(64);
const uuid='11111111-1111-4111-8111-111111111111';
function reply(obj,status=200){
 return {ok:status>=200&&status<300,headers:{get:key=>key==='content-type'?'application/json; charset=utf-8':null},
         text:async()=>JSON.stringify(obj)};
}
test('return destination is fixed to the exact one-click Sierra CRT',()=>{
 for(const incoming of [
  null,'','//evil.test/path','https://evil.test/', '/auth/login.html',
  '/emulator/c64/?game=other&autoplay=1&start=1&scores=1',
  '/emulator/c64/?game=owner-crt-more-crossfiresierraonline-0c60e852f438&start=1&scores=1',
  GAME+'&next=https://evil.test/',GAME+'&scores=1',GAME+'#malicious'
 ])assert.equal(safeSierraReturn(incoming),GAME);
 assert.equal(safeSierraReturn(GAME),GAME);
});
test('member sign-in requires the official CCG origin and credentials',async()=>{
 let count=0;
 const fake=async()=>{count++;throw Error('network not expected');};
 for(const input of [
  {origin:'http://localhost:8000',email:'pilot@example.invalid',password:'any'},
  {origin:'https://evil.test',email:'pilot@example.invalid',password:'any'},
  {origin:SITE,email:'not-email',password:'any'},
  {origin:SITE,email:'pilot@example.invalid',password:''}
 ])assert.equal(await signInHelioHostMember({...input,fetchImpl:fake}),false);
 assert.equal(count,0);
});
test('HelioHost login first obtains same-site CSRF then POSTs credentials without placing them in URLs',async()=>{
 const seen=[];
 const fake=async (url,options)=>{
  seen.push({url,options});
  if(url===API+'/v1/member/csrf')return reply({csrf});
  if(url===API+'/v1/member/login')return reply({authenticated:true,csrf});
  if(url===API+'/v1/member/me')return reply({account:{id:uuid}});
  throw Error('wrong endpoint '+url);
 };
 const ok=await signInHelioHostMember({origin:SITE,email:'pilot@example.invalid',password:'private-fixture-only',fetchImpl:fake});
 assert.equal(ok,true);
 assert.deepEqual(seen.map(v=>v.url),[API+'/v1/member/csrf',API+'/v1/member/login',API+'/v1/member/me']);
 for(const {url,options} of seen){
  assert(url.startsWith('https://api.cheekycommodoregamer.co.uk/v1/member/'));
  assert.equal(options.credentials,'include');
  assert.equal(options.redirect,'error');
  assert.equal(options.cache,'no-store');
  assert(!url.includes('pilot@')&&!url.includes('private-fixture'));
 }
 assert.equal(seen[1].options.method,'POST');
 assert.equal(seen[1].options.headers['X-CCG-CSRF'],csrf);
 assert.deepEqual(JSON.parse(seen[1].options.body),{email:'pilot@example.invalid',password:'private-fixture-only'});
});
test('wrong CSRF, failed member login, absent member, wrong JSON and transport errors fail closed',async()=>{
 const fixtures=[
  async(url)=>url.endsWith('/csrf')?reply({csrf:'bad'}):reply({}),
  async(url)=>url.endsWith('/csrf')?reply({csrf}):reply({error:'not released'},503),
  async(url)=>url.endsWith('/csrf')?reply({csrf}):url.endsWith('/login')?reply({authenticated:false}):reply({account:{id:uuid}}),
  async(url)=>url.endsWith('/csrf')?reply({csrf}):url.endsWith('/login')?reply({authenticated:true,csrf}):reply({account:null},401),
  async()=>{throw Error('network unavailable');},
  async()=>({ok:true,headers:{get:()=> 'text/html'},text:async()=>'<html>not json</html>'})
 ];
 for(const fake of fixtures){
  assert.equal(await signInHelioHostMember({
   origin:SITE,email:'pilot@example.invalid',password:'fixture',fetchImpl:fake
  }),false);
 }
});
test('opt-in sign-in is isolated from existing Supabase login, admin credentials and unrelated games',async()=>{
 const login=await readFile(new URL('../auth/heliohost-score-login.html',import.meta.url),'utf8');
 const standard=await readFile(new URL('../auth/login.html',import.meta.url),'utf8');
 const arena=await readFile(new URL('../js/ccg-c64/arena-preview.js',import.meta.url),'utf8');
 const style=await readFile(new URL('../resources/css/ccg-high-score-arena-preview.css',import.meta.url),'utf8');
 assert(login.includes('heliohost-score-login.js')&&login.includes('scoreMemberLogin'));
 assert(login.includes('Plesk password')&&login.includes('never automatically added'));
 assert(standard.includes('../js/ccg-supabase-client.js'),'existing Supabase login remains');
 assert(!login.includes('ccg-supabase-client.js'),'isolated score page does not impersonate old session');
 assert(arena.includes('if(scoreRequested)')&&arena.includes('data-ccg-sierra-member-signin'));
 assert(style.includes('a[data-ccg-sierra-member-signin]'));
 assert(!arena.includes('CCG_STAGING_MFA_KEY_HEX'));
});

test('native form fallback cannot send credentials if the module does not load', async () => {
 const login=await readFile(new URL('../auth/heliohost-score-login.html',import.meta.url),'utf8');
 assert.match(login, /<form[^>]+method="post"/);
 assert.match(login, /<button[^>]+id="scoreLoginSubmit"[^>]+disabled/);
 for (const input of login.matchAll(/<input[^>]*>/g)) assert.doesNotMatch(input[0], /\bname=/);
});
