"""Render the provisional character rigs using CairoSVG and Pillow.

Poses use design-space units. Curves are rasterized for the display atlas only
after clothing, facial features and the limbs of each pose are assembled.
"""

import json
from dataclasses import dataclass
from functools import cache
from io import BytesIO
from pathlib import Path

import cairosvg
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
W, H = 38, 48
DENSITY = 3
FRAME_W, FRAME_H = W * DENSITY, H * DENSITY
INK = "#282025"
SKIN = "#f1ad79"
SKIN_SHADE = "#bd7755"
HAIR = "#302323"
HAIR_LIGHT = "#644235"


@dataclass(frozen=True)
class Outfit:
    coat: tuple  # base, shadow, highlight
    legs: tuple
    shoulder: int
    waist: int
    inseam: int
    shorts: bool


OUTFITS = {
    "barbod": Outfit(
        ("#b72e39", "#84232f", "#ee5151"),
        ("#f5f0df", "#b9b4ae", "#fffdf2"),
        7,
        5,
        10,
        True,
    ),
    "kavian": Outfit(
        ("#526f8a", "#34485f", "#7897ab"),
        ("#35363f", "#272732", "#53565d"),
        8,
        6,
        11,
        False,
    ),
    "mahan": Outfit(
        ("#bbc0c5", "#838994", "#e0e1dc"),
        ("#a5a8b0", "#787d88", "#d5d6d8"),
        5,
        4,
        13,
        False,
    ),
    "parsa": Outfit(
        ("#798b57", "#4c6643", "#abbb7c"),
        ("#989b9c", "#646a70", "#babfb9"),
        6,
        4,
        14,
        True,
    ),
    "parham": Outfit(
        ("#393841", "#25252d", "#595764"),
        ("#393940", "#24252b", "#52505b"),
        6,
        5,
        9,
        False,
    ),
}

# Each crown and jaw follows its friend's reference; the bald crown uses the
# exposed scalp. Profiles have their own nose, jaw and glasses geometry.
CROWNS = {
    "barbod": "M1.7 7.6 Q.6 2.5 4.4 1.2 Q8.3 -.6 11.8 1.9 Q13.1 2.9 12.8 5 L10.6 4 Q7 3.5 4.1 4.6 L3.2 7.4 Z",
    "kavian": "M1.6 7.9 Q.2 6 .9 4.6 Q-.4 3.2 1.9 2.9 Q1.6 1.1 4 1.4 Q4.9 -.4 6.4 .7 Q8.1 -.8 9.5 .9 Q11.7 .1 12.2 2.3 Q14.6 2.5 13.1 4.6 Q14 6 12.5 7.8 L11.7 4.4 Q10 5.1 9 3.7 Q7.1 5.2 5.6 4.1 L3.6 5.3 L3.1 7.5 Z",
    "mahan": "M1.9 7.3 Q.9 3.7 3.4 2.1 Q7 -1 10.9 2 Q13.1 3.7 12.3 7 L11.9 5.1 Q11.8 2.6 8.8 1.7 Q5.2 .8 3.1 4 L2.7 7.4 Z",
    "parsa": "M1.4 7.6 Q.2 5.7 .9 4.2 L.1 4.2 Q1.6 1.9 4.4 1.8 L3.8 .9 Q6.6 -.2 8.4 .8 Q11.9 -.4 13.1 2.4 Q14 4.4 12.6 6.7 L11.6 4.4 Q8.5 4.8 6.6 3.7 Q5.3 4.8 3.5 4.9 L2.9 7.6 Z",
    "parham": "M1.5 7.8 Q.2 4.4 1.4 2.9 Q1.5 1.1 4 1.1 Q6 -.4 8.5 .8 Q11.5 .1 12.9 2.4 Q14.1 4.2 12.6 7.4 L11.7 5 Q10.1 5.1 8.7 4.2 Q6.4 5.2 3.5 4.5 L2.9 7.6 Z",
}
BEARDS = {
    "barbod": "M2 9 Q3.4 10.6 4.3 10.7 Q5.1 9.7 7.6 9.9 Q9.8 9.7 10.6 10.7 L12 9 Q12.1 13.6 8.1 14 Q3.5 14.1 2 10 Z",
    "kavian": "M2.3 10 Q3.2 11.4 5.2 12 Q7.1 12.8 9.3 12.1 Q11.4 11.5 12 10 Q11.3 13.6 7.6 13.9 Q3.7 13.6 2.3 10 Z",
    "mahan": "M1.9 8.8 Q3.1 10.7 4.5 10.5 Q5.5 9.6 7.4 10 Q9.4 9.5 10.4 10.5 Q11.4 10.6 12.3 8.8 Q12.2 14.4 9.5 15.6 L7.4 17 L5 15.6 Q2.3 14.4 1.9 8.8 Z",
    "parsa": "M2.4 9.9 Q4.1 12.2 7.5 12.7 Q10.7 12.2 12.2 9.9 Q11.5 13 7.6 13.8 Q4.1 13.4 2.4 9.9 Z",
    "parham": "M4.1 10.9 Q5.3 9.3 7.4 10 Q9.2 9.2 10.9 10.8 Q9.5 11.5 7.5 10.8 Q5.8 11.5 4.1 10.9 Z",
}


