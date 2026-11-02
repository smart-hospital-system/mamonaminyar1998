"""Packaging is allowlisted; example runtime data and issuer secrets never ship."""
import base64
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile
from scripts.package_unified import build, PREFIX, ROOT


def test_unified_contains_ten_scripts_same_sources_and_no_runtime_data(tmp_path):
    wheels=tmp_path/'wheels';wheels.mkdir()
    (wheels/'synthetic-test.whl').write_bytes(b'packaging test fixture, not an installable wheel')
    public=base64.b64encode(bytes(range(32))).decode()
    destination=tmp_path/'customer.zip'
    manifest=build(ROOT,destination,wheels,public)
    assert manifest['mode']=='offline' and manifest['package_kind']=='unified'
    assert manifest['activation_mode']=='signed' and manifest['license_public_key']==public
    with ZipFile(destination) as z:
        names=z.namelist()
        numbered=[n for n in names if f'{PREFIX}/powershell/' in n and n.endswith('.ps1')]
        assert len(numbered)==10
        assert any(n.endswith('Hospital.Common.psm1') for n in names)
        assert any(n.endswith('UPGRADE_V04_FA.html') for n in names)
        assert not any('/.data/' in n or '/.cache/' in n or n.endswith('.pem') or '/node_modules/' in n for n in names)
        assert json.loads(z.read(f'{PREFIX}/release-manifest.json'))==manifest
        for name,digest in manifest['files'].items():
            assert hashlib.sha256(z.read(f'{PREFIX}/{name}')).hexdigest()==digest
