"""Compatibility entry point. Use package_releases to build both installer editions."""
import argparse
from pathlib import Path
from scripts.package_releases import ROOT, build_release


def package(destination, wheelhouse=None):
    return build_release(ROOT, destination, 'offline' if wheelhouse else 'online', wheelhouse)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=Path)
    parser.add_argument('--wheelhouse', type=Path)
    args = parser.parse_args()
    package(args.destination, args.wheelhouse)
