"""Offline video preparation: python build-elephant-clips.py INPUT OUTPUT_DIRECTORY.

Requires ffmpeg, numpy and opencv-python-headless only on the asset-build machine.
Keeps source timing at 24 fps and removes the black matte before browser playback.
No frame reversal, runtime segmentation, or runtime segment seeking is needed.
"""
from pathlib import Path
import json
import subprocess
import sys

import cv2
import numpy as np

source, output = Path(sys.argv[1]), Path(sys.argv[2])
output.mkdir(parents=True, exist_ok=True)
fps, width, height = 24, 480, 360
cv2.setNumThreads(2)


def matte(rgb):
    brightness = rgb.max(axis=2)
    dark = np.uint8(brightness < 16)
    cv2.floodFill(dark, None, (0, 0), 2)
    background = dark == 2
    distance = cv2.distanceTransform(np.uint8(~background), cv2.DIST_L2, 3)
    edge = (distance <= 2.4) & ~background
    interior = ~background & ~edge
    foreground = cv2.dilate(np.uint8(brightness * interior), np.ones((7, 7), np.uint8))
    foreground = np.maximum(foreground, brightness)
    alpha = np.where(background, 0, 255).astype(np.uint8)
    alpha[edge] = np.uint8(np.clip((brightness[edge].astype(float) - 6) / np.maximum(1, foreground[edge].astype(float) - 6), 0, 1) * 255)
    clean = rgb.copy()
    clean[edge] = np.uint8(np.clip(rgb[edge].astype(float) * (foreground[edge] / np.maximum(1, brightness[edge]))[:, None], 0, 255))
    return np.dstack([clean, alpha])


clips = [('walk', .125, 3.9), ('hello', 4.1, 7.8), ('curious', 10.1, 15.8),
         ('sit', 20.1, 24.8), ('sleep', 27.1, 29.8), ('play', 33.1, 40.8)]
manifest = []
for name, start, end in clips:
    decoder = subprocess.Popen(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', str(start), '-i', str(source),
        '-t', str(end - start), '-vf', f'crop=960:720:160:0,scale={width}:{height}:flags=lanczos,fps={fps}',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], stdout=subprocess.PIPE)
    frames = []
    while True:
        raw = decoder.stdout.read(width * height * 3)
        if not raw:
            break
        assert len(raw) == width * height * 3
        frames.append(np.frombuffer(raw, np.uint8).reshape(height, width, 3).copy())
    assert decoder.wait() == 0
    # Choose matching poses near the ends, then overlap a short forward-only tail.
    signatures = [cv2.resize(frame, (96, 72)).astype(np.float32) for frame in frames]
    pairs = [(float(np.mean((signatures[a] - signatures[b]) ** 2)), a, b)
             for a in range(min(12, len(frames) // 5))
             for b in range(max(a + fps, len(frames) - 18), len(frames))]
    error, first, last = min(pairs)
    selected = [matte(frame) for frame in frames[first:last]]
    blend = 4
    # Blend premultiplied colors so transparent edges never acquire a colored halo.
    for i in range(blend):
        a = selected[-blend + i].astype(np.float32) / 255
        b = selected[i].astype(np.float32) / 255
        weight = (i + 1) / (blend + 1)
        alpha = a[:, :, 3:4] * (1 - weight) + b[:, :, 3:4] * weight
        color = (a[:, :, :3] * a[:, :, 3:4] * (1 - weight) + b[:, :, :3] * b[:, :, 3:4] * weight) / np.maximum(alpha, 1e-6)
        selected[-blend + i] = np.uint8(np.clip(np.concatenate([color, alpha], axis=2) * 255, 0, 255))
    selected = selected[blend:]
    destination = output / f'{name}.webm'
    encoder = subprocess.Popen(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba',
        '-s', f'{width}x{height}', '-r', str(fps), '-i', 'pipe:0', '-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p',
        '-b:v', '0', '-crf', '25', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', '-g', str(fps), str(destination)], stdin=subprocess.PIPE)
    for frame in selected:
        encoder.stdin.write(frame.tobytes())
    encoder.stdin.close()
    assert encoder.wait() == 0
    poster = output / f'{name}.png'
    cv2.imencode('.png', cv2.cvtColor(selected[0], cv2.COLOR_RGBA2BGRA))[1].tofile(poster)
    entry = dict(id=name, fps=fps, frames=len(selected), duration=len(selected) / fps,
                 sourceStart=round(start + (first + blend) / fps, 4), seamError=round(error, 2), bytes=destination.stat().st_size)
    manifest.append(entry)
    print(json.dumps(entry), flush=True)
(output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
