import docx
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
import re

def set_font(run, name='Times New Roman', size=12, bold=False, italic=False):
    run.font.name = name
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    r = run._element
    r.rPr.rFonts.set(qn('w:eastAsia'), name)

def process_inline_formatting(paragraph, text, size=12):
    """Превръща **bold** и *italic* в Word форматиране"""
    # Премахваме излишни спейсове
    text = text.strip()
    parts = re.split(r'(\*\*.*?\*\*|\*.*?\*)', text)
    for part in parts:
        if not part: continue
        if part.startswith('**') and part.endswith('**'):
            run = paragraph.add_run(part[2:-2])
            set_font(run, size=size, bold=True)
        elif part.startswith('*') and part.endswith('*'):
            run = paragraph.add_run(part[1:-1])
            set_font(run, size=size, italic=True)
        else:
            run = paragraph.add_run(part)
            set_font(run, size=size)

def generate():
    try:
        doc = docx.Document('ТИТУЛНА-12б.docx')
    except:
        print("Грешка: Липсва 'ТИТУЛНА-12б.docx'")
        return

    doc.add_page_break()

    with open('теория.md', 'r', encoding='utf-8') as f:
        content = f.read()

    # Почистване на заглавията
    content = re.sub(r'# ПЪЛНА ТЕОРЕТИЧНА.*?\n', '', content)
    content = re.sub(r'## 2\. СЪДЪРЖАНИЕ.*?## 3\. УВОД', '## 3. УВОД', content, flags=re.DOTALL)
    
    lines = content.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line: continue
        
        if any(x in line for x in ["АВТОР:", "ТЕМА:", "КЛАС:", "РЪКОВОДИТЕЛ:", "ИНСТИТУЦИЯ:", "Документирано от"]):
            continue

        if line.startswith('### '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(14)
            p.paragraph_format.space_after = Pt(6)
            run = p.add_run(line.replace('### ', ''))
            set_font(run, size=14, bold=True)
        elif line.startswith('## '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(18)
            p.paragraph_format.space_after = Pt(10)
            run = p.add_run(line.replace('## ', ''))
            set_font(run, size=16, bold=True)
        elif line.startswith('# '):
            doc.add_page_break()
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_after = Pt(20)
            run = p.add_run(line.replace('# ', '').upper())
            set_font(run, size=18, bold=True)
        elif line.startswith('* ') or line.startswith('- '):
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.3)
            p.paragraph_format.space_after = Pt(4)
            p.add_run('• ') # Ръчен булет
            process_inline_formatting(p, line[2:])
        elif line.startswith('```'):
            continue
        else:
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.first_line_indent = Inches(0.5) # Стандартен абзац
            p.paragraph_format.space_after = Pt(8)
            process_inline_formatting(p, line)

    doc.save('Diplomen_Proekt_Personal_Cloud.docx')
    print("Документът е подреден и генериран успешно!")

if __name__ == "__main__":
    generate()
