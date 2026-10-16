#!/usr/bin/env python3
"""Synthetic, offline regression for fail-closed GameBase64 title attribution."""
import csv
import json
import subprocess
import sys
import tempfile
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1] / 'scripts/c64/gamebase64-publisher-candidates.py'
with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)

    def table(name, columns, rows):
        output = root / (name + '.csv')
        with output.open('w', newline='', encoding='utf-8') as handle:
            writer = csv.writer(handle)
            writer.writerow(columns)
            writer.writerows(rows)
        return output

    games = table('Games', ['GA_Id', 'GA_Name', 'GA_Publisher', 'GA_Year'], [
        ['1', 'Zaxxon', '7', '6'],
        ['2', 'Armageddon', '8', '5'],
        ['3', 'Armageddon', '9', '5'],
        ['4', 'The Lost Crown', '404', '6'],
        ['5', 'Adventure', '7', '5'],
        ['6', 'Pong', '7', '5'],
        ['7', 'Unknown Game', '10', '6'],
        ['8', 'Shadow Fighter', '7', '6'],
    ])
    publishers = table('Publishers', ['PU_Id', 'PU_Name'], [
        ['7', 'Sega'], ['8', 'Ocean Software'], ['9', 'Visions Software Factory'],
        ['10', '(Unknown)']])
    years = table('Years', ['YE_Id', 'YE_Year'], [['5', '1983'], ['6', '1984']])
    titles = ['adventure', 'armageddon', 'pong', 'shadow fighter',
              'the lost crown', 'unknown game', 'zaxxon']
    ledger = root / 'unmatched.json'
    ledger.write_text(json.dumps({
        'auditScope': 'direct library + BLAST + packed PRG archive only',
        'unmatchedTitleKeys': len(titles),
        'packedPRGCollisionTitleKeys': ['armageddon', 'shadow fighter'],
        'unmatched': titles
    }))
    command = [sys.executable, str(TOOL), '--games', str(games),
               '--publishers', str(publishers), '--years', str(years),
               '--unmatched-json', str(ledger)]
    result = subprocess.run(command, capture_output=True, text=True, check=True)
    report = json.loads(result.stdout)
    assert report['candidateCount'] == 1, report
    assert report['manualReviewCount'] == 6, report
    assert report['candidates'][0]['key'] == 'zaxxon'
    assert report['candidates'][0]['publisherCandidate'] == 'Sega'
    assert report['candidates'][0]['releaseYearCandidate'] == 1984
    assert report['candidates'][0]['status'] == 'unverified-review-required'
    reasons = {entry['key']: entry['reason']
               for entry in report['unmatchedOrAmbiguous']}
    assert reasons == {
        'adventure': 'short-or-generic-title',
        'armageddon': 'multiple-playable-prg-hashes',
        'pong': 'short-or-generic-title',
        'shadow fighter': 'multiple-playable-prg-hashes',
        'the lost crown': 'missing-or-unknown-publisher',
        'unknown game': 'missing-or-unknown-publisher',
    }, reasons
    assert not any((root / filename).exists()
                   for filename in ('catalogue-metadata.json', 'library.json'))

    # The newer ledger includes active CRTs and deduplicated on-screen titles;
    # the same conservative GameBase policy must apply to ALL visible games.
    full_scope = ('direct library + active cartridges + BLAST + packed '
                  'PRG archive (loader-equivalent view)')
    full = {'auditScope': full_scope, 'unmatchedTitleKeys': len(titles),
            'packedPRGCollisionTitleKeys': ['armageddon', 'shadow fighter'],
            'unmatched': titles}
    ledger.write_text(json.dumps(full))
    full_report = json.loads(subprocess.run(
        command, capture_output=True, text=True, check=True).stdout)
    assert full_report['scope'] == full_scope
    assert full_report['candidateCount'] == 1
    assert full_report['manualReviewCount'] == 6
    assert full_report['candidates'][0]['key'] == 'zaxxon'
    assert full_report['unmatchedOrAmbiguous'] == report['unmatchedOrAmbiguous']

    # An arbitrary scope, duplicate key or noncanonical identity is rejected.
    ledger.write_text(json.dumps({**full, 'auditScope': 'invented-scope'}))
    invalid = subprocess.run(command, capture_output=True, text=True)
    assert invalid.returncode != 0
    assert 'Expected canonical, collision-aware' in invalid.stderr
    ledger.write_text(json.dumps({**full, 'unmatched': titles + ['zaxxon'],
                                   'unmatchedTitleKeys': len(titles) + 1}))
    invalid = subprocess.run(command, capture_output=True, text=True)
    assert invalid.returncode != 0
    ledger.write_text(json.dumps({**full, 'unmatched': titles[:-1] + ['Unknown Name'],
                                   'unmatchedTitleKeys': len(titles)}))
    invalid = subprocess.run(command, capture_output=True, text=True)
    assert invalid.returncode != 0
    ledger.write_text(json.dumps(full))

    # An ambiguity in publisher foreign keys must fail rather than guess.
    table('Publishers', ['PU_Id', 'PU_Name'], [
        ['7', 'Sega'], ['7', 'Ocean'], ['8', 'Ocean'],
        ['9', 'Visions Software Factory']])
    rejected = subprocess.run(command, capture_output=True, text=True)
    assert rejected.returncode != 0
    assert 'Conflicting publisher lookup ID' in rejected.stderr

    # Resume from a deterministic offset; no repeat of the first unmatched keys.
    table('Publishers', ['PU_Id', 'PU_Name'], [
        ['7', 'Sega'], ['8', 'Ocean Software'], ['9', 'Visions Software Factory'],
        ['10', '(Unknown)']])
    ledger.write_text(json.dumps(full))
    batch = json.loads(subprocess.run(
        command + ['--cursor', '0', '--batch-size', '3'],
        capture_output=True, text=True, check=True).stdout)
    assert batch['processedInBatch'] == 3 and batch['cursor'] == 0
    assert batch['nextCursor'] == 3 and not batch['complete']
    assert batch['candidateCount'] == 0 and batch['manualReviewCount'] == 3
    assert all(len(digest) == 64 for digest in batch['sourceSHA256'].values())

    quarantine = root / 'quarantine.json'
    quarantine.write_text(json.dumps({'version': 1, 'quarantined': [
        {'key': 'zaxxon', 'status': 'unverified-release-edition'}]}))
    tail = json.loads(subprocess.run(
        command + ['--cursor', '6', '--batch-size', '1',
                   '--quarantine-json', str(quarantine)],
        capture_output=True, text=True, check=True).stdout)
    assert tail['processedInBatch'] == 1 and tail['nextCursor'] == 7
    assert tail['complete'] and tail['candidateCount'] == 0
    assert tail['unmatchedOrAmbiguous'] == [
        {'key': 'zaxxon', 'reason': 'publisher-provenance-quarantine'}]
    assert 'quarantineJSON' in tail['sourceSHA256']

    rejected = subprocess.run(command + ['--cursor', '99'], capture_output=True, text=True)
    assert rejected.returncode != 0 and 'Cursor outside' in rejected.stderr
    rejected = subprocess.run(command + ['--batch-size', '0'], capture_output=True, text=True)
    assert rejected.returncode != 0 and 'Batch size' in rejected.stderr
    quarantine.write_text(json.dumps({'version': 1, 'quarantined': [
        {'key': 'zaxxon', 'status': 'unverified-release-edition'},
        {'key': 'zaxxon', 'status': 'unverified-release-edition'}]}))
    rejected = subprocess.run(command + ['--quarantine-json', str(quarantine)],
                              capture_output=True, text=True)
    assert rejected.returncode != 0 and 'repeated publisher quarantine' in rejected.stderr

print('PASS: GameBase candidate-only joins, collision quarantine and fail-closed identities')
