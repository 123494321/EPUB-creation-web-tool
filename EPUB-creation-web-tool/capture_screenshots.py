import subprocess
import os
import time

os.makedirs(r'논문\images', exist_ok=True)
chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
html_path = os.path.abspath('index.html')
file_url = f'file:///{html_path.replace("\\", "/")}'

# Configurations: (filename, width, height, custom_js_trigger)
shots = [
    ('fig1_pc_studio.png', 1600, 950),
    ('fig2_tablet_landscape.png', 1150, 750),
    ('fig3_tablet_portrait.png', 800, 1150),
    ('fig4_phone_portrait_titan.png', 412, 915),
]

for filename, w, h in shots:
    out_path = os.path.abspath(os.path.join('논문', 'images', filename))
    cmd = [
        chrome,
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        f'--window-size={w},{h}',
        f'--screenshot={out_path}',
        file_url
    ]
    print(f'Capturing {filename} at {w}x{h}...')
    subprocess.run(cmd, check=True)

print('Base Screenshots captured successfully!')
