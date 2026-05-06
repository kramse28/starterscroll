"""
Resize PNG assets in-place for faster loads (smaller decode / bandwidth).

Large scroll sheets (13492x29200) are progressively halved HALVES times (default 4 => /16).
Arrow PNGs are shrunk to MAX_ARROW px on the long edge (nearest-neighbor).

Other non-sheet PNGs in assets/images are left unchanged (e.g. thumbnails).
"""
from __future__ import annotations

import argparse
import os
import shutil
import tempfile
import time
from pathlib import Path

from PIL import Image


MEGA_SIZE = (13492, 29200)
HALF_STEPS_DEFAULT = 4  # 2**4 = 16


def byte_size(p: Path) -> int:
    return p.stat().st_size


def resize_half_floor(im: Image.Image, halves: int) -> Image.Image:
    """Halve dimensions `halves` times using floor division each step."""
    out = im
    for _ in range(halves):
        w, h = out.size
        out = out.resize((w // 2, h // 2), Image.Resampling.LANCZOS)
    return out


def resize_mega_scroll_sheet(im: Image.Image, halves: int) -> Image.Image:
    """
    Downscale 13492×29200 sheets quickly without drifting aspect ratio.

    Pillow's Image.reduce() rounds up when sizes aren't divisible by the factor,
    which skews aspect ratio slightly by the last steps. For the huge sheets we:
    - use fast reduce() for the first two halvings (even dimensions)
    - finish with explicit floor halving so results match CSS (843×1825 for /16).
    """
    out = im
    remaining = halves

    # First two halvings: 13492×29200 -> 6746×14600 -> 3373×7300 (fast box filter).
    fast_pairs = min(2, remaining)
    for _ in range(fast_pairs):
        out = out.reduce((2, 2))
        remaining -= 1

    return resize_half_floor(out, remaining)


def resize_max_edge(im: Image.Image, max_px: int) -> Image.Image:
    w, h = im.size
    longest = max(w, h)
    if longest <= max_px:
        return im
    scale = max_px / longest
    nw = max(1, int(round(w * scale)))
    nh = max(1, int(round(h * scale)))
    return im.resize((nw, nh), Image.Resampling.NEAREST)


def ensure_rgba(im: Image.Image) -> Image.Image:
    if im.mode in ("RGBA", "RGB"):
        return im
    if im.mode == "P":
        return im.convert("RGBA")
    return im.convert("RGBA")


def replace_with_retries(src: Path, dest: Path) -> None:
    """
    Windows + OneDrive can briefly lock files during sync/indexing; retry a few times.
    """
    last_err: OSError | None = None
    for attempt in range(12):
        try:
            os.replace(src, dest)
            return
        except OSError as e:
            last_err = e
            # Fallback: remove destination then move (not atomic, but works when locked for replace).
            try:
                dest.unlink(missing_ok=True)
                shutil.move(str(src), str(dest))
                return
            except OSError:
                time.sleep(0.15 * (attempt + 1))
    assert last_err is not None
    raise last_err


def process_file(path: Path, *, halves: int, max_arrow: int, dry_run: bool) -> None:
    Image.MAX_IMAGE_PIXELS = None
    before_sz = byte_size(path)
    with Image.open(path) as im0:
        im = ensure_rgba(im0)
        before_px = im.size

        if before_px == MEGA_SIZE:
            im2 = resize_mega_scroll_sheet(im, halves)
        elif path.name in ("pointleft.png", "pointright.png"):
            im2 = resize_max_edge(im, max_arrow)
        elif path.name == "visualcreate.png" and before_px == (1619, 3503):
            # Unused in HTML currently, but keep it small alongside other exports.
            im2 = resize_half_floor(im, halves)
        else:
            return

        after_px = im2.size
        fd, tmp_name = tempfile.mkstemp(prefix=path.stem + "_", suffix=".png.tmp")
        os.close(fd)
        tmp = Path(tmp_name)
        im2.save(tmp, format="PNG", optimize=True, compress_level=9)
        after_sz = byte_size(tmp)

    rel = path.as_posix()
    pct = 100.0 * (1.0 - after_sz / before_sz) if before_sz else 0.0
    print(
        f"{rel}: {before_px[0]}x{before_px[1]} ({before_sz // 1024}KiB) -> "
        f"{after_px[0]}x{after_px[1]} ({after_sz // 1024}KiB)  saved ~{pct:.1f}%"
    )

    if dry_run:
        tmp.unlink(missing_ok=True)
        return

    replace_with_retries(tmp, path)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, required=True)
    ap.add_argument("--halves", type=int, default=HALF_STEPS_DEFAULT)
    ap.add_argument("--max-arrow", type=int, default=128)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    roots = [
        args.root / "assets" / "images",
        args.root / "assets" / "createclass",
        args.root / "assets" / "savedavatars",
    ]
    for r in roots:
        if not r.is_dir():
            continue
        for path in sorted(r.glob("*.png")):
            process_file(
                path,
                halves=args.halves,
                max_arrow=args.max_arrow,
                dry_run=args.dry_run,
            )


if __name__ == "__main__":
    main()
