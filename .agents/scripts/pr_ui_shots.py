#!/usr/bin/env python3
# Managed by pr-ui-shots
"""Validate actual PNG pairs for the current Git HEAD without changing git state."""
import argparse
import json
from pathlib import Path
import re
import struct
import subprocess
import sys


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], text=True).strip()


def identity(repo):
    root = Path(git(repo, 'rev-parse', '--show-toplevel'))
    remote = git(root, 'remote', 'get-url', 'origin')
    if 'github.com' not in remote:
        raise ValueError('origin must identify the GitHub repository; do not guess its name')
    name = remote.rstrip('/').rsplit('/', 1)[-1].removesuffix('.git')
    if not re.fullmatch(r'[A-Za-z0-9_.-]+', name):
        raise ValueError('Cannot determine GitHub repo name')
    return root, name, git(root, 'rev-parse', '--short=7', 'HEAD')


def png_width(path):
    with path.open('rb') as stream:
        header = stream.read(24)
    if len(header) != 24 or header[:8] != b'\x89PNG\r\n\x1a\n' or header[12:16] != b'IHDR':
        raise ValueError(f'Not an actual PNG: {path.name}')
    width, height = struct.unpack('>II', header[16:24])
    if not width or not height:
        raise ValueError(f'Empty image: {path.name}')
    return width


def check(directory):
    pairs = {}
    errors = []
    if not directory.is_dir():
        return [], [f'Missing screenshot directory: {directory}']
    for path in sorted(directory.iterdir()):
        if path.suffix.lower() != '.png':
            continue
        match = re.fullmatch(r'(\d+-.+)\.(before|after)\.png', path.name)
        if not match:
            errors.append(f'Invalid screenshot name: {path.name}')
            continue
        pairs.setdefault(match[1], {})[match[2]] = path
    if not pairs:
        errors.append('No screenshot pairs')
    complete = []
    for scene, files in pairs.items():
        if set(files) != {'before', 'after'}:
            errors.append(f'Missing pair: {scene}')
            continue
        try:
            widths = [png_width(files[side]) for side in ('before', 'after')]
            if widths[0] != widths[1]:
                errors.append(f'Width mismatch: {scene}: {widths}')
            else:
                complete.append(scene)
        except (ValueError, OSError) as error:
            errors.append(str(error))
    return complete, errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path.cwd())
    parser.add_argument('--directory', type=Path, help='Explicit directory for isolated validation tests')
    args = parser.parse_args()
    try:
        if args.directory:
            directory = args.directory
        else:
            _, name, sha = identity(args.repo)
            directory = Path.home() / '.cache/pr-shots' / name / f'pr-{sha}'
        pairs, errors = check(directory)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        return 1
    print(json.dumps({'directory': str(directory), 'pairs': pairs, 'errors': errors}, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == '__main__':
    raise SystemExit(main())
