import test from "node:test";
import assert from "node:assert/strict";
import { createHash,webcrypto } from "node:crypto";
import {
  previewRequestEnabled,verifyCrossfirePreviewMedia
} from "../js/ccg-c64/arena-preview.js";
const entry={
  id:"archive-02121",format:"prg",
  sha256:"ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9"
};
test("preview stays disabled unless explicitly requested",()=>{
  assert.equal(previewRequestEnabled(""),false);
  assert.equal(previewRequestEnabled("?ccg_arena_preview=crossfire"),true);
  assert.equal(previewRequestEnabled("?ccg_arena_preview=crossfire-tron"),false);
  assert.equal(previewRequestEnabled("?foo=bar"),false);
});
test("only exact Crossfire edition and exact SHA-256 of loaded bytes may activate",async()=>{
  const bytes=new Uint8Array(23637);
  const correctDigest=Buffer.from(entry.sha256,"hex");
  const fakeCrypto={
    digest:async (_algo,input)=>{
      assert.equal(input,bytes);
      return correctDigest.buffer.slice(correctDigest.byteOffset,correctDigest.byteOffset+correctDigest.byteLength);
    }
  };
  assert.equal(await verifyCrossfirePreviewMedia(entry,bytes,fakeCrypto),true);
  assert.equal(await verifyCrossfirePreviewMedia({...entry,id:"archive-02122"},bytes,fakeCrypto),false);
  assert.equal(await verifyCrossfirePreviewMedia({...entry,format:"d64"},bytes,fakeCrypto),false);
  assert.equal(await verifyCrossfirePreviewMedia(entry,bytes.subarray(0,50),fakeCrypto),false);
  assert.equal(await verifyCrossfirePreviewMedia(entry,bytes,{
    digest:async()=>new Uint8Array(32).buffer
  }),false);
  assert.equal(await verifyCrossfirePreviewMedia(entry,bytes,null),false);
});
test("client-side score preview is separate from real registration and submissions",async()=>{
  const {ARENA_CROSSFIRE_PROFILE}=await import("../scripts/high-score-arena/arena-game-profiles.mjs");
  assert.equal(ARENA_CROSSFIRE_PROFILE.publicSubmissionEnabled,false);
  const {readFileSync}=await import("node:fs");
  const source=readFileSync(new URL("../js/ccg-c64/arena-preview.js",import.meta.url),"utf8");
  assert.doesNotMatch(source,/\\.from\\s*\\(\\s*['"]ccg_arena_attempts/);
  assert.doesNotMatch(source,/\\.insert\\(|\\.upsert\\(|\\.update\\(/);
  assert.match(source,/LOCAL DIAGNOSTIC ONLY/);
});
