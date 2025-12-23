"""Generate quiz pack JSON from spreadsheet CSV exports.

This script reads two CSV files produced by ``download_quiz_sheets.py``:

- ``data/quiz_sets.csv`` ("Quiz Sets" sheet)
- ``data/questions.csv`` ("Questions" sheet)

It outputs a JSON payload shaped as ``{"packs": [...]}`` ready for the quiz UI.
"""
from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, MutableMapping

DEFAULT_DIFFICULTY = "Medium"
QUIZ_SETS_FILENAME = "quiz_sets.csv"
QUESTIONS_FILENAME = "questions.csv"


def _first_value(row: MutableMapping[str, str], keys: Iterable[str]) -> str | None:
    for key in keys:
        if key in row:
            value = row[key].strip()
            if value:
                return value
    return None


def _parse_int(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def load_quiz_sets(csv_path: Path) -> List[Dict[str, Any]]:
    with csv_path.open(newline="", encoding="utf-8") as fp:
        reader = csv.DictReader(fp)
        sets = []
        for row in reader:
            set_id = _first_value(row, ["Set ID", "set_id", "id"])
            if not set_id:
                raise ValueError("Quiz Sets sheet missing 'Set ID' for a row")

            name = _first_value(row, ["Quiz Name", "Name", "name"])
            if not name:
                raise ValueError(f"Quiz set {set_id!r} is missing a name")

            icon = _first_value(row, ["Icon", "icon"])
            question_count = _parse_int(_first_value(row, ["Question Count", "question_count"]))
            difficulty = _first_value(row, ["Difficulty", "difficulty"]) or DEFAULT_DIFFICULTY
            description = _first_value(row, ["Description", "description"])

            quiz_set: Dict[str, Any] = {
                "id": set_id,
                "name": name,
                "difficulty": difficulty,
            }

            if description:
                quiz_set["description"] = description
            if icon:
                quiz_set["icon"] = icon
            if question_count is not None:
                quiz_set["questionCount"] = question_count

            sets.append(quiz_set)

    return sets


def load_questions(csv_path: Path) -> Dict[str, List[Dict[str, Any]]]:
    questions_by_set: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    with csv_path.open(newline="", encoding="utf-8") as fp:
        reader = csv.DictReader(fp)
        for row in reader:
            set_id = _first_value(row, ["Set ID", "set_id", "Quiz Set ID", "Quiz Set"])
            if not set_id:
                # Skip rows we cannot associate with a set.
                continue

            question_text = _first_value(row, ["Question", "question"]) or ""
            options: List[str] = []
            for option_key in ["Option 1", "Option 2", "Option 3", "Option 4"]:
                option_value = _first_value(row, [option_key, option_key.lower()])
                if option_value:
                    options.append(option_value)

            answer_index_raw = _first_value(row, ["Answer Index", "answer_index", "answer"])
            answer_index = (_parse_int(answer_index_raw) or 1) - 1
            answer_index = max(0, answer_index)
            if options:
                answer_index = min(answer_index, len(options) - 1)

            image_url = _first_value(row, ["Image URL", "image", "imageUrl"])
            audio_url = _first_value(row, ["Audio URL", "audio", "audioUrl"])
            game_name = _first_value(row, ["Game Name", "game", "gameName"])

            questions_by_set[set_id].append(
                {
                    "question": question_text,
                    "options": options,
                    "correctIndex": answer_index,
                    **({"imageUrl": image_url} if image_url else {}),
                    **({"audioUrl": audio_url} if audio_url else {}),
                    **({"gameName": game_name} if game_name else {}),
                }
            )

    return questions_by_set


def build_packs(quiz_sets: List[Dict[str, Any]], questions_by_set: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
    packs = []
    for quiz_set in quiz_sets:
        set_id = quiz_set["id"]
        questions = []
        for index, raw_question in enumerate(questions_by_set.get(set_id, []), start=1):
            question = dict(raw_question)
            question["id"] = f"{set_id}-{index}"
            questions.append(question)

        pack = {
            "id": set_id,
            "name": quiz_set["name"],
            "difficulty": quiz_set.get("difficulty", DEFAULT_DIFFICULTY),
            "questions": questions,
        }
        if "description" in quiz_set:
            pack["description"] = quiz_set["description"]
        if "icon" in quiz_set:
            pack["icon"] = quiz_set["icon"]
        if "questionCount" in quiz_set:
            pack["questionCount"] = quiz_set["questionCount"]

        packs.append(pack)

    return {"packs": packs}


def write_output(data: Dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"Wrote quiz data to {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build quiz JSON from CSV exports.")
    parser.add_argument("--data-dir", type=Path, default=Path("data"), help="Directory containing quiz_sets.csv and questions.csv")
    parser.add_argument("--output", type=Path, default=Path("quiz/quiz-data.json"), help="Destination JSON file")
    args = parser.parse_args()

    data_dir: Path = args.data_dir
    output_path: Path = args.output

    quiz_sets_path = data_dir / QUIZ_SETS_FILENAME
    questions_path = data_dir / QUESTIONS_FILENAME

    if not quiz_sets_path.exists():
        raise SystemExit(f"Missing quiz sets CSV: {quiz_sets_path}")
    if not questions_path.exists():
        raise SystemExit(f"Missing questions CSV: {questions_path}")

    quiz_sets = load_quiz_sets(quiz_sets_path)
    questions_by_set = load_questions(questions_path)
    payload = build_packs(quiz_sets, questions_by_set)
    write_output(payload, output_path)


if __name__ == "__main__":
    main()
