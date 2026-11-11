import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseChannelFeed, refreshFeed } from "../scripts/sync-latest-youtube-feed.mjs";

const CHANNEL = "UCHROCLVcatA449Gg-PoqlKw";
const id1 = "eciifDta8Kk";
const id2 = "ygPOtslHRfk";
const id3 = "cNv9J-MhMA0";

function sampleFeed(entries = [
    { id: id2, title: "Older title", published: "2026-11-08T12:00:00Z" },
    { id: id1, title: "Gloom &amp; the Amiga", published: "2026-11-11T12:00:00Z" },
    { id: id3, title: "Arcade quiz", published: "2026-11-07T12:00:00Z" }
]) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">' +
        '<yt:channelId>' + CHANNEL + '</yt:channelId>' +
        entries.map((e) => '<entry><yt:videoId>' + e.id + '</yt:videoId>' +
            '<yt:channelId>' + CHANNEL + '</yt:channelId>' +
            '<title>' + e.title + '</title><published>' + e.published +
            '</published></entry>').join("") + '</feed>';
}

test("valid RSS sorts by verified YouTube publication date and decodes XML titles", () => {
    const items = parseChannelFeed(sampleFeed());
    assert.deepEqual(items.map(x => x.id), [id1, id2, id3]);
    assert.equal(items[0].title, "Gloom & the Amiga");
    assert.equal(items[0].publishedAt, "2026-11-11T12:00:00.000Z");
    assert.equal(items[0].thumbnail, "https://i.ytimg.com/vi/" + id1 + "/mqdefault.jpg");
});

test("accepts YouTube Atom channelId values without their canonical UC prefix", () => {
    const feed = sampleFeed().replaceAll(
        "<yt:channelId>" + CHANNEL + "</yt:channelId>",
        "<yt:channelId>" + CHANNEL.slice(2) + "</yt:channelId>"
    );
    const items = parseChannelFeed(feed);
    assert.deepEqual(items.map(item => item.id), [id1, id2, id3]);
});

test("rejects a feed from another channel or one with too few valid videos", () => {
    assert.throws(() => parseChannelFeed(sampleFeed().replace("<yt:channelId>" + CHANNEL + "</yt:channelId>",
        "<yt:channelId>another</yt:channelId>")), /channel ID mismatch/);
    assert.throws(() => parseChannelFeed(sampleFeed([
        { id: id1, title: "One", published: "2026-11-11T12:00:00Z" }
    ])), /Insufficient/);
});

test("skips duplicates, invalid IDs and unverified publication dates", () => {
    const videos = parseChannelFeed(sampleFeed([
        { id: id1, title: "Gloom", published: "2026-11-11T12:00:00Z" },
        { id: id1, title: "Duplicate", published: "2026-11-09T12:00:00Z" },
        { id: "invalid!", title: "Bad ID", published: "2026-11-09T12:00:00Z" },
        { id: id2, title: "Second", published: "2026-11-08T12:00:00Z" },
        { id: id3, title: "Third", published: "2026-11-07T12:00:00Z" },
        { id: "zMXcRkNz8_q", title: "Undated", published: "missing" }
    ]));
    assert.deepEqual(videos.map(x => x.id), [id1, id2, id3]);
});

test("feed refresh changes the seed once and preserves the last good payload on failure", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-youtube-feed-"));
    const file = path.join(dir, "latest.json");
    try {
        fs.writeFileSync(file, JSON.stringify({ source: "site-archive-seed", videos: [{ id: id1 }] }));
        const mocked = async () => ({ ok: true, text: async () => sampleFeed() });
        const first = await refreshFeed(mocked, file);
        assert.equal(first.changed, true);
        const text = fs.readFileSync(file, "utf8");
        assert.equal(JSON.parse(text).videos[0].id, id1);
        assert.equal(JSON.parse(text).source, "youtube-atom-feed");
        const second = await refreshFeed(mocked, file);
        assert.equal(second.changed, false);
        assert.equal(fs.readFileSync(file, "utf8"), text);
        await assert.rejects(refreshFeed(async () => ({ ok: true, text: async () => "<feed>bad</feed>" }), file));
        assert.equal(fs.readFileSync(file, "utf8"), text);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("homepage reads the channel feed first, retaining the existing site index fallback", () => {
    const source = fs.readFileSync(new URL("../js/ccg-recent-content.js", import.meta.url), "utf8");
    assert.match(source, /RECENT_FEED_PATH = "\/data\/latest-youtube-videos\.json"/);
    assert.match(source, /getVideos\(RECENT_FEED_PATH, "videos"\)/);
    assert.match(source, /getVideos\(VIDEO_INDEX_PATH, "items"\)/);
    assert.ok(source.indexOf('getVideos(RECENT_FEED_PATH, "videos")') <
        source.indexOf('getVideos(VIDEO_INDEX_PATH, "items")'));
    const seed = JSON.parse(fs.readFileSync(new URL("../data/latest-youtube-videos.json", import.meta.url), "utf8"));
    assert.equal(seed.videos[0].id, id1);
    assert.equal(seed.videos[0].publishedAt, undefined, "Do not invent a YouTube publication date in the seed");
});
