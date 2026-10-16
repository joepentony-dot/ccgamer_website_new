#!/usr/bin/env python3
"""Read-only bulk C64 publisher candidate extractor from offline MAME software lists.

Use with local CC0 MAME c64_cass.xml, c64_cart.xml, c64_flop_orig.xml etc.
Never fetches network resources, modifies catalogue metadata, or touches game media.
The output is a research queue, NOT verified publisher assignments.
"""
import argparse
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

def identity(value):
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = value.replace("&", " and ").replace("+", " plus ")
    value = re.sub(r"['\u2018\u2019]", "", value)
    return re.sub(r"\s+", " ", re.sub(r"[^a-zA-Z0-9]+", " ", value).strip().lower())

def audit(unmatched_file, sources, batch_size):
    ledger = json.loads(Path(unmatched_file).read_text(encoding="utf-8"))
    keys = ledger.get("unmatched")
    collisions = ledger.get("packedPRGCollisionTitleKeys")
    if (ledger.get("auditScope") != "direct library + BLAST + packed PRG archive only"
        or not isinstance(keys, list) or not isinstance(collisions, list)
        or ledger.get("unmatchedTitleKeys") != len(keys)
        or len(set(keys)) != len(keys)
        or not all(isinstance(x, str) and identity(x) == x for x in keys+collisions)):
        raise ValueError("Invalid or noncanonical CCG unmatched/collision ledger")
    matches = defaultdict(list)
    for file in sources:
        src = Path(file)
        if not src.exists() or src.suffix.lower() != ".xml":
            raise ValueError("Expected existing local MAME .xml file: " + str(src))
        root = ET.parse(src).getroot()
        if root.tag != "softwarelist" or not root.attrib.get("name", "").startswith("c64_"):
            raise ValueError("Not a C64 MAME software list: " + str(src))
        list_name = root.attrib["name"]
        for software in root.findall("software"):
            title = (software.findtext("description") or "").strip()
            pub = (software.findtext("publisher") or "").strip()
            year = (software.findtext("year") or "").strip()
            key = identity(title)
            if not key or not pub or pub.lower() in {"<unknown>", "unknown", "-", "?", "(unknown)"}:
                continue
            matches[key].append({"softwareList":list_name,"sourceFile":src.name,
                                 "softwareId":software.get("name"),"cloneOf":software.get("cloneof"),
                                 "title":title,"publisher":pub,
                                 "yearCandidate":int(year) if re.fullmatch(r"(?:19|20)\d{2}",year) else None})
    candidates, review = [], []
    generic = {"game","demo","preview","test","menu","intro","utility","adventure","arcade"}
    for key in sorted(keys):
        hits = matches.get(key, [])
        if not hits:
            review.append({"key":key,"reason":"no-exact-c64-list-match"})
            continue
        if key in collisions:
            reason = "different-prg-hashes-same-title"
        elif key in generic or len(key) < 5:
            reason = "generic-or-short-title"
        elif any(h["cloneOf"] for h in hits):
            reason = "clone-or-reissue-present"
        elif len(hits) != 1:
            reason = "multiple-software-list-records"
        else:
            reason = None
        if reason:
            review.append({"key":key,"reason":reason,"hits":hits})
        else:
            candidates.append({"key":key,"publisherCandidate":hits[0]["publisher"],
                               "yearCandidate":hits[0]["yearCandidate"],
                               "status":"unverified-manual-review-required",
                               "source":hits[0]})
    return {"version":1,"mode":"read-only-mame-c64-bulk-candidates",
            "scope":ledger["auditScope"],"unmatchedInput":len(keys),
            "candidateCount":len(candidates),"reviewCount":len(review),
            "batchSize":batch_size,"candidateBatches":
                [candidates[i:i+batch_size] for i in range(0,len(candidates),batch_size)],
            "unmatchedOrAmbiguous":review}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--unmatched-json",required=True)
    p.add_argument("--mame-xml",required=True,nargs="+")
    p.add_argument("--batch-size",type=int,default=250)
    a=p.parse_args()
    if not 1<=a.batch_size<=1000:
        p.error("--batch-size must be between 1 and 1000")
    try:
        result=audit(a.unmatched_json,a.mame_xml,a.batch_size)
    except (OSError,ValueError,ET.ParseError,json.JSONDecodeError) as e:
        p.error(str(e))
    json.dump(result,sys.stdout,indent=2,ensure_ascii=False)
    print()

if __name__=="__main__":
    main()
