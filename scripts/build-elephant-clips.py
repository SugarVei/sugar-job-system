"""Offline video preparation: python build-elephant-clips.py INPUT OUTPUT_DIRECTORY.

Requires ffmpeg, numpy and opencv-python-headless only on the asset-build machine.
Interpolates the 24 fps source to 60 fps with motion-compensated in-between frames.
Preserves real sit/lie/wake/stand transitions and removes the black matte offline.
All footage runs forward, including transitions and walk loops.
"""
from pathlib import Path
import json
import base64
import subprocess
import sys

import cv2
import numpy as np

source, output = Path(sys.argv[1]), Path(sys.argv[2])
output.mkdir(parents=True, exist_ok=True)
source_fps, fps, width, height = 24, 60, 480, 360
cv2.setNumThreads(2)
grid = np.stack(np.meshgrid(np.arange(width), np.arange(height)), axis=-1).astype(np.float32)
flow_engine = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)


def flows(a, b):
    gray_a, gray_b = (cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY) for frame in (a, b))
    return flow_engine.calc(gray_a, gray_b, None), flow_engine.calc(gray_b, gray_a, None)


def interpolate(a, b, weight, flow):
    # Invert each forward displacement field before warping to the intermediate pose.
    # This moves contours instead of merely duplicating or dissolving source frames.
    warped = []
    for frame, field, fraction in ((a, flow[0], weight), (b, flow[1], 1 - weight)):
        mapping = grid.copy()
        for _ in range(3):
            sampled = cv2.remap(field, mapping, None, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            mapping = grid - fraction * sampled
        warped.append(cv2.remap(frame, mapping, None, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT))
    return cv2.addWeighted(warped[0], 1 - weight, warped[1], weight, 0)


def to_sixty(frames, loop):
    count = round((len(frames) if loop else len(frames) - 1) * fps / source_fps)
    cached_pair, flow = -1, None
    for index in range(count):
        position = index * source_fps / fps
        before, weight = int(position), position % 1
        a, b = frames[before], frames[(before + 1) % len(frames)]
        if weight < 1e-6:
            yield matte(a)
        else:
            if before != cached_pair:
                flow, cached_pair = flows(a, b), before
            yield matte(interpolate(a, b, weight, flow))


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
         ('sit', 20.8, 24.8), ('sleep', 27.1, 29.5), ('play', 33.1, 40.8),
         ('sit-down', 19.05, 20.85), ('lie-down', 24.75, 27.25),
         ('wake-up', 29.4, 30.6), ('stand-up', 32.05, 33.25)]
manifest = []
pose_samples = {}
for name, start, end in clips:
    decoder = subprocess.Popen(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', str(start), '-i', str(source),
        '-t', str(end - start), '-vf', f'crop=960:720:160:0,scale={width}:{height}:flags=lanczos,fps={source_fps}',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], stdout=subprocess.PIPE)
    frames = []
    while True:
        raw = decoder.stdout.read(width * height * 3)
        if not raw:
            break
        assert len(raw) == width * height * 3
        frames.append(np.frombuffer(raw, np.uint8).reshape(height, width, 3).copy())
    assert decoder.wait() == 0
    loop = '-' not in name
    error, first, last, blend = 0, 0, len(frames), 0
    if loop:
        signatures = [cv2.resize(frame, (96, 72)).astype(np.float32) for frame in frames]
        pairs = [(float(np.mean((signatures[a] - signatures[b]) ** 2)), a, b)
                 for a in range(min(12, len(frames) // 5))
                 for b in range(max(a + source_fps, len(frames) - 18), len(frames))]
        error, first, last = min(pairs)
        selected = frames[first:last]
        blend = 4
        for i in range(blend):
            a, b = selected[-blend + i], selected[i]
            weight = (i + 1) / (blend + 1)
            selected[-blend + i] = interpolate(a, b, weight, flows(a, b))
        frames = selected[blend:]
    count, first_frame = 0, None
    loop_head, samples = [], []
    destination = output / f'{name}.webm'
    encoder = subprocess.Popen(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba',
        '-s', f'{width}x{height}', '-r', str(fps), '-i', 'pipe:0', '-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p',
        '-b:v', '0', '-crf', '25', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', '-g', str(fps), str(destination)], stdin=subprocess.PIPE)
    for frame in to_sixty(frames, loop):
        if first_frame is None:
            first_frame = frame
        if loop and count < 18:
            loop_head.append(frame)
        if loop and count % 8 == 0:
            # Match entry poses cheaply in the player; compare over black like RGBA video.
            rgb = frame[:, :, :3].astype(np.float32) * (frame[:, :, 3:4] / 255)
            small = cv2.resize(rgb, (12, 9), interpolation=cv2.INTER_AREA)
            luma = np.uint8((small[:, :, 0] + 2 * small[:, :, 1] + small[:, :, 2]) / 4)
            samples.append(dict(time=round(count / fps, 4), pixels=base64.b64encode(luma.tobytes()).decode()))
        count += 1
        encoder.stdin.write(frame.tobytes())
    # A second decoder can start while this matching head continues playing in the tail.
    # This preserves motion during browser seek/startup latency at every loop boundary.
    for frame in loop_head:
        encoder.stdin.write(frame.tobytes())
    encoder.stdin.close()
    assert encoder.wait() == 0
    poster = output / f'{name}.png'
    cv2.imencode('.png', cv2.cvtColor(first_frame, cv2.COLOR_RGBA2BGRA))[1].tofile(poster)
    if loop:
        pose_samples[name] = [sample for sample in samples if sample['time'] < count / fps - .4]
    compact = output / 'compact'
    compact.mkdir(exist_ok=True)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-c:v', 'libvpx-vp9', '-i', str(destination),
        # Rescaling YUVA can lift transparent black to alpha=1. Restore only the
        # extreme alpha values so the compact version has no rectangular residue.
        '-vf', "scale=240:180:flags=lanczos,format=rgba,lut=a='if(lt(val,4),0,if(gt(val,251),255,val))'",
        '-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0',
        '-crf', '25', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', '-g', str(fps), str(compact / destination.name)], check=True)
    entry = dict(id=name, fps=fps, sourceFps=source_fps, interpolation='bidirectional-optical-flow', loop=loop,
                 frames=count + len(loop_head), duration=(count + len(loop_head)) / fps, loopDuration=count / fps,
                 loopTail=len(loop_head) / fps, sourceStart=round(start + (first + blend) / source_fps, 4),
                 seamError=round(error, 2), bytes=destination.stat().st_size)
    manifest.append(entry)
    print(json.dumps(entry), flush=True)
(output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
(output / 'pose-samples.json').write_text(json.dumps(pose_samples, separators=(',', ':')) + '\n', encoding='utf-8')