def path(shape, fill, stroke="none", width=0.65):
    return f'<path d="{shape}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>'


def line(shape, color=INK, width=0.65):
    return path(shape, "none", color, width)


def oval(x, y, rx, ry, color):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{color}"/>'


@cache
def head(friend, direction):
    skin = "#f1bc97" if friend == "mahan" else SKIN
    hair = "#855339" if friend == "mahan" else HAIR
    glasses = friend in ("kavian", "parham")
    parts = []
    if direction == "north":
        parts.append(
            path(
                "M1.4 7.3 Q.9 .7 7 .7 Q13 .5 13.2 6.5 Q13.5 12.3 8.8 13.1 Q3.1 13.6 1.4 7.3 Z",
                skin if friend == "mahan" else hair,
                INK,
            )
        )
        parts.append(path(CROWNS[friend], hair))
        if friend != "mahan":
            parts.append(
                line(
                    "M3 5 Q4.3 2.2 7.5 2.4 M8.6 2.6 q1.8 -.1 2.6 1.2", HAIR_LIGHT, 0.55
                )
            )
        parts.append(
            line(
                "M4.4 11.6 q2.9 1.2 5.3 0",
                SKIN_SHADE if friend == "mahan" else HAIR_LIGHT,
                0.7,
            )
        )
        return "".join(parts)

    side = direction == "east"
    if side:
        jaw = "M2.8 7 Q1.9 1.9 7.7 1.4 Q12.7 1.1 12.4 6.9 L14.1 8.8 Q14.3 9.4 12.6 9.6 Q12.9 12.7 10.2 13.4 Q5.8 14.1 3.8 10.8 Z"
    else:
        jaw = "M1.7 6.5 Q1.4 1.1 7.3 1 Q13.2 1.1 12.7 6.6 L12.3 9.8 Q11.8 12.7 7.7 13.8 Q3.3 13.4 2.1 10 Z"
    parts.append(path(jaw, skin, INK))
    if not side:
        parts.append(oval(2.05, 8.2, 1.12, 1.65, SKIN_SHADE))
        parts.append(
            path("M2.6 8.2 Q3.1 11.7 6.7 12.4 Q4.9 12.6 3.4 11.3 Z", SKIN_SHADE)
        )
    parts.append(path(CROWNS[friend], hair, INK, 0.42))
    if friend != "mahan":
        parts.append(
            line("M3.3 3.4 Q5.1 1.5 7.7 1.9 M8.9 2.1 q1.8 -.1 2.7 1", HAIR_LIGHT, 0.62)
        )
    if side:
        parts.append(oval(4.15, 8.1, 1.4, 1.85, SKIN_SHADE))
        parts.append(line("M9 6.4 q1.5 -.8 3 -.1", hair, 0.77))
        parts.append(oval(11.15, 7.65, 0.58, 0.59, INK))
        if glasses:
            parts.append(
                line(
                    "M4.1 7.5 L9 7 M9 6.7 Q10.9 6.2 12.8 6.9 L12.4 8.7 Q10.2 9.9 9.1 8.1 Z",
                    INK,
                    0.65,
                )
            )
        if friend == "parham":
            parts.append(
                path("M10.1 10.3 q1.8 -1 3 .1 l-.5 .8 q-1.7 -.5 -2.5 -.9", hair)
            )
        else:
            tip = 16.1 if friend == "mahan" else 13.5
            parts.append(
                path(
                    f"M4.8 9.6 Q7.5 12 10.2 11.8 L12.6 10.5 Q12.9 13.6 9.8 {tip} Q6 13.5 4.8 9.6 Z",
                    hair,
                )
            )
    else:
        parts.append(
            line(
                "M3.6 6.35 Q4.85 5.75 6.1 6.25 M8.7 6.15 Q10.2 5.65 11.5 6.35",
                hair,
                0.68,
            )
        )
        for x in (5.15, 10.15):
            parts.append(oval(x, 7.72, 1.18, 0.70, "#fff3db"))
            parts.append(oval(x + 0.22, 7.73, 0.61, 0.68, INK))
        if glasses:
            parts.append(
                line(
                    "M1.9 7.1 L3.1 7 M3.1 6.85 Q4.7 6.3 6.8 6.85 L6.6 8.6 Q4.9 9.65 3.4 8.55 Z M6.8 7.1 Q7.5 6.75 8.2 7.1 M8.2 6.85 Q10.3 6.3 12 6.9 L11.75 8.6 Q9.6 9.65 8.4 8.5 Z",
                    INK,
                    0.66,
                )
            )
        parts.append(line("M7.45 7.6 L7.05 9.15 Q7.5 9.65 8.35 9.18", SKIN_SHADE, 0.6))
        parts.append(path(BEARDS[friend], hair))
        parts.append(
            line(
                "M6.4 11.5 Q7.6 12.1 8.95 11.4",
                "#bb795e" if friend in ("barbod", "mahan") else "#90594c",
                0.48,
            )
        )
        if friend == "mahan":
            parts.append(
                line("M4.4 12.5 q.6 1.2 1.2 1.6 M9.8 12.8 l-.9 1.8", "#af7049", 0.5)
            )
    return "".join(parts)


