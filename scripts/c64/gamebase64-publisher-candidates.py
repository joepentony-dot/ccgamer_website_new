#!/usr/bin/env python3
"""Offline GameBase64 v19 CSV publisher candidate audit.

Reads exported Games, Publishers and Years tables plus CCG's --unmatched-json
output. Prints unverified proposals only. Never modifies game media, catalogue,
metadata, source CSV or the repository. No fuzzy auto-attribution.
"""
import argparse
import csv
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path


def key(title):
    value = unicodedata.normalize('NFKD', str(title)).encode('ascii', 'ignore').decode('ascii')
    value = value.replace('&', ' and ').replace('+', ' plus ')
    value = re.sub(r"['‘’`]", '', value)
    value = re.sub(r'[^a-zA-Z0-9]+', ' ', value).strip().lower()
    value = re.sub(r'\s+', ' ', value)
    return 'le mans' if value == 'lemans' else value


def read_csv(filename):
    with Path(filename).open(encoding='utf-8-sig', newline='') as handle:
        rows = csv.DictReader(handle)
        if not rows.fieldnames:
            raise ValueError(f'{filename}: missing CSV header')
        return {name.strip().lower(): name for name in rows.fieldnames}, list(rows)


def field(columns, possibilities, label):
    for option in possibilities:
        if option.lower() in columns:
            return columns[option.lower()]
    raise ValueError(f'Missing {label}; found only: {sorted(columns)}')


def lookup(rows, id_col, name_col, kind):
    values = {}
    for row in rows:
        code, name = row[id_col].strip(), row[name_col].strip()
        if not code:
            continue
        if code in values and values[code] != name:
            raise ValueError(f'Conflicting {kind} lookup ID: {code}')
        values[code] = name
    return values


def audit(game_file, publisher_file, year_file, unmatched_file):
    gf, games = read_csv(game_file)
    pf, publishers = read_csv(publisher_file)
    yf, years = read_csv(year_file)
    game_id = field(gf, ['GA_Id'], 'Games.GA_Id')
    title = field(gf, ['GA_Name'], 'Games.GA_Name')
    pub_fk = field(gf, ['GA_Publisher'], 'Games.GA_Publisher')
    year_fk = field(gf, ['GA_Year'], 'Games.GA_Year')
    p_id = field(pf, ['PU_Id'], 'Publishers.PU_Id')
    p_name = field(pf, ['PU_Name'], 'Publishers.PU_Name')
    y_id = field(yf, ['YE_Id'], 'Years.YE_Id')
    y_name = field(yf, ['YE_Year', 'YE_Name'], 'Years.YE_Year / YE_Name')
    pub_table = lookup(publishers, p_id, p_name, 'publisher')
    year_table = lookup(years, y_id, y_name, 'year')
    ledger = json.loads(Path(unmatched_file).read_text(encoding='utf-8'))
    unmatched = ledger.get('unmatched')
    collision = ledger.get('packedPRGCollisionTitleKeys')
    supported_scopes = {
        'direct library + BLAST + packed PRG archive only',
        'direct library + active cartridges + BLAST + packed PRG archive (loader-equivalent view)',
    }
    if (ledger.get('auditScope') not in supported_scopes
            or not isinstance(unmatched, list)
            or not all(isinstance(x, str) for x in unmatched)
            or ledger.get('unmatchedTitleKeys') != len(unmatched)
            or len(set(unmatched)) != len(unmatched)
            or not isinstance(collision, list)
            or not all(isinstance(x, str) for x in collision)
            or any(key(x) != x for x in unmatched + collision)):
        raise ValueError('Expected canonical, collision-aware CCG unmatched JSON ledger')
    excluded = set(collision)
    index = defaultdict(list)
    seen_ids = set()
    for row in games:
        ident, game_title = row[game_id].strip(), row[title].strip()
        if not ident or not game_title:
            continue
        if ident in seen_ids:
            raise ValueError(f'Duplicate GameBase Games.GA_Id: {ident}')
        seen_ids.add(ident)
        index[key(game_title)].append((ident, game_title, row[pub_fk].strip(), row[year_fk].strip()))
    generic = {'game', 'demo', 'preview', 'test', 'menu', 'intro', 'utility',
               'part 1', 'part 2', 'side a', 'side b', 'unknown', 'adventure', 'arcade'}
    candidates, review = [], []
    for identity in sorted(unmatched):
        hits = index.get(identity, [])
        if not hits:
            review.append({'key': identity, 'reason': 'no-exact-title-match'})
            continue
        if identity in excluded:
            reason = 'multiple-playable-prg-hashes'
        elif len(hits) != 1:
            reason = 'multiple-gamebase-records'
        elif identity in generic or len(identity) < 5:
            reason = 'short-or-generic-title'
        else:
            reason = None
        if reason:
            review.append({'key': identity, 'reason': reason,
                           'gamebaseIds': sorted(x[0] for x in hits)})
            continue
        ident, source_title, publisher_id, year_id = hits[0]
        publisher = pub_table.get(publisher_id, '').strip()
        if not publisher or publisher.lower() in {
                'unknown', '(unknown)', 'none', 'n/a', 'not listed', '-'}:
            review.append({'key': identity, 'reason': 'missing-or-unknown-publisher',
                           'gamebaseIds': [ident]})
            continue
        raw_year = year_table.get(year_id, '').strip()
        year = int(raw_year) if re.fullmatch(r'19\d{2}|20\d{2}', raw_year) else None
        candidates.append({'key': identity, 'publisherCandidate': publisher,
                           'releaseYearCandidate': year,
                           'status': 'unverified-review-required',
                           'source': {'database': 'GameBase64 v19 (local CSV export)',
                                      'Games.GA_Id': ident, 'Games.GA_Name': source_title,
                                      'Games.GA_Publisher': publisher_id,
                                      'Games.GA_Year': year_id}})
    return {'version': 1, 'mode': 'read-only-research-candidates',
            'scope': ledger['auditScope'], 'unmatchedInput': len(unmatched),
            'candidateCount': len(candidates), 'manualReviewCount': len(review),
            'candidates': candidates, 'unmatchedOrAmbiguous': review}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('games', 'publishers', 'years', 'unmatched-json'):
        parser.add_argument('--' + name, required=True)
    args = parser.parse_args()
    try:
        result = audit(args.games, args.publishers, args.years, args.unmatched_json)
    except (OSError, ValueError, csv.Error, json.JSONDecodeError) as exc:
        parser.error(str(exc))
    json.dump(result, sys.stdout, indent=2, ensure_ascii=False)
    print()


if __name__ == '__main__':
    main()
