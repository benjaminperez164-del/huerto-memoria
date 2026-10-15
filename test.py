import sys,subprocess,time
from playwright.sync_api import sync_playwright
url=sys.argv[1] if len(sys.argv)>1 else None;srv=None;out=sys.argv[2] if len(sys.argv)>2 else 'shots'
if not url:
  srv=subprocess.Popen(['python3','-m','http.server','8941'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1);url='http://localhost:8941/'
errs=[]
def C(s):pg.click(s,force=True);pg.wait_for_timeout(150)
def shot(n):pg.screenshot(path=f'{out}/{n}.png')
def dev(btn):
  for i in range(5):C('#ver')
  C(btn)
def cultivate(first=False):
  for rep in range(3):
    pg.wait_for_function("document.querySelector('#pr').textContent.includes('de 3') && !document.querySelector('.plot.cov') && document.querySelector('.plot .p')",timeout=9000);pg.wait_for_timeout(200)
    if first and rep==0:shot('03_cultivo_mirar')
    idx=pg.evaluate("[...document.querySelectorAll('.plot')].map((p,i)=>p.querySelector('.p')?i:-1).filter(i=>i>=0)")
    pg.wait_for_selector('.plot.cov',timeout=9000);pg.wait_for_timeout(200)
    ps=pg.query_selector_all('.plot')
    if first and rep==0:
      w=[i for i in range(len(ps)) if i not in idx][0];ps[w].click(force=True);pg.wait_for_timeout(200);shot('04_cultivo_tocar')
    for i in idx:ps[i].click(force=True);pg.wait_for_timeout(120)
  pg.wait_for_selector('#nx',timeout=5000)
with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
  pg=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
  pg.on('console',lambda m: m.type=='error' and errs.append(m.text));pg.on('pageerror',lambda e: errs.append(str(e)))
  pg.goto(url);pg.wait_for_timeout(1200);shot('00_instalar');C('#instX');shot('01_inicio')
  C('#go');pg.wait_for_timeout(2200);ps=pg.query_selector_all('.plot')
  k=pg.evaluate("[...document.querySelectorAll('.plot')].findIndex(p=>p.querySelector('.hand'))")
  ps[(k+1)%4].click(force=True);pg.wait_for_timeout(200);shot('02_tutorial');ps[k].click(force=True);pg.wait_for_timeout(1700);C('#t3')
  cultivate(True);shot('05_cosecha')
  dev('#dCoins');C('#mk');shot('06_mercado');C('.shop .btn:not([disabled])');C('#nx')
  cultivate();C('#nx')
  pg.wait_for_selector('#pr b');pg.wait_for_timeout(1500);shot('07_plagas')
  t0=time.time()
  while time.time()-t0<31 and not pg.query_selector('#nx'):
    tgt=pg.evaluate("document.querySelector('#pr .ic')?.textContent")
    for el in pg.query_selector_all('.plot'):
      if tgt and el.evaluate("p=>p.dataset.pest")==tgt:el.click(force=True)
    pg.wait_for_timeout(250)
  pg.wait_for_selector('#nx',timeout=8000);shot('08_plagas_fin')
  dev('#dT20');C('#nx');pg.wait_for_timeout(300);shot('09_pausa20')
  dev('#dT60');C('#nx');pg.wait_for_timeout(300);shot('10_hora60')
  C('#end');pg.wait_for_timeout(300)
  while pg.query_selector('#pr') and 'sembrar' in pg.inner_text('#pr'):
    e=[x for x in pg.query_selector_all('.plot') if not x.inner_html()][0];e.click(force=True);pg.wait_for_timeout(450)
  shot('11_sembrar_manana');pg.wait_for_selector('#home',timeout=6000);shot('12_cierre');C('#home')
  dev('#dNext');C('#go');pg.wait_for_timeout(400);shot('13_recordar_ayer')
  items=pg.evaluate("S.tomorrow.items")
  for n,it in enumerate(items):
    if n==0:
      pg.query_selector_all('.plot')[(it['i']+1)%len(pg.query_selector_all('.plot'))].click(force=True);pg.wait_for_timeout(200)
    pg.wait_for_timeout(100);pg.query_selector_all('.plot')[it['i']].click(force=True);pg.wait_for_timeout(900)
  pg.wait_for_selector('#nx',timeout=5000);shot('14_recordar_fin')
  print('estado:',pg.evaluate("({lvl:S.lvl,coins:S.coins,size:S.size,seeds:S.seeds,flowers:S.flowers,played:S.played})"))
  b.close()
if srv:srv.kill()
print('ERRORS:',errs)
