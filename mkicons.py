from playwright.sync_api import sync_playwright
import pathlib
svg=pathlib.Path('icons/icon.svg').read_text().replace('width="512" height="512">','width="100%" height="100%">',1)
with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
  for n,s,pad in [('icon-192',192,0),('icon-512',512,0),('icon-maskable-512',512,1),('apple-touch-icon',180,0),('favicon',64,0)]:
    pg=b.new_page(viewport={'width':s,'height':s})
    k=int(s*.8) if pad else s
    pg.set_content(f'<body style="margin:0;background:#8fd16a;display:flex;align-items:center;justify-content:center;height:{s}px"><div style="width:{k}px;height:{k}px">{svg}</div></body>')
    pg.screenshot(path=f'icons/{n}.png');pg.close()
  b.close()
