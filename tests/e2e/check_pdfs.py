"""Optional PDF artifact checks: pip install pypdf, then run after browser-smoke.cjs."""
from pathlib import Path
import os
from pypdf import PdfReader

root = Path(os.environ.get('ASH_E2E_OUTPUT', '.cache/browser-output'))
files = list(root.glob('synthetic-template-*.pdf'))
assert len(files) == 200, f'Expected 200 layouts, found {len(files)}'
for file in files:
    reader = PdfReader(file)
    assert len(reader.pages) == 1, f'Unexpected extra page: {file}'
    page = reader.pages[0]
    assert abs(float(page.mediabox.width) - 595.28) < 2, file
    assert abs(float(page.mediabox.height) - 841.89) < 2, file
    assert 'TEST ONLY' in page.extract_text(), file
long = PdfReader(root / 'synthetic-long-prescription.pdf')
assert len(long.pages) > 1
assert 'SYNTHETIC ITEM 30' in '\n'.join(page.extract_text() for page in long.pages)
print(f'200 short A4 layouts passed; long synthetic document: {len(long.pages)} pages, final item retained.')
