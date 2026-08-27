import re

app_path = 'src/App.jsx'
with open(app_path, 'r') as f:
    lines = f.readlines()

functions_to_extract = [
    "const pushUndo = useCallback(() => {",
    "const restoreSnapshot = (snap) => {",
    "const undo = useCallback(() => {",
    "const redo = useCallback(() => {",
    "const spawnBurst = useCallback((x, y, opts = {}) => {",
    "const createTopic = useCallback((name) => {",
    "const toggleVacuumPreview = useCallback(async (topicNode) => {",
    "const confirmVacuum = useCallback(() => {",
    "const cancelVacuum = useCallback(() => {",
    "const executeManualPull = useCallback((targetTopicId) => {",
    "const moveNodeAndChildrenToTopic = useCallback((nodeId, targetTopicId) => {",
    "const panToNode = useCallback((nodeId) => {",
    "const createLink = (a, b, skipUndo, opts = {}) => {",
    "const unlink = (id) => {",
    "const deleteNodes = (ids) => {"
]

hook_imports = """import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import { uid, pairKey } from '../utils/uid';
import { COLORS, CATEGORIES, TOPIC_ACCENT } from '../utils/colors';
import { topicOf, nodeRadius } from '../utils/nodeUtils';
import { hydrateNode } from '../utils/hydrateNode';
import { serializeWorld } from '../utils/serializeWorld';

export function useCanvasMutators({
  worldRef, viewRef, undoStack, redoStack, nodeBounds, bump, persist
}) {
"""

extracted_blocks = []

def extract_block(lines, start_line_idx):
    open_braces = 0
    in_block = False
    for i in range(start_line_idx, len(lines)):
        line = lines[i]
        if line is None:
            continue
        if "{" in line:
            open_braces += line.count("{")
            in_block = True
        if "}" in line:
            open_braces -= line.count("}")
        
        if in_block and open_braces <= 0:
            if line.strip().endswith(");") or line.strip().endswith("};") or line.strip().endswith("}, [bump]);") or line.strip().endswith("}, [bump, pushUndo, spawnBurst]);") or line.strip().endswith("}, [bump, persist, spawnBurst]);"):
                return lines[start_line_idx:i+1], i
            for j in range(i, min(i+5, len(lines))):
                if lines[j] and (lines[j].strip().endswith(");") or lines[j].strip().endswith("};")):
                    return lines[start_line_idx:j+1], j
            return lines[start_line_idx:i+1], i
            
    return [], -1

new_lines = lines[:]
for fn_sig in functions_to_extract:
    for i, line in enumerate(new_lines):
        if line and line.strip() and (line.strip().startswith(fn_sig) or line.strip() == fn_sig):
            block, end_idx = extract_block(new_lines, i)
            if block:
                extracted_blocks.append("".join(block))
                for k in range(i, end_idx+1):
                    new_lines[k] = None
            break

new_lines = [l for l in new_lines if l is not None]

hook_exports = "  return {\n    " + ", ".join([re.search(r'const (\w+) =', f).group(1) for f in functions_to_extract]) + "\n  };\n}\n"

with open('src/hooks/useCanvasMutators.js', 'w') as f:
    f.write(hook_imports + "\n" + "\n".join(extracted_blocks) + "\n" + hook_exports)

useWorkspace_idx = -1
for i, line in enumerate(new_lines):
    if line.strip() == "setInput, setDrawerOpen":
        useWorkspace_idx = i + 2
        break

if useWorkspace_idx != -1:
    mutators_instantiation = """
  const {
    spawnBurst, pushUndo, restoreSnapshot, undo, redo, createTopic,
    toggleVacuumPreview, confirmVacuum, cancelVacuum, executeManualPull,
    createLink, unlink, deleteNodes, moveNodeAndChildrenToTopic, panToNode
  } = useCanvasMutators({
    worldRef, viewRef, undoStack, redoStack, nodeBounds, bump, persist
  });
"""
    new_lines.insert(useWorkspace_idx, mutators_instantiation)

for i, line in enumerate(new_lines):
    if "import { useWorkspace }" in line:
        new_lines.insert(i + 1, "import { useCanvasMutators } from './hooks/useCanvasMutators';\n")
        break

with open(app_path, 'w') as f:
    f.writelines(new_lines)
