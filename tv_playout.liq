#!/usr/bin/liquidsoap

settings.server.telnet.set(true)
settings.server.telnet.port.set(1234)
settings.server.telnet.bind_addr.set("127.0.0.1")

# Format vidéo broadcast léger : 720p @ 25fps
settings.frame.video.width.set(1280)
settings.frame.video.height.set(720)
settings.frame.video.framerate.set(25)

# Variable interactive de sélection de source (0 = Standby / Attente, 1 = Playlist NAS, 2 = Direct OBS)
active_source = interactive.int("regie_source", 1)

# 1. Écran d'attente / Standby
attente = blank(duration=5.)

# 2. Playlist NAS
tv_playlist = playlist(
  id="tv_playlist",
  mode="normal",
  reload_mode="watch",
  "/home/grace/regie-tv/playlists/active_playlist.txt"
)

# 3. Flux Direct OBS (Entrée RTMP locale pour le culte en direct)
obs_live = input.rtmp(port=1936, path="/live/obs")

# Commutateur maître selon le bouton cliqué sur la console
master_stream = switch(track_sensitive=false, [
  ({ active_source() == 2 }, obs_live),
  ({ active_source() == 1 }, tv_playlist),
  ({ true }, attente)
])

# Sortie encodée vers Owncast
output.url(
  id="output_url",
  %ffmpeg(
    format="flv",
    %video(codec="libx264", b="1800k", preset="ultrafast", tune="zerolatency", threads=2),
    %audio(codec="aac", b="128k")
  ),
  url="rtmp://127.0.0.1:1935/live/abc123",
  master_stream
)
