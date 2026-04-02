import os

files = ['part1.txt', 'part2.txt', 'part3.txt', 'part4.txt']
with open('teariq.md', 'w', encoding='utf-8') as outfile:
    for fname in files:
        if os.path.exists(fname):
            with open(fname, 'r', encoding='utf-8') as infile:
                outfile.write(infile.read())
                outfile.write('\n')

print("Files merged successfully into teariq.md")
