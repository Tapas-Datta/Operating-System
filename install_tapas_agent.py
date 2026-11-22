from pathlib import Path
root=Path.cwd()
app=root/'src/App.tsx'; lib=root/'src-tauri/src/lib.rs'; mod=root/'src-tauri/src/commands/mod.rs'
for p in (app,lib,mod):
    if not p.exists(): raise SystemExit(f'Missing expected project file: {p}')
s=app.read_text()
if 'import TapasAI from "./TapasAI";' not in s:
    anchor='import Browser from "./components/browser/Browser";'
    if anchor not in s: raise SystemExit('Could not find Browser import')
    s=s.replace(anchor,anchor+'\nimport TapasAI from "./TapasAI";',1)
start=s.find('    // AI application\n    if (name === "AI") {')
if start>=0:
    end=s.find('\n    }',start)+6
    old=s[start:end]
    new='    // TAPAS AI desktop agent. Sicily AI routing remains unchanged.\n    if (name === "AI") {\n      return <TapasAI onOpenApp={(appName) => openApp(appName as AppName)} />;\n    }'
    s=s[:start]+new+s[end:]
elif 'return <TapasAI onOpenApp=' not in s:
    raise SystemExit('Could not locate the original AI application block')
app.write_text(s)
m=mod.read_text()
if 'pub mod agent;' not in m: mod.write_text(m+'\npub mod agent;\n')
l=lib.read_text()
if 'commands::agent::ask_tapas_ai' not in l:
    if '            greet,' not in l: raise SystemExit('Could not find Tauri handler anchor')
    l=l.replace('            greet,','            greet,\n            commands::agent::ask_tapas_ai,',1)
lib.write_text(l)
print('TAPAS AI integration patch applied. Sicily AI code path was not modified.')
