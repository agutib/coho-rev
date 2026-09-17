import sys

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

required_ids = [
    'p360PulseDot',
    'p360ShiftStatusBadge',
    'p360ShiftStartLabel',
    'p360ShiftTimer',
    'p360ClockInBtn',
    'p360ClockOutBtn',
    'p360CatalogContainer',
    'p360CustomNotes',
    'p360PlansNotes',
    'p360ReportDate',
    'p360SubjectPreview',
    'p360CompiledReport',
    'p360HistoryCountBadge',
    'p360HistoryTableBody',
    'p360TabBtnTasks',
    'p360TabBtnCopilot',
    'p360TabContentTasks',
    'p360TabContentCopilot',
    'p360-copilot-container'
]

missing = []
for rid in required_ids:
    if f'id="{rid}"' not in html and f"id='{rid}'" not in html:
        missing.append(rid)

if missing:
    print('❌ Missing DOM IDs:', missing)
    sys.exit(1)
else:
    print(f'✅ All {len(required_ids)} required P360 DOM elements found in index.html!')

if 'assets/p360-engine.js' in html:
    print('✅ Script tag assets/p360-engine.js properly included!')
else:
    print('❌ Missing assets/p360-engine.js script tag!')
    sys.exit(1)
