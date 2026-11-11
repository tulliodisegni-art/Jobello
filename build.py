"""Assemble index.html à partir de carnet.html (la page de l'appli) : python3 build.py chemin/carnet.html"""
import sys, re
src = open(sys.argv[1]).read()
REPL = [
  ("Connecte-toi à claude.ai pour enregistrer", "Connecte-toi à Jobello pour enregistrer"),
  ("L'analyse avec Claude est disponible dans claude.ai", "Demande-le à Claude dans ton projet Jobello"),
  ("La lecture par Claude marche dans claude.ai", "Demande-le à Claude dans ton projet Jobello"),
  ("Disponible seulement dans claude.ai", "Demande-le à Claude dans ton projet Jobello"),
  ("Disponible dans claude.ai", "Demande-le à Claude dans ton projet Jobello"),
  ("Reconnecte-toi à claude.ai puis réessaie.", "Demande-le à Claude dans ton projet Jobello."),
  ("Ouvre l'appli depuis claude.ai, connecté à ton compte, pour retrouver tes candidatures.", "Connecte-toi pour retrouver tes candidatures."),
  ("La rédaction avec Claude n'est pas disponible dans cette vue.", "Demande-le à Claude dans ton projet Jobello."),
]
for a, b in REPL: src = src.replace(a, b)
src = re.sub(r'<meta name="claude:[^>]*>\n?', "", src)
head = '''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f4f8f7">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Jobello">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" href="icons/icon-192.png">
<style>body{margin:0}[hidden]{display:none!important}</style>
<script>window.GATE_CFG={app:"jobello",name:"Jobello",url:"https://vvxkkqcmjrwytagbxdfg.supabase.co",key:"sb_publishable_A-kJQIoJXxdXmjHF8iM40g_RP6myhMo",link:"https://tulliodisegni-art.github.io/Jobello/",logo:"icons/icon-192.png",accent:"#E9B949",isOwner:function(){try{if(localStorage.getItem("jb_owner")==="1")return true;var a=JSON.parse(localStorage.getItem("jobello.auth")||"null");return !!(a&&a.user&&String(a.user.email).toLowerCase()==="tulliodisegni@icloud.com")}catch(e){return false}}};</script><script src="gate.js"></script>
<script src="config.js"></script>
<script src="vendor/supabase.js"></script>
<script src="shim.js"></script>
<script src="sync.js"></script>
</head>
<body>
'''
src = src.replace('<script>if ("serviceWorker" in navigator)', '<script src="notifs.js"></script>\n<script src="plus.js"></script>\n<script src="ciblage.js"></script>\n<script>if ("serviceWorker" in navigator)', 1) if "notifs.js" not in src else src
open("index.html", "w").write(head + src + "\n</body>\n</html>\n")
