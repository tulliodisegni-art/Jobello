"""Assemble index.html à partir de carnet.html (la page de l'appli) : python3 build.py chemin/carnet.html"""
import sys, re
src = open(sys.argv[1]).read()
REPL = [
  ("Connecte-toi à claude.ai pour enregistrer", "Connecte-toi à Jobello pour enregistrer"),
  ("L'analyse avec Claude est disponible dans claude.ai", "Ajoute ta clé Anthropic dans Réglages (⚙︎)"),
  ("La lecture par Claude marche dans claude.ai", "Ajoute ta clé Anthropic dans Réglages (⚙︎)"),
  ("Disponible seulement dans claude.ai", "Ajoute ta clé Anthropic dans Réglages (⚙︎)"),
  ("Disponible dans claude.ai", "Ajoute ta clé Anthropic dans Réglages (⚙︎)"),
  ("Reconnecte-toi à claude.ai puis réessaie.", "Vérifie ta clé Anthropic dans Réglages (⚙︎)."),
  ("Ouvre l'appli depuis claude.ai, connecté à ton compte, pour retrouver tes candidatures.", "Connecte-toi pour retrouver tes candidatures."),
  ("La rédaction avec Claude n'est pas disponible dans cette vue.", "Ajoute ta clé Anthropic dans Réglages (⚙︎)."),
]
for a, b in REPL: src = src.replace(a, b)
src = re.sub(r'<meta name="claude:[^>]*>\n?', "", src)
head = '''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#EC4F86">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Jobello">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" href="icons/icon-192.png">
<style>body{margin:0}[hidden]{display:none!important}</style>
<script src="config.js"></script>
<script src="vendor/supabase.js"></script>
<script src="shim.js"></script>
<script src="sync.js"></script>
</head>
<body>
'''
open("index.html", "w").write(head + src + "\n</body>\n</html>\n")
