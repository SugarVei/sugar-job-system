"""Compile numerical optical-flow fields for the pet renderer; PNG sources stay unchanged.

Development-only: numpy + opencv-python-headless. No Python dependency in the web app.
Run from this checkout: python scripts/build-pet-motion.py
The binary packs ordered pose pairs; diagonal fields are zero. Dense joy poses
store neighboring/reverse/diagonal pairs only, rather than a 24 * 24 matrix.
Each vector is two unsigned 16-bit components encoded as RG/BA, offset 32768,
256 units per virtual CSS pixel. Header: PETFLOW2, uint16 width/height/pose count/
pair count. Each record starts with uint16 source/destination pose indices.
"""
from pathlib import Path
import re
import ast
import struct
import sys
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'src/components/web-pet/spriteAnimations.ts').read_text(encoding='utf-8')
OUTPUT = ROOT / 'public/pet/motion'
OUTPUT.mkdir(exist_ok=True)
WIDTH, HEIGHT = 95, 140
cv2.setNumThreads(4)

for name in (sys.argv[1:] or ['happy', 'crawl', 'sleep', 'joy']):
    # Consume the checked-in source rectangles, avoiding a second set of geometry.
    match = re.search(rf"{name}: \{{ src: '([^']+)', scale: ([.\d]+), rects: \[(.*?)\n  \]", SOURCE, re.S)
    assert match, name
    scale = float(match[2])
    rects = ast.literal_eval('[' + match[3] + ']')
    encoded = np.fromfile(ROOT / ('public' + match[1]), dtype=np.uint8)
    atlas = cv2.imdecode(encoded, cv2.IMREAD_UNCHANGED)
    assert atlas.shape == (1024, 1536, 4)
    frames = []
    for pose, (x, y, w, h) in enumerate(rects):
        width, height = (w + 4) * scale, (h + 4) * scale
        left = (95 - width) / 2
        top = 139 - height - (7 if name == 'happy' and pose == 2 else 0)
        if name == 'joy':
            top -= 7 if pose == 15 else 3 if pose == 16 else 0
        crop = atlas[y - 2:y + h + 2, x - 2:x + w + 2]
        transform = np.float32([[scale * 4, 0, left * 4], [0, scale * 4, top * 4]])
        # In-memory analysis buffers only; no images are generated or overwritten.
        frame = cv2.warpAffine(crop, transform, (380, 560), flags=cv2.INTER_LINEAR)
        alpha = frame[:, :, 3:4].astype(np.float32) / 255
        rgb = frame[:, :, :3].astype(np.float32) * alpha + np.array([225, 234, 239]) * (1 - alpha)
        frames.append(cv2.cvtColor(np.uint8(rgb), cv2.COLOR_BGR2GRAY))
    chunks = []
    count = len(frames)
    pairs = [(a, b) for a in range(count) for b in range(count)
             if count == 6 or a == b or (a - b) % count in (1, count - 1)]
    for a in range(count):
        for _, b in [pair for pair in pairs if pair[0] == a]:
            if a == b:
                field = np.zeros((HEIGHT, WIDTH, 2), np.float32)
            else:
                optical = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
                optical.setFinestScale(0)
                optical.setGradientDescentIterations(40)
                optical.setVariationalRefinementIterations(15)
                dense = optical.calc(frames[a], frames[b], None)
                field = cv2.resize(dense, (WIDTH, HEIGHT), interpolation=cv2.INTER_AREA) / 4
            packed = np.uint16(np.clip(np.round(field * 256 + 32768), 0, 65535))
            rgba = np.empty((HEIGHT, WIDTH, 4), np.uint8)
            rgba[:, :, 0], rgba[:, :, 1] = packed[:, :, 0] >> 8, packed[:, :, 0] & 255
            rgba[:, :, 2], rgba[:, :, 3] = packed[:, :, 1] >> 8, packed[:, :, 1] & 255
            chunks.append(struct.pack('<HH', a, b) + rgba.tobytes())
        print(f'{name}: source pose {a + 1}/{count}', flush=True)
    destination = OUTPUT / f'{name}.flow'
    destination.write_bytes(b'PETFLOW2' + struct.pack('<HHHH', WIDTH, HEIGHT, count, len(pairs)) + b''.join(chunks))
    print(f'{name}: compiled {destination.stat().st_size} bytes', flush=True)
