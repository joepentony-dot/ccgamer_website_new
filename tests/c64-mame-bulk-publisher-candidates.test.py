#!/usr/bin/env python3
"""Synthetic offline fail-closed batch-MAME research test."""
import importlib.util
import json
import tempfile
from pathlib import Path

script=Path(__file__).resolve().parents[1]/"scripts/c64/mame-bulk-publisher-candidates.py"
spec=importlib.util.spec_from_file_location("mame_bulk",script)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
with tempfile.TemporaryDirectory() as folder:
    root=Path(folder)
    xml=root/"c64_cass.xml"
    xml.write_text("""<softwarelist name="c64_cass">
    <software name="game1"><description>Distinctive Test Title</description><year>1987</year><publisher>Ocean</publisher></software>
    <software name="game2"><description>Armageddon</description><year>1983</year><publisher>Visions</publisher></software>
    <software name="game3"><description>Duplicate Title</description><year>1986</year><publisher>Company A</publisher></software>
    <software name="game4"><description>Duplicate Title</description><year>1987</year><publisher>Company B</publisher></software>
    <software name="game5"><description>Test</description><year>1980</year><publisher>Made Up</publisher></software>
    <software name="game6"><description>Unknown Name</description><year>19??</year><publisher>&lt;unknown&gt;</publisher></software>
    </softwarelist>""",encoding="utf-8")
    keys=["armageddon","distinctive test title","duplicate title","test","unknown name"]
    ledger=root/"unmatched.json"
    ledger.write_text(json.dumps({"auditScope":"direct library + BLAST + packed PRG archive only",
        "unmatched":keys,"unmatchedTitleKeys":len(keys),
        "packedPRGCollisionTitleKeys":["armageddon"]}),encoding="utf-8")
    report=mod.audit(ledger,[xml],250)
    assert report["candidateCount"]==1, report
    assert report["candidateBatches"][0][0]["publisherCandidate"]=="Ocean"
    reasons={v["key"]:v["reason"] for v in report["unmatchedOrAmbiguous"]}
    assert reasons=={"armageddon":"different-prg-hashes-same-title",
        "duplicate title":"multiple-software-list-records",
        "test":"generic-or-short-title","unknown name":"no-exact-c64-list-match"},reasons
    # A separately researched ambiguous title must never re-enter a bulk
    # attribution queue solely because MAME contains an exact title.
    quarantine=root/"publisher-research-sources.json"
    quarantine.write_text(json.dumps({"version":1, "quarantined":[
        {"key":"distinctive test title","status":"unverified-regional-edition"}]}),
        encoding="utf-8")
    held=mod.audit(ledger,[xml],250,quarantine)
    assert held["candidateCount"]==0, held
    assert held["quarantineSourceKeys"]==1
    assert held["quarantinedUnmatchedKeys"]==1
    reasons_held={entry["key"]:entry["reason"]
                  for entry in held["unmatchedOrAmbiguous"]}
    assert reasons_held["distinctive test title"]=="publisher-provenance-quarantine"
    # Duplicate or malformed quarantine identities fail rather than silently
    # reviving a title with a potentially incorrect regional publisher.
    quarantine.write_text(json.dumps({"version":1, "quarantined":[
        {"key":"distinctive test title","status":"unverified-regional-edition"},
        {"key":"distinctive test title","status":"unverified-regional-edition"}]}))
    try:
        mod.audit(ledger,[xml],250,quarantine)
    except ValueError: pass
    else: raise AssertionError("Duplicate quarantine entry accepted")
    assert not (root/"catalogue-metadata.json").exists()
    xml.write_text("<softwarelist name='amiga_flop'/>")
    try:
        mod.audit(ledger,[xml],250)
    except ValueError: pass
    else: raise AssertionError("Non-C64 source accepted")
print("PASS: offline bulk MAME matching, batch generation, quarantine, no metadata mutation")
