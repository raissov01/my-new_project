#!/usr/bin/env python3
"""
Inject web-verified Cambridge IELTS reading answer keys into passages.json files.
Overwrites any existing answer_keys with the definitive 40-Q sets.

Usage:
  python3 scripts/inject_verified_answers.py
  python3 scripts/inject_verified_answers.py --book 13
"""
import json, argparse
from pathlib import Path

OCR_BASE = Path("/home/midoriya/my-new_project/scripts/cambridge_ocr")

# ── Verified answer keys ─────────────────────────────────────────────────────
# Format: {book: {test: [Q1, Q2, ..., Q40]}}  (1-indexed list, index 0 unused)

ANSWERS = {
    12: {
        1: [None,  # placeholder so index 1 = Q1
            "NOT GIVEN","FALSE","FALSE","TRUE","TRUE",
            "taste","cheaper","convenient","image","sustainable",
            "recycled","biodiversity","desertification",
            "antiques","triumph","information","contact","hunt","aimless",
            "educational","Trainspotting",
            "NOT GIVEN","FALSE","NOT GIVEN","TRUE","TRUE",
            "vi","viii","ii","iv","iii","vii",
            "fire science","investigators","evidence","prosecution",
            "NOT GIVEN","YES","NO","NO",
        ],
        2: [None,
            "A","B","H","D","B","C","G","B","A","D",
            "E","C","D",
            "iv","vi","viii","v","i","vii","iii",
            "TRUE","FALSE","FALSE","NOT GIVEN","rubber","farmer",
            "eye movements","language co-activation","Stroop Task","conflict management","cognitive control",
            "YES","NOT GIVEN","NO","NO","NOT GIVEN",
            "D","G","B","C",
        ],
        3: [None,
            "v","iii","viii","i","iv","vi","ii",
            "pirates","food","oil","settlers","species","eggs",
            "D","C","F","G","D","B",
            "vaccinations","antibiotics","mosquitoes","factories","forests","Polio","mountain",
            "dopamine","pleasure","caudate","anticipatory phase","food",
            "B","C","A","B","D","F","B","E","C",
        ],
        4: [None,
            "obsidian","spears","beads","impurities","Romans","lead","clouding","taxes",
            "TRUE","FALSE","NOT GIVEN","TRUE","FALSE",
            "D","A","C","A","C","E","D","F","A",
            "NO","NOT GIVEN","YES","YES",
            "iv","ii","vi","viii","vii","i","iii",
            "YES","NOT GIVEN","NO","NO",
            "information","financial","shareholders",
        ],
    },
    13: {
        1: [None,
            "update","environment","captain","films","season","accommodation","blog",
            "FALSE","NOT GIVEN","FALSE","TRUE","NOT GIVEN","TRUE",
            "iv","vi","i","v","viii","iii",
            "E","B","D","A","focus","pleasure","curiosity",
            "B","C","C","D","A","D","A","E","C","G","B",
            "YES","NOT GIVEN","NO",
        ],
        2: [None,
            "oils","friendship","funerals","wealth","indigestion","India","camels","Alexandria","Venice",
            "TRUE","FALSE","NOT GIVEN","FALSE",
            "B","F","B","E","A","B","C",
            "animals","childbirth","placebo","game","strangers","names",
            "D","C","A","D","D","D","C","B","A","C","A","B","C","D",
        ],
        3: [None,
            "furniture","sugar","ropes","charcoal","bowls","hormones","cosmetics","dynamite",
            "FALSE","FALSE","NOT GIVEN","TRUE","NOT GIVEN",
            "B","C","A","B",
            "recording devices","fathers","bridge hypothesis","repertoire","audio-recording vests","vocabulary",
            "F","A","E",
            "C","H","A","B","D",
            "shells","lake","rainfall","grains","pottery",
            "B","A","D","A",
        ],
        4: [None,
            "FALSE","FALSE","TRUE","TRUE","FALSE","TRUE","NOT GIVEN","TRUE",
            "wool","navigator","gale","training","fire",
            "minerals","carbon","water","agriculture",
            "C","E","A","D","E","C","F","G","F",
            "D","A","B","F","B","G","E","A",
            "YES","NOT GIVEN","NO","NOT GIVEN","YES","NO",
        ],
    },
    14: {
        1: [None,
            "creativity","rules","cities","traffic","crime","competition","evidence","life",
            "TRUE","TRUE","NOT GIVEN","FALSE","TRUE",
            "E","C","F","C","A","D","B","E","D",
            "activists","consumerism","leaflets","police",
            "E","D","B","D","C",
            "YES","NO","NO","NOT GIVEN",
            "restaurants","performance","turnover","goals","characteristics",
        ],
        2: [None,
            "FALSE","TRUE","NOT GIVEN","FALSE","NOT GIVEN","TRUE","FALSE","TRUE",
            "merchant","equipment","gifts","canoe","mountains",
            "F","C","E","D","B",
            "designs","pathogens","tuberculosis","wards","communal","public","miasmas","cholera",
            "vi","i","iii","ii","ix","vii","iv","viii",
            "productive","perfectionists","dissatisfied",
            "TRUE","FALSE","NOT GIVEN",
        ],
        3: [None,
            "B","A","D","NOT GIVEN","NO","YES","B","C","B","A","A","C","A",
            "C","H","A","F","I","B","E","B","C",
            "ecology","prey","habitats","antibiotics",
            "B","G","F","E","C",
            "NO","YES","NOT GIVEN","NO","YES",
            "encouraging","desire","autonomy","targeted",
        ],
        4: [None,
            "four","young","food","light","aggressively","location","neurons","chemicals",
            "FALSE","TRUE","FALSE","NOT GIVEN","TRUE",
            "B","E","C","A",
            "TRUE","TRUE","NOT GIVEN","FALSE","NOT GIVEN",
            "B","D","B","E",
            "FALSE","NOT GIVEN","FALSE","TRUE","FALSE","TRUE","NOT GIVEN",
            "large","microplastic","populations","concentrations","predators","disasters","A",
        ],
    },
    15: {
        1: [None,
            "oval","husk","seed","mace",
            "FALSE","NOT GIVEN","TRUE",
            "Arabs","plague","lime","Run","Mauritius","tsunami",
            "C","B","E","G","D",
            "human error","car-sharing","ownership","mileage",
            "C","D","A","E",
            "A","C","C","D","A","B","E","A","D","E","B",
            "expeditions","uncontacted","surface",
        ],
        2: [None,
            "B","C","F","D","E","A",
            "safety","traffic","carriageway","mobile","dangerous","communities","healthy",
            "F","A","D","A",
            "genetic traits","heat loss","ears","fat","emissions",
            "B","C","A","C",
            "C","A","B","B","D","F","H","C","D","E",
            "NOT GIVEN","YES","NO","NO",
        ],
        3: [None,
            "TRUE","FALSE","NOT GIVEN","TRUE","NOT GIVEN","FALSE","TRUE",
            "resignation","materials","miners","family","collectors","income",
            "iii","vi","v","x","iv","viii","i",
            "wheels","film","filter","waste","performance","servicing",
            "C","B","F","A","E","D",
            "F","B","C","G","B","D","A","A",
        ],
        4: [None,
            "water","diet","drought","erosion","desert","branches","leaves and bark","trunk",
            "NOT GIVEN","FALSE","TRUE","FALSE","NOT GIVEN",
            "NOT GIVEN","FALSE","TRUE","FALSE","FALSE","TRUE",
            "words","finger","direction","commands","fires","technology","award",
            "D","E","F","H","B","C","D","B",
            "YES","NOT GIVEN","NO","YES","NOT GIVEN","D",
        ],
    },
    16: {
        1: [None,
            "FALSE","FALSE","NOT GIVEN","TRUE","TRUE","FALSE","TRUE",
            "violent","tool","meat","photographer","game","frustration",
            "iv","vii","ii","v","i","viii","vi",
            "city","priests","trench","location",
            "B","D","B","D","C","D","G","E","C","F","B","A","C","A","B","C",
        ],
        2: [None,
            "TRUE","NOT GIVEN","TRUE","FALSE","FALSE","TRUE","TRUE","NOT GIVEN",
            "Ridgeway","documents","soil","fertility","Rhiannon",
            "D","C","A","G","B","H","E",
            "YES","NO","NOT GIVEN","YES","NOT GIVEN","NO",
            "B","C","B","D","D","A","C","F","G",
            "FALSE","NOT GIVEN","NOT GIVEN","TRUE","TRUE",
        ],
        3: [None,
            "FALSE","NOT GIVEN","FALSE","TRUE","TRUE",
            "lightweight","bronze","levels","hull","triangular","music","grain","towboats",
            "D","C","F","H","G","B",
            "microorganisms","reindeer","insects",
            "B","C","A","C",
            "NOT GIVEN","TRUE","TRUE","NOT GIVEN","FALSE","FALSE",
            "H","D","G","C","A",
            "warm","summer","mustard plant",
        ],
        4: [None,
            "posts","canal","ventilation","lid","weight","climbing",
            "FALSE","NOT GIVEN","FALSE","TRUE",
            "gold","architect","harbour",
            "A","B","D","B","D","H","F","B","C",
            "YES","NO","NOT GIVEN","YES",
            "iii","vi","ii","i","vii","v",
            "C","B","A",
            "NO","NOT GIVEN","YES","NO","YES",
        ],
    },
    20: {
        1: [None,
            "FALSE","FALSE","FALSE","NOT GIVEN","TRUE","TRUE",
            "bulbs","soil","feathers","deer","1980","funding","stakeholders",
            "C","G","B","E","C","B","A","B","C","A",
            "oak","flooring","keel",
            "C","A","D","C","B","G","F","E","D",
            "YES","NOT GIVEN","NO","YES","YES",
        ],
        2: [None,
            "tail","flippers","hair","seagrasses","lips","buoyancy",
            "TRUE","NOT GIVEN","FALSE","NOT GIVEN","TRUE","NOT GIVEN","TRUE",
            "laziness","anxious","threats","exams","perfectionists","guilt",
            "A","C","A","E","B","D","C","B","D","A","C",
            "YES","NO","NO","NOT GIVEN","YES",
            "A","D","A","C","A",
        ],
        3: [None,
            "potatoes","butter","meat","crystals","cellophane","tin","refrigerator",
            "NOT GIVEN","TRUE","FALSE","TRUE","FALSE","NOT GIVEN",
            "C","B","C","B","A","G","E","B","A","C","A","C","B",
            "F","E","B","D",
            "adaptation","cognitive","desks","taps","blue","voice","pregnant","shoulders","police","temperature",
        ],
        4: [None,
            "teacher","charcoal","skyscrapers","flowers","bones","landscape","rivers",
            "FALSE","TRUE","FALSE","TRUE","NOT GIVEN","NOT GIVEN",
            "C","A","D","F",
            "pumps","dams","float","crops","trees",
            "B","E","A","C",
            "D","G","B","C","B","D","E","B","C","A",
            "jackals","diseases","food","foxes",
        ],
    },
}

