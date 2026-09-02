import os
import shutil
import subprocess

paper_dir = os.path.abspath('논문')
images_dir = os.path.join(paper_dir, 'images')
os.makedirs(images_dir, exist_ok=True)

# User uploaded real phone screenshot paths
src_editor = r'C:/Users/nimba/.gemini/antigravity/brain/f725662f-0991-4740-9e20-d5585d968885/.user_uploaded/media_1788175448017.jpg'
src_toc = r'C:/Users/nimba/.gemini/antigravity/brain/f725662f-0991-4740-9e20-d5585d968885/.user_uploaded/media_1788175448012.jpg'
src_img = r'C:/Users/nimba/.gemini/antigravity/brain/f725662f-0991-4740-9e20-d5585d968885/.user_uploaded/media_1788175448013.jpg'
src_modal = r'C:/Users/nimba/.gemini/antigravity/brain/f725662f-0991-4740-9e20-d5585d968885/.user_uploaded/media_1788175448015.jpg'

# Copy to images_dir with proper filenames
shutil.copyfile(src_editor, os.path.join(images_dir, 'fig4_phone_portrait_titan.png'))
shutil.copyfile(src_toc, os.path.join(images_dir, 'fig6_phone_toc_tab.png'))
shutil.copyfile(src_img, os.path.join(images_dir, 'fig7_phone_img_tab.png'))
shutil.copyfile(src_modal, os.path.join(images_dir, 'fig5_phone_modal.png'))

print('Real device images copied successfully!')
