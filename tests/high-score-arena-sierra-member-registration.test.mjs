import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 registerHelioHostScoreMember,
 verifyHelioHostScoreEmail,
 initHelioHostScoreRegister
} from '../resources/js/auth/heliohost-score-register.js';

const SITE='https://www.cheekycommodoregamer.co.uk';
const API='https://api.cheekycommodoregamer.co.uk';
const csrf='a'.repeat(64);
const code='b'.repeat(64);
function reply(data,status=200) {
 return {
  ok:status>=200&&status<300,
  headers:{get:field=>field==='content-type'?'application/json; charset=utf-8':null},
  text:async()=>JSON.stringify(data)
 };
}

test('registration and proof require canonical website origin and valid shape before network',async()=>{
 let called=0;
 const unexpected=async()=>{called++;throw Error('no network allowed');};
 for(const origin of ['', 'http://localhost:8080','https://evil.example']){
  assert.equal(await registerHelioHostScoreMember({
   email:'fixture@example.invalid',password:'a very long fictional password',
   origin,fetchImpl:unexpected
  }),'invalid');
  assert.equal(await verifyHelioHostScoreEmail({token:code,origin,fetchImpl:unexpected}),'invalid');
 }
 for(const [email,password] of [
  ['not-an-email','a long enough fictional password'],
  ['fixture@example.invalid','short'],
  ['fixture@example.invalid','a'.repeat(1025)],
  ['fixture@example.invalid','long enough\0invalid']
 ]){
  assert.equal(await registerHelioHostScoreMember({email,password,origin:SITE,fetchImpl:unexpected}),'invalid');
 }
 assert.equal(await verifyHelioHostScoreEmail({token:'bad',origin:SITE,fetchImpl:unexpected}),'invalid');
 assert.equal(called,0);
});

test('enrollment calls separate host-only csrf and signup with no secret in URL',async()=>{
 const captured=[];
 const fake=async(url,options)=>{
  captured.push({url,options});
  if(url===API+'/v1/member/csrf')return reply({csrf});
  if(url===API+'/v1/member/signup')return reply({accepted:true},202);
  throw Error('Unexpected route');
 };
 const result=await registerHelioHostScoreMember({
  email:'fixture@example.invalid',password:'a fictional example secret',origin:SITE,fetchImpl:fake
 });
 assert.equal(result,'accepted');
 assert.deepEqual(captured.map(x=>x.url),[
  API+'/v1/member/csrf',API+'/v1/member/signup'
 ]);
 assert.equal(captured[0].options.method,'GET');
 assert.equal(captured[1].options.method,'POST');
 assert.equal(captured[1].options.headers['X-CCG-CSRF'],csrf);
 assert.deepEqual(JSON.parse(captured[1].options.body),{
  email:'fixture@example.invalid',password:'a fictional example secret'
 });
 for(const {url,options} of captured){
  assert.equal(options.credentials,'include');
  assert.equal(options.redirect,'error');
  assert.equal(options.cache,'no-store');
  assert.equal(options.mode,'cors');
  assert(!url.includes('@')&&!url.includes('secret'));
 }
});

test('verification sends proof only via protected POST body without signing member in',async()=>{
 const seen=[];
 const fake=async (url,options)=>{
  seen.push({url,options});
  if(url===API+'/v1/member/csrf')return reply({csrf});
  if(url===API+'/v1/member/verify-email')return reply({verified:true});
  throw Error('Unexpected request');
 };
 assert.equal(await verifyHelioHostScoreEmail({token:code,origin:SITE,fetchImpl:fake}),'verified');
 assert.deepEqual(seen.map(x=>x.url),[
  API+'/v1/member/csrf',API+'/v1/member/verify-email'
 ]);
 assert.deepEqual(JSON.parse(seen[1].options.body),{token:code});
 assert.equal(seen[1].options.headers['X-CCG-CSRF'],csrf);
 assert.equal(seen[1].options.credentials,'include');
 assert(!seen.some(x=>x.url.includes(code)||x.url.includes('login')));
});

test('unreleased service, missing token, malformed responses and transport errors fail closed',async()=>{
 const scenarios=[
  async()=>reply({error:'not released'},503),
  async(url)=>url.endsWith('/csrf')?reply({csrf:'wrong'}):reply({accepted:true},202),
  async(url)=>url.endsWith('/csrf')?reply({csrf}):reply({error:'not released'},503),
  async(url)=>url.endsWith('/csrf')?reply({csrf}):reply({accepted:false},202),
  async()=>{throw Error('simulated outage');},
  async()=>({ok:true,headers:{get:()=> 'text/html'},text:async()=>'<html>bad</html>'})
 ];
 for(const fake of scenarios){
  assert.equal(await registerHelioHostScoreMember({
   email:'fixture@example.invalid',password:'a fictional example secret',origin:SITE,fetchImpl:fake
  }),'unavailable');
  assert.equal(await verifyHelioHostScoreEmail({
   token:code,origin:SITE,fetchImpl:fake
  }),'unavailable');
 }
});

test('separate source-only page preserves safe native form fallback and no Supabase login',async()=>{
 const html=await readFile(new URL('../auth/heliohost-score-register.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../resources/js/auth/heliohost-score-register.js',import.meta.url),'utf8');
 const existing=await readFile(new URL('../auth/heliohost-score-login.html',import.meta.url),'utf8');
 const standard=await readFile(new URL('../auth/login.html',import.meta.url),'utf8');
 assert(html.includes('scoreMemberRegistration')&&html.includes('scoreMemberVerification'));
 assert(html.includes('heliohost-score-register.js'));
 assert(html.includes('not your existing Cheeky Commodore Gamer website login'));
 assert(html.includes('human approval'));
 assert(html.includes('noindex,nofollow') && html.includes('no-referrer'));
 assert(!html.includes('ccg-supabase-client.js'));
 assert(!js.includes('localStorage')&&!js.includes('sessionStorage'));
 assert(!js.includes('new URLSearchParams'));
 assert(existing.includes('heliohost-score-login.js'));
 assert(standard.includes('ccg-supabase-client.js'));
 for(const form of html.matchAll(/<form[^>]*>/g))assert.match(form[0],/method="post"/);
 for(const input of html.matchAll(/<input[^>]*>/g))assert.doesNotMatch(input[0],/\bname=/);
 for(const button of html.matchAll(/<button[^>]*>/g))assert.match(button[0],/disabled/);
 assert.equal(initHelioHostScoreRegister({}, {origin:SITE},async()=>{}),false);
});
