# Tutun sinovi: index.html ni soxta (xotiradagi) Firebase bilan ochib, har bir bo'limni
# kompyuter (1366px) va telefon (390px) o'lchamida ko'rsatadi. Xato bo'lsa, chiqish kodi 1.
# Ishlatish: python3 tools/smoke/run.py   (playwright + chrome kerak)
import sys, os, subprocess, time, tempfile, shutil
from playwright.sync_api import sync_playwright
R=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
head=open(f'{R}/src/vendor/firebase-head.js').read(); stub=open(f'{R}/tools/smoke/firebase-stub.js').read()
s=open(f'{R}/index.html').read(); assert s.count(head)==1, "index.html eskirgan: npm run build"
s=s.replace(head,stub).replace('<head>','<head><script>localStorage.setItem("eco.device",JSON.stringify("u1"));localStorage.setItem("eco.sess",JSON.stringify({id:"o1",k:"abcdefghijklmnop",until:Date.now()+864e5}));</script>',1)
d=tempfile.mkdtemp(); open(f'{d}/index.html','w').write(s)
for f in ['logo.png','manifest.json','icon-192.png']: shutil.copy(f'{R}/{f}',d)
shutil.copytree(f'{R}/fonts',f'{d}/fonts')
srv=subprocess.Popen([sys.executable,'-m','http.server','8131','-d',d],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
TABS="bosh sotuv tovarlar mijozlar taminot hisobot inventar kassa marketing tahlil buyurtma sozlama".split()
bad=0
try:
  with sync_playwright() as p:
    exe='/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None
    b=p.chromium.launch(executable_path=exe,args=['--no-sandbox'])
    for w,h,name in [(1366,768,'kompyuter'),(390,844,'telefon')]:
        pg=b.new_page(viewport={'width':w,'height':h}); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)[:200]))
        pg.goto('http://localhost:8131/index.html'); pg.wait_for_timeout(2500)
        for t in TABS:
            pg.evaluate(f'(b=>b&&b.click())(document.querySelector(\'[data-tab="{t}"]\'))'); pg.wait_for_timeout(400)
            n=len(pg.inner_text('#main').strip())
            ok=n>50 and not errs; bad+=not ok
            print(f"{name:10} {t:10} {'OK' if ok else 'XATO'} ({n} belgi) {' | '.join(errs)}"); errs.clear()
        pg.close()
    b.close()
finally:
  srv.terminate(); shutil.rmtree(d)
sys.exit(1 if bad else 0)
