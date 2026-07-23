import sys, re

def check_braces(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    script_match = re.search(r'<script type="text/babel" data-presets="react-classic">(.*?)</script>', content, re.DOTALL)
    if not script_match:
        print("No script found")
        return
    script = script_match.group(1)
    
    stack = []
    lines = script.split('\n')
    for i, line in enumerate(lines):
        for j, char in enumerate(line):
            if char in "{[(": 
                stack.append((char, i+1, j+1))
            elif char in "}])":
                if not stack:
                    print(f"Unmatched {char} at line {i+1}:{j+1}")
                    return
                top, ti, tj = stack.pop()
                if (top == '{' and char != '}') or \
                   (top == '[' and char != ']') or \
                   (top == '(' and char != ')'):
                    print(f"Mismatched {char} at line {i+1}:{j+1}, expected to match {top} at line {ti}:{tj}")
                    return
    if stack:
        print(f"Unclosed braces: {stack}")
    else:
        print("Braces matched")

check_braces('index.html')
