#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const project = fs.readFileSync(path.join(root, 'C64DungeonCarnage.Desktop.csproj'), 'utf8');
const source = fs.readFileSync(path.join(root, 'MainForm.cs'), 'utf8');
const manifest = fs.readFileSync(path.join(root, 'app.manifest'), 'utf8');

assert.match(project, /<TargetFramework>net8\.0-windows<\/TargetFramework>/);
assert.match(project, /<UseWindowsForms>true<\/UseWindowsForms>/);
assert.match(project, /Microsoft\.Web\.WebView2" Version="1\.0\.4191\.47"/);
assert.match(manifest, /requestedExecutionLevel level="asInvoker"/);

assert.match(source, /ApplicationId = "uk\.co\.cheekycommodoregamer\.c64-dungeon-carnage"/);
assert.match(source, /StableProfileId = "ccg-c64-dungeon-carnage"/);
assert.match(source, /ExpectedSchema = "ccg-c64-dungeon-carnage-desktop-staging-v1"/);
assert.match(source, /RequireString\(delivery, "mode", "desktop-offline"\)/);
assert.match(source, /RequireNull\(delivery, "injectBefore"\)/);
assert.match(source, /RequireNull\(delivery, "onlineScripts"\)/);
assert.doesNotMatch(source, /ExpectedOnlineGate/);
assert.doesNotMatch(source, /packaged online-services gate/);
assert.match(source, /RequireBoolean\(acceptance, "networkingRequired", false\)/);
assert.match(source, /RequireBoolean\(acceptance, "websiteRootSupabaseBootstrapAllowed", false\)/);
assert.match(source, /RequireBoolean\(acceptance, "rendererArbitraryFilesystemAccessAllowed", false\)/);
assert.match(source, /RequireBoolean\(acceptance, "rendererArbitraryProcessExecutionAllowed", false\)/);
assert.match(source, /RejectReparseTraversal\(rootPath, resolved, label\)/);
assert.match(source, /FileAttributes\.ReparsePoint/);
assert.match(source, /BeginInvoke\(new Action\(Close\)\)/);

const injectionIndex = source.indexOf('AddScriptToExecuteOnDocumentCreatedAsync(BuildDeliveryInjection())');
const navigationIndex = source.indexOf('core.Navigate($"https://{VirtualHost}/arcade/lost-sizzler/index.html")');
assert.ok(injectionIndex >= 0 && navigationIndex > injectionIndex, 'offline delivery injection must be registered before navigation');
assert.match(source, /mode: 'desktop-offline'/);
assert.match(source, /onlineScripts: null/);
assert.match(source, /SetVirtualHostNameToFolderMapping/);
assert.match(source, /LocalApplicationData/);
assert.match(source, /AddWebResourceRequestedFilter\("\*", CoreWebView2WebResourceContext\.All\)/);
assert.match(source, /403,\s*"Offline"/s);
assert.match(source, /AreHostObjectsAllowed = false/);
assert.match(source, /DownloadStarting \+= \(_, args\) => args\.Cancel = true/);

for (const host of [
  'cheekycommodoregamer.co.uk',
  'www.cheekycommodoregamer.co.uk',
  'patreon.com',
  'www.patreon.com',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'paypal.com',
  'www.paypal.com',
]) {
  assert.ok(source.includes(`"${host}"`), `external host allowlist missing ${host}`);
}

assert.doesNotMatch(source, /AddHostObjectToScript/);
assert.doesNotMatch(source, /Process\.Start\([^\n]*(?:cmd\.exe|powershell|pwsh)/i);
assert.doesNotMatch(source, /service[_-]?role|client[_-]?secret|password\s*=/i);
assert.doesNotMatch(source, /https?:\/\/[^\s"']+\.zip/i);
assert.doesNotMatch(source, /window\.__CCG_DUNGEON_CARNAGE_COMMERCE__/);

console.log('C64 Dungeon Carnage Windows WebView2 wrapper contract passed.');
