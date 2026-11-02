"""Check the allowlisted package with the standard library; executes no downloaded code."""
from pathlib import Path
from scripts.distribution import load_manifest, verify_files


def main():
    root=Path(__file__).resolve().parents[1]
    manifest=load_manifest(root)
    verify_files(root,manifest)
    print('Verified',len(manifest['files']),'allowlisted files; version',manifest['version'])
    print('Checksums detect accidental changes, not publisher authenticity or all possible errors.')


if __name__=='__main__':
    main()