def pose(friend, action, direction, frame):
    outfit = OUTFITS[friend]
    side = direction in ("east", "west")
    back = direction == "north"
    skin = "#f1bc97" if friend == "mahan" else SKIN
    stride = (0, 2, 0, -2)[frame] if action in ("walk","moonwalk") else 0
    lift = int(action == "walk" and frame % 2 == 1)
    if action == "react" and friend == "barbod" and frame in (1, 2):
        lift += 3
    if action == "happy" and friend in ("barbod","mahan"):
        lift += (0, 2, 3, 1)[frame]
    if action == "rest":
        lift -= 1
    cx = W / 2 + ((0, 2, 0, -2)[frame] if action == "dance" else 0)
    if action == "interact":
        cx += (0, 1, 1, 0)[frame]
    foot = H - 3
    hip = foot - outfit.inseam - lift
    coat, shade, highlight = outfit.coat
    pants, fold, seam = outfit.legs
    radius = outfit.shoulder - (2 if side else 0)
    waist = outfit.waist - (1 if side else 0)
    # All paths below use local coordinates: center shoulder = (0,0), hip = (0,12).
    top = hip - 12
    body = []
    for sign in (-1, 1):
        x = sign * (2 if side else 2.8)
        toe = x + (sign * stride if side else 0) + (1 if side else sign * 0.6)
        end = min(foot, foot - lift - max(0, sign * stride if not side else 0)) - top
        if action=="moonwalk":
            toe-=stride*sign*1.5
        if action == "rest":
            toe += 1.7
        body.append(line(f"M{x} 12 Q{x - 0.4} 19 {toe} {end - 1.6}", INK, 5.5))
        body.append(
            line(
                f"M{x} 12 Q{x - 0.4} 19 {toe} {end - 1.6}",
                skin if outfit.shorts else pants,
                4.3,
            )
        )
        cuff = 17.4 if outfit.shorts else end - 2
        body.append(
            path(
                f"M{x - 2.6} 11 H{x + 2.7} L{toe + 2.1} {cuff} q-2.1 1.1 -4.6 .1 Z",
                pants,
                INK,
                0.65,
            )
        )
        body.append(line(f"M{x - 1.6} 13 L{toe - 1.3} {cuff - 1}", fold, 0.75))
        shoe = "#e9e5d8" if friend in ("mahan", "barbod") else "#59575d"
        body.append(
            path(
                f"M{toe - 2.15} {end - 2.7} q1.9 .65 3.5 -.25 q2.4 .45 2.5 2.3 q-.9 1.1 -6.3 .65 q-.5 -1.7 .3 -2.7 Z",
                shoe,
                INK,
                0.75,
            )
        )
        body.append(line(f"M{toe - 1.55} {end - 0.45} q2.3 .37 4.3 -.12", seam, 0.48))
    body.append(
        path(
            f"M-3 -1.8 Q{-radius} -1.6 {-radius} 1.5 L{-waist - 0.6} 11.7 Q{-waist} 13 {waist} 12.05 L{radius} 1.4 Q{radius} -.85 3 -1.8 Z",
            coat,
            INK,
            0.94,
        )
    )
    body.append(
        path(f"M{-radius + 0.65} .9 q1.4 2.3 1.9 5.2 l.65 5.1 -1.8 .08 Z", shade)
    )
    body.append(
        line(f"M{waist - 0.4} 4.2 Q{waist - 1.65} 8 {waist - 1.2} 10.4", highlight, 0.7)
    )
    body.append(line(f"M{-waist + 0.7} 11.3 Q0 12.05 {waist - 0.4} 11.35", shade, 0.75))
    if friend in ("kavian", "parsa", "parham"):
        body.append(
            path(
                "M-4.6 -1.2 Q-3.3 3.2 .2 4.2 Q3.3 3.25 4.8 -.85 L2 -1.8 H-2 Z",
                shade,
                INK,
                0.5,
            )
        )
        if not back:
            body.append(line("M-2.2 2.1 l-.3 2.6 M2.15 2 l.4 2.5", "#dfd1ba", 0.52))
            body.append(line("M-2.9 10.15 l.95 -2.25 3.95 -.1 1 2", shade, 0.68))
    elif not back:
        body.append(line("M-2.7 -.5 Q0 2.7 2.75 -.5", shade, 0.85))
        if friend == "barbod":
            body.append(line("M.3 .65 L.25 11.4", shade, 0.8))
            body.append(line("M2 3.2 q1.2 .7 2.5 -.1", "#fff5df", 0.65))
    for sign in (-1, 1):
        if side and sign == -1:
            continue
        sx = sign * radius
        ex, ey = sx + sign * 1.35, 6 + sign * stride
        hand_x, hand_y = sx + sign * 1.55, 10 + sign * stride
        if action == "interact":
            ex, ey = sx + sign * 2.5, 6
            hand_x, hand_y = sx - sign * (2 + frame % 2 * 2), 4 - frame % 2 * 2
        elif action=="boxing":
            ex,ey=sx+sign*2,4
            hand_x,hand_y=(sign*(9 if (frame%2)==(sign==1) else 3),-1)
        elif action=="greet" and sign==1:
            ex,ey=sx+2,4
            hand_x,hand_y=sx+4,2-frame%2
        elif action in ("smoke","iqos") and sign == 1:
            ex, ey = sx + 2, 4
            hand_x, hand_y = ((3,-1) if frame in (1,2) else (sx+1,7))
        elif action in ("eat","carry"):
            hand_x, hand_y = sign*3.2, (2 if action=="eat" and frame%2 else 6)
            ex, ey = sx+sign*2,6
        elif action=="happy" and friend in ("barbod","parham","mahan"):
            ex,ey=sx+sign*3,0
            hand_x,hand_y=sx+sign*3+(frame%2),-6-frame%2
        elif action == "dance" and frame in (1, 3):
            beat = 1 if frame == 1 else -1
            ex, ey = sx + sign * 4 + beat, -2
            hand_x, hand_y = sx + beat * 4, 1.7
        elif action == "react":
            beat = frame % 2
            if friend in ("barbod", "mahan"):
                ex, ey = sx + sign * 3.6, -2
                hand_x, hand_y = sx + sign * 3 + beat * 2 - 1, -7 - beat
            elif friend=="parham" and frame in (1,2):
                ex,ey=sx+sign*3,0
                hand_x,hand_y=sx+sign*3,-6
            elif friend == "kavian" and sign == 1:
                ex, ey = sx + 4, 4
                hand_x, hand_y = sx + 5, -2 - beat
            else:
                hand_x, hand_y = (
                    (-sign * 3, 4) if friend == "parsa" else (sign, 6 + beat)
                )
        elif action == "rest":
            hand_x, hand_y = sign * 2, 10
        elif side:
            ex, hand_x = sx - 1 - stride, sx - 2 - stride * 2
        arm = f"M{sx} 1.8 Q{(sx + ex) / 2} 3.5 {ex} {ey} L{hand_x} {hand_y}"
        thickness = 3.1 if friend == "mahan" else 3.75
        body.append(line(arm, INK, thickness + 1.3))
        body.append(line(arm, coat if sign == 1 else shade, thickness))
        body.append(oval(hand_x, hand_y + 0.45, 1.6, 1.9, INK))
        body.append(oval(hand_x, hand_y + 0.42, 1.23, 1.46, skin))
        if friend == "barbod" and sign == 1 and action in ("idle", "walk"):
            body.append(
                path(
                    f"M{hand_x - 0.35} {hand_y + 1.3} h1.35 v1.25 q1 .25 1.05 1.3 v3.15 q-.2 .8 -1.6 .8 q-1.65 0 -1.65 -.9 v-3 q0 -.95 .85 -1.3 Z",
                    "#333039",
                    INK,
                    0.6,
                )
            )
            body.append(line(f"M{hand_x - 0.3} {hand_y + 4.2} v2.3", "#88838b", 0.45))
    facing = "east" if side or (friend == "parsa" and action == "react") else direction
    head_y = (
        -11.8
        - int(action == "idle" and frame == 2)
        + int(action == "react" and friend == "parham" and frame % 2 == 1)
    )
    body.append(
        f'<g transform="translate({-7 + (1 if side else 0)} {head_y})">{head(friend, facing)}</g>'
    )
    if action in ("smoke","iqos"):
        x,y=(3,-1) if frame in (1,2) else (radius+1,7)
        color="#fffcdf" if action=="smoke" else {"barbod":"#d82a30","mahan":"#a5a7ac"}.get(friend,"#26262e")
        body.append(line(f"M{x} {y} l4 -1.5",INK,2))
        body.append(line(f"M{x} {y} l4 -1.5",color,1.25))
        if frame==2:body.append(line(f"M{x+4} {y-3} q2 -2 0 -4","#ddd6bf",0.7))
    if action in ("carry","eat"):
        y=2 if action=="eat" and frame%2 else 6
        body.append(path(f"M-4 {y} h8 q-1 5 -4 4 q-3 0 -4 -4Z","#7798a6",INK,0.6))
        body.append(oval(0,y,3.6,1.4,"#c63265"))
    if action=="happy":
        body.append(oval(0,head_y+11,1.2,1.4,"#d86277"))
    mirror = f"translate({W} 0) scale(-1 1)" if direction == "west" else ""
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{FRAME_W}" height="{FRAME_H}"><g transform="{mirror}" stroke-linejoin="round" stroke-linecap="round"><g transform="translate({cx} {top})">{"".join(body)}</g></g></svg>'
    sprite = Image.open(BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert(
        "RGBA"
    )
    rim = Image.new("RGBA", sprite.size, "#fff2d4")
    rim.putalpha(sprite.getchannel("A").filter(ImageFilter.MaxFilter(7)))
    rim.alpha_composite(sprite)
    return rim


def main():
    rows = [
        (action, direction, ms)
        for action, ms in (("idle", 360), ("walk", 125))
        for direction in ("south", "north", "east", "west")
    ]
    rows += [
        (action, "south", ms)
        for action, ms in (
            ("interact", 220),
            ("dance", 185),
            ("react", 200),
            ("rest", 550), ("smoke",320), ("iqos",320), ("carry",190), ("eat",230), ("happy",210), ("boxing",185), ("greet",350), ("moonwalk",180),
        )
    ]
    clips = [
        {
            "action": a,
            "direction": v,
            "firstFrame": i * 4,
            "lastFrame": i * 4 + 3,
            "frameMs": ms,
            "loop": True,
        }
        for i, (a, v, ms) in enumerate(rows)
    ]
    meta = {
        "frameWidth": FRAME_W,
        "frameHeight": FRAME_H,
        "origin": [0.5, (H - 2) / H],
        "animations": clips,
    }
    (ROOT / "assets/manifests/temporary-residents.json").write_text(
        json.dumps(meta, indent=2) + "\n"
    )
    for friend in OUTFITS:
        sheet = Image.new("RGBA", (FRAME_W * 8, FRAME_H * ((len(rows)+1)//2)))
        for row, (action, direction, _) in enumerate(rows):
            for frame in range(4):
                sheet.paste(
                    pose(friend, action, direction, frame),
                    (((row%2)*4+frame) * FRAME_W, (row//2) * FRAME_H),
                )
        # Indexed PNG retains transparent edge coverage and avoids shipping full RGBA.
        sheet = sheet.quantize(
            method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE
        )
        sheet.save(
            ROOT / f"assets/runtime/spritesheets/{friend}-temporary.png", optimize=True
        )


if __name__ == "__main__":
    main()