# ── Passage offsets & counts ──────────────────────────────────────────────────

OFFSETS = {1: 0, 2: 13, 3: 26}
COUNTS  = {1: 13, 2: 13, 3: 14}


def inject_book(book: int):
    pj   = OCR_BASE / f"cambridge-{book}" / "passages.json"
    data = json.loads(pj.read_text())

    book_answers = ANSWERS.get(book, {})
    changed = 0

    for tkey, tdata in data.items():
        tnum = int(tkey.replace('test', ''))
        q40  = book_answers.get(tnum)
        if not q40:
            print(f"  C{book} T{tnum}: no verified answers — skipping")
            continue

        # Validate length
        if len(q40) != 41:   # index 0 = None placeholder
            print(f"  C{book} T{tnum}: expected 41 entries (0+40), got {len(q40)} — skipping")
            continue

        for p in tdata.get('passages', []):
            pnum = p['number']
            off  = OFFSETS[pnum]
            cnt  = COUNTS[pnum]
            ak   = {}
            for i in range(1, cnt + 1):
                abs_q = off + i
                ans = q40[abs_q]
                if ans:
                    ak[str(abs_q)] = ans
            p['answer_keys'] = ak
            changed += 1

    pj.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    total_qs = sum(COUNTS[p] for t in data.values() for p in [1, 2, 3])
    filled   = sum(len(p.get('answer_keys', {}))
                   for t in data.values()
                   for p in t.get('passages', []))
    print(f"  C{book}: {filled}/{total_qs} reading Qs answered ({100*filled//total_qs if total_qs else 0}%) — {changed} passages updated")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--book', type=int, default=None)
    args = ap.parse_args()

    books = [args.book] if args.book else sorted(ANSWERS.keys())
    grand_f = grand_t = 0

    for b in books:
        inject_book(b)
        pj = json.loads((OCR_BASE / f"cambridge-{b}" / "passages.json").read_text())
        for t in pj.values():
            for p in t.get('passages', []):
                cnt = COUNTS[p['number']]
                grand_t += cnt
                grand_f += len(p.get('answer_keys', {}))

    pct = 100 * grand_f // grand_t if grand_t else 0
    print(f"\nTotal: {grand_f}/{grand_t} reading-Q answers ({pct}%)")


if __name__ == '__main__':
    main()
