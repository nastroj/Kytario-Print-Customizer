import sys

with open("src/components/SongbookPreview.tsx", "r") as f:
    content = f.read()

target = """    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, {
      rootMargin: '2500px 0px'
    });"""

replacement = """    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, {
      rootMargin: '100% 0px'
    });"""

content = content.replace(target, replacement)

with open("src/components/SongbookPreview.tsx", "w") as f:
    f.write(content)
