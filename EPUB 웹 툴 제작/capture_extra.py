import subprocess
import os

os.makedirs(r'논문\images', exist_ok=True)
chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

# Let's create a temporary modified html that opens modal, or opens toc tab, or opens img tab
with open('index.html', 'r', encoding='utf-8') as f:
    base_html = f.read()

# 1. Modal Open
modal_html = base_html.replace('id="publishModal" class="modal-overlay"', 'id="publishModal" class="modal-overlay active"')
with open('temp_modal.html', 'w', encoding='utf-8') as f:
    f.write(modal_html)

# 2. TOC Tab Active
toc_html = base_html.replace('id="panelEditor" class="workspace-panel panel-editor active"', 'id="panelEditor" class="workspace-panel panel-editor"')
toc_html = toc_html.replace('id="panelToc" class="workspace-panel panel-toc"', 'id="panelToc" class="workspace-panel panel-toc active"')
toc_html = toc_html.replace('class="nav-tab active" data-target="panelEditor"', 'class="nav-tab" data-target="panelEditor"')
toc_html = toc_html.replace('class="nav-tab" data-target="panelToc"', 'class="nav-tab active" data-target="panelToc"')
with open('temp_toc.html', 'w', encoding='utf-8') as f:
    f.write(toc_html)

# 3. Image Tab Active
img_html = base_html.replace('id="panelEditor" class="workspace-panel panel-editor active"', 'id="panelEditor" class="workspace-panel panel-editor"')
img_html = img_html.replace('id="panelImg" class="workspace-panel panel-img"', 'id="panelImg" class="workspace-panel panel-img active"')
img_html = img_html.replace('class="nav-tab active" data-target="panelEditor"', 'class="nav-tab" data-target="panelEditor"')
img_html = img_html.replace('class="nav-tab" data-target="panelImg"', 'class="nav-tab active" data-target="panelImg"')
with open('temp_img.html', 'w', encoding='utf-8') as f:
    f.write(img_html)

extra_shots = [
    ('fig5_phone_modal.png', 'temp_modal.html', 412, 915),
    ('fig6_phone_toc_tab.png', 'temp_toc.html', 412, 915),
    ('fig7_phone_img_tab.png', 'temp_img.html', 412, 915)
]

for filename, temp_file, w, h in extra_shots:
    out_path = os.path.abspath(os.path.join('논문', 'images', filename))
    url = f'file:///{os.path.abspath(temp_file).replace("\\", "/")}'
    cmd = [
        chrome,
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        f'--window-size={w},{h}',
        f'--screenshot={out_path}',
        url
    ]
    print(f'Capturing {filename}...')
    subprocess.run(cmd, check=True)

# Cleanup
for temp_file in ['temp_modal.html', 'temp_toc.html', 'temp_img.html']:
    if os.path.exists(temp_file):
        os.remove(temp_file)

print('All UI Screenshots captured!')
