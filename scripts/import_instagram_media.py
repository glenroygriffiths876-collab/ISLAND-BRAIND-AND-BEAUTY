#!/usr/bin/env python3
"""Import only publicly reachable media from Island Braids' OWN Instagram posts.

Nothing is scraped behind login, and media is only accepted when the public
post metadata verifies @islandbraids.us as uploader. Failed downloads are
skipped; the site never claims a missing file exists.
"""
import json, os, subprocess, tempfile, urllib.parse
from pathlib import Path

OUT = Path("assets/instagram")
OUT.mkdir(parents=True, exist_ok=True)
POSTS = [
    # The five Reels the owner specifically selected, in the owner's order.
    ("featured-dztpo", "DZtpoIIuAhH"),
    ("featured-dyn5", "DYN5x57ubAK"),
    ("featured-dxq", "DXqVCdCEhJ-"),
    ("featured-dxar", "DXarAiYAagj"),
    ("featured-dwaa", "DWAaovIjksS"),
    # Already verified and locally stored assets (skip duplicate downloads).
    ("boho", "DIVOZl2OKeE"),
    ("hair-store", "DMty3PQOV2U"),
    ("boho-box", "DPY-NR1DrK7"),
    ("braid-finish", "DLurVy7KGBH"),
]
results = []

def safe_owner(owner):
    normalized = str(owner or "").lstrip("@").lower()
    return normalized in ("islandbraids.us", "islandbraids_us")

def poster_from_video(path, stem):
    output = OUT / (stem + ".webp")
    try:
        subprocess.run(["ffmpeg","-y","-loglevel","error","-ss","1","-i",str(path),
                        "-frames:v","1","-vf","scale='min(900,iw)':-2",str(output)],check=True,timeout=45)
        return output
    except Exception as e:
        print("Could not create poster:",str(e)[:180])
        return None

def has_audio(path):
    """Report genuine embedded audio; never claim mute clips have a soundtrack."""
    try:
        probe=subprocess.run(["ffmpeg","-hide_banner","-i",str(path)], 
                             capture_output=True,text=True,timeout=20)
        return "Audio:" in probe.stderr
    except Exception:
        return False

def prepare_video(path, stem):
    target = OUT / (stem + ".mp4")
    try:
        # Unlike the old importer, do NOT strip the audio track with "-an".
        # "?": gracefully handle Reels whose public file has no sound at source.
        subprocess.run(["ffmpeg","-y","-loglevel","error","-i",str(path),
                        "-t","27","-map","0:v:0","-map","0:a:0?",
                        "-vf","scale='min(760,iw)':-2",
                        "-c:v","libx264","-preset","veryfast","-crf","27",
                        "-pix_fmt","yuv420p","-c:a","aac","-b:a","128k",
                        "-ac","2","-movflags","+faststart",str(target)],
                        check=True,timeout=140)
        if target.stat().st_size>15500000:
            target.unlink(missing_ok=True)
            return None
        print("Audio retained:",has_audio(target),"clip:",stem)
        return target
    except Exception as e:
        print("Could not encode video:",str(e)[:220])
        return None

def via_ytdlp(stem, shortcode):
    import yt_dlp
    source = f"https://www.instagram.com/reel/{shortcode}/"
    with tempfile.TemporaryDirectory() as td:
        options = {"quiet":True,"no_warnings":True,"skip_download":True,"noplaylist":True,
                   "socket_timeout":15,"extractor_retries":1,"retries":1}
        with yt_dlp.YoutubeDL(options) as dl:
            info = dl.extract_info(source, download=False)
        owner = info.get("uploader_id") or info.get("channel_id") or info.get("uploader")
        if not safe_owner(owner):
            raise ValueError(f"Unverified Instagram author for {shortcode}: {owner}")
        opts={"quiet":True,"no_warnings":True,"outtmpl":td+"/video.%(ext)s","format":"best[ext=mp4]/best",
              "max_filesize":65000000,"socket_timeout":15,"retries":1}
        with yt_dlp.YoutubeDL(opts) as dl:
            dl.download([source])
        paths=[p for p in Path(td).iterdir() if p.is_file() and p.suffix.lower() in (".mp4",".webm",".mkv")]
        if not paths: raise RuntimeError("No video returned")
        poster=poster_from_video(paths[0],stem)
        clip=prepare_video(paths[0],stem)
        return bool(poster),bool(clip)

def via_instaloader(stem, shortcode):
    import instaloader, requests
    from PIL import Image
    loader=instaloader.Instaloader(download_pictures=False,download_videos=False,
                                 save_metadata=False,quiet=True,
                                 request_timeout=12,max_connection_attempts=1)
    post=instaloader.Post.from_shortcode(loader.context,shortcode)
    if not safe_owner(post.owner_username):
        raise ValueError(f"Wrong post author: {post.owner_username}")
    url=post.url
    resp=requests.get(url,headers={"User-Agent":"Mozilla/5.0"},timeout=20)
    resp.raise_for_status()
    with tempfile.NamedTemporaryFile(suffix=".jpg") as temp:
        temp.write(resp.content);temp.flush()
        with Image.open(temp.name) as im:
            im.convert("RGB").save(OUT/(stem+".webp"),"WEBP",quality=89,method=5)
    video_saved=False
    if post.is_video:
        raw=requests.get(post.video_url,headers={"User-Agent":"Mozilla/5.0"},
                         timeout=30,stream=True)
        raw.raise_for_status()
        with tempfile.NamedTemporaryFile(suffix=".mp4") as temp:
            size=0
            for chunk in raw.iter_content(1024*256):
                size+=len(chunk)
                if size>65000000:break
                temp.write(chunk)
            temp.flush()
            if size<=65000000:video_saved=bool(prepare_video(temp.name,stem))
    return True,video_saved

for stem,shortcode in POSTS:
    result={"name":stem,"post":shortcode,"photo":False,"video":False,
            "source":"https://www.instagram.com/reel/"+shortcode+"/"}
    # Reuse already-imported, verified videos instead of downloading every time.
    old_photo=(OUT/(stem+".webp")).exists()
    old_video=(OUT/(stem+".mp4")).exists()
    if old_photo and old_video and has_audio(OUT/(stem+".mp4")):
        result.update(photo=True, video=True, audio=True)
        results.append(result)
        print("Reusing existing video with working audio:",stem)
        continue
    if old_video:
        print("Old video has no audio; attempting a fresh sound-preserving import:",stem)
    try:
        result["photo"],result["video"]=via_instaloader(stem,shortcode)
        print("Imported via public Instagram metadata:",stem)
    except Exception as e:
        print("Instaloader unavailable for",stem,":",str(e)[:240])
        try:
            result["photo"],result["video"]=via_ytdlp(stem,shortcode)
            print("Imported via yt-dlp:",stem)
        except Exception as e2:
            print("Public access failed for",stem,":",str(e2)[:240])
    # A failed attempt must never make already-published video disappear.
    result["photo"]=(OUT/(stem+".webp")).is_file()
    result["video"]=(OUT/(stem+".mp4")).is_file()
    result["audio"]=has_audio(OUT/(stem+".mp4")) if result["video"] else False
    print("FINAL_REEL_MEDIA",stem,"video",result["video"],"audio",result["audio"])
    results.append(result)

# Only confirmed @islandbraids.us media is admitted. No unrelated creator content.
(OUT/"manifest.json").write_text(json.dumps(results,indent=2)+"\n")
print("MEDIA_RESULT",json.dumps(results))
