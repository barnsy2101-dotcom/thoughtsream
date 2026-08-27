"""
Surgical patch script for App.jsx - applies Phases 1, 2, and 3.
Uses line-number based removal + targeted insertion.
"""

app_path = 'src/App.jsx'
with open(app_path, 'r') as f:
    lines = f.readlines()

print(f"Original App.jsx: {len(lines)} lines")

# ============================================================
# HELPER: Find a block by its first line signature
# Returns (start_idx, end_idx) both 0-indexed inclusive
# ============================================================
def find_block(lines, signature, start_from=0):
    start = -1
    for i in range(start_from, len(lines)):
        if lines[i].strip().startswith(signature.strip()):
            start = i
            break
    if start == -1:
        return -1, -1
    
    depth = 0
    for i in range(start, len(lines)):
        line = lines[i]
        depth += line.count('{') - line.count('}')
        if depth > 0:
            pass
        elif depth <= 0 and i > start:
            end = i
            # Consume trailing ); if present on next line
            stripped = lines[i].strip()
            if stripped in (');', '};', '}'):
                return start, i
            # Check if ends with }, [...]); pattern
            if stripped.endswith(');') or stripped.endswith('};'):
                return start, i
            # Look 1-2 lines ahead for dangling );
            for j in range(i+1, min(i+3, len(lines))):
                s = lines[j].strip()
                if s in (');', '};'):
                    return start, j
                if s.startswith('}, [') and s.endswith(');'):
                    return start, j
            return start, i
    return start, len(lines)-1

def mark_range(removed, start, end):
    for i in range(start, end+1):
        removed.add(i)
    print(f"  Marked lines {start+1}-{end+1} ({end-start+1} lines): {lines[start].strip()[:60]}")

removed = set()

# ============================================================
# PHASE 1: Remove individual inline useRef declarations
# ============================================================
print("\n=== PHASE 1: Removing inline useRef declarations ===")
refs_to_remove = [
    'const containerRef = useRef(null);',
    'const worldElRef = useRef(null);',
    'const bgRef = useRef(null);',
    'const nodeEls = useRef({});',
    'const pathEls = useRef({});',
    'const hitEls = useRef({});',
    'const labelEls = useRef({});',
    'const badgeEls = useRef({});',
    'const suggCardRef = useRef(null);',
    'const linkCardRef = useRef(null);',
    'const previewRef = useRef(null);',
    'const mouseRef = useRef({ x: 0, y: 0 });',
    'const dragRef = useRef(null);',
    'const panRef = useRef(null);',
    'const marqueeStartRef = useRef(null);',
    'const linkDragRef = useRef(null);',
    'const zoneEls = useRef({});',
    'const threadLineRef = useRef(null);',
    'const nodeBounds = useRef({});',
    'const observedNodes = useRef(new Set());',
    'const resizeObserver = useRef(null);',
    "const lastAIHashRef = useRef('');",
    'const undoStack = useRef([]);',
    'const redoStack = useRef([]);',
    'const recRef = useRef(null);',
    'const pullTetherGroupRef = useRef(null);',
    'const sourceTetherGroupRef = useRef(null);',
]
for ref in refs_to_remove:
    found = False
    for i, line in enumerate(lines):
        if line.strip() == ref.strip():
            removed.add(i)
            print(f"  Marked line {i+1}: {ref.strip()}")
            found = True
            break
    if not found:
        print(f"  NOT FOUND: {ref.strip()}")

# ============================================================
# PHASE 2: Remove workspace functions
# ============================================================
print("\n=== PHASE 2: Removing workspace functions ===")
workspace_sigs = [
    'const persist = useCallback(() => {',
    'const getUniqueCanvasName = (desiredName, currentId = null) => {',
    'const switchWorld = (w) => {',
    'const newCanvas = (projectId = null) => {',
    'const openSession = (id) => {',
    'const renameSession = (id, name) => {',
    'const duplicateSession = (id) => {',
    'const deleteSession = (id) => {',
    'const renameProject = (id, name) => {',
    'const deleteProjectHandler = (id) => {',
    'const moveCanvasToProject = (canvasId, projectId) => {',
    'const tsSwitchToToday = () => {',
]
for sig in workspace_sigs:
    start, end = find_block(lines, sig)
    if start == -1:
        print(f"  NOT FOUND: {sig}")
    else:
        mark_range(removed, start, end)

# Remove persist auto-save useEffect
print("  Removing persist setInterval useEffect...")
for i, line in enumerate(lines):
    if 'setInterval(persist, 2500)' in line:
        # Find the surrounding useEffect
        for j in range(max(0, i-3), i):
            if lines[j].strip().startswith('useEffect('):
                s, e = find_block(lines, 'useEffect(() => {', j)
                if s != -1 and s <= i <= e:
                    mark_range(removed, s, e)
                    break
        break

# Remove window.tsSwitchToToday assignment line
for i, line in enumerate(lines):
    if 'window.tsSwitchToToday = tsSwitchToToday;' in line:
        removed.add(i)
        print(f"  Marked line {i+1}: {line.strip()}")
        # Also remove the surrounding if block if it exists
        # Check if it's wrapped in an if(typeof window)
        if i > 0 and 'typeof window' in lines[i-1]:
            for j in range(max(0,i-2), i):
                if lines[j].strip().startswith('if (typeof window'):
                    s, e = find_block(lines, 'if (typeof window', j)
                    if s != -1:
                        mark_range(removed, s, e)
                    break
        break

# ============================================================
# PHASE 2: Remove AI functions
# ============================================================
print("\n=== PHASE 2: Removing AI functions ===")
ai_sigs = [
    'const simulateAI = () => {',
    'const callAI = async (prompt, schema, maxTokens = 2048) => {',
    'const runAI = async () => {',
    'const expandThought = async (node) => {',
]
for sig in ai_sigs:
    start, end = find_block(lines, sig)
    if start == -1:
        print(f"  NOT FOUND: {sig}")
    else:
        mark_range(removed, start, end)

# Remove the runAI auto-run useEffect (setInterval for runAI)
print("  Removing runAI setInterval useEffect...")
for i, line in enumerate(lines):
    if 'autoAIEnabled' in line and 'runAI()' in line and 'setInterval' in lines[i-1]:
        for j in range(max(0, i-3), i):
            if lines[j].strip().startswith('useEffect('):
                s, e = find_block(lines, 'useEffect(() => {', j)
                if s != -1 and s <= i <= e:
                    mark_range(removed, s, e)
                    break
        break

# ============================================================
# PHASE 3: Remove graph mutation functions
# ============================================================
print("\n=== PHASE 3: Removing graph mutation functions ===")
mutator_sigs = [
    'const pushUndo = useCallback(() => {',
    'const restoreSnapshot = (snap) => {',
    'const undo = useCallback(() => {',
    'const redo = useCallback(() => {',
    'const spawnBurst = useCallback((x, y, opts = {}) => {',
    'const createTopic = useCallback((name) => {',
    'const toggleVacuumPreview = useCallback(async (topicNode) => {',
    'const confirmVacuum = useCallback(() => {',
    'const cancelVacuum = useCallback(() => {',
    'const executeManualPull = useCallback((targetTopicId) => {',
    'const moveNodeAndChildrenToTopic = useCallback((nodeId, targetTopicId) => {',
    'const panToNode = useCallback((nodeId) => {',
    'const createLink = (a, b, skipUndo, opts = {}) => {',
    'const unlink = (id) => {',
    'const deleteNodes = (ids) => {',
]
for sig in mutator_sigs:
    start, end = find_block(lines, sig)
    if start == -1:
        print(f"  NOT FOUND: {sig}")
    else:
        mark_range(removed, start, end)

# Also remove the screenToWorld and byId helpers (they'll live in useCanvasMutators)
print("\n=== Removing screenToWorld and byId (moved to hook) ===")
for i, line in enumerate(lines):
    if line.strip().startswith('const screenToWorld = (sx, sy) => {'):
        s, e = find_block(lines, 'const screenToWorld = (sx, sy) => {', i)
        if s != -1:
            mark_range(removed, s, e)
        break
for i, line in enumerate(lines):
    if line.strip() == 'const byId = (id) => worldRef.current.nodes.find(n => n.id === id);':
        removed.add(i)
        print(f"  Marked line {i+1}: byId helper")
        break

# ============================================================
# FILTER OUT removed lines
# ============================================================
new_lines = [line for i, line in enumerate(lines) if i not in removed]
print(f"\n✅ Filtered: {len(lines)} -> {len(new_lines)} lines ({len(lines)-len(new_lines)} removed)")

content = ''.join(new_lines)

# ============================================================
# ADD HOOK IMPORTS at the top (after ExportSidebar import)
# ============================================================
hook_imports = """import { useCanvasRefs } from './hooks/useCanvasRefs';
import { useWorkspace } from './hooks/useWorkspace';
import { useAI } from './hooks/useAI';
import { useCanvasMutators } from './hooks/useCanvasMutators';
"""
# Insert after ExportSidebar import
content = content.replace(
    "import { ExportSidebar } from './components/ExportSidebar';",
    "import { ExportSidebar } from './components/ExportSidebar';\n\n" + hook_imports
)
print("✅ Added hook imports")

# ============================================================
# FIND insertion point for hook instantiations
# After the resizeObserver useEffect, before the sync useEffects
# ============================================================
# The resizeObserver useEffect ends with:
#   return () => resizeObserver.current?.disconnect();
#   }, []);
# followed by the sync useEffects

insertion_marker = "  return () => resizeObserver.current?.disconnect();\n  }, []);\n"
hook_instantiations = """
  // ── Phase 1: DOM & interaction refs ───────────────────────────────────────
  const {
    containerRef, worldElRef, bgRef, nodeEls, pathEls, hitEls, labelEls, badgeEls,
    suggCardRef, linkCardRef, previewRef, mouseRef, dragRef, panRef, marqueeStartRef,
    linkDragRef, zoneEls, threadLineRef, nodeBounds, observedNodes, resizeObserver,
    lastAIHashRef, undoStack, redoStack, recRef, pullTetherGroupRef, sourceTetherGroupRef
  } = useCanvasRefs();

  // ── Phase 2: Workspace management ─────────────────────────────────────────
  const {
    persist, getUniqueCanvasName, switchWorld, newCanvas,
    openSession, renameSession, duplicateSession, deleteSession,
    renameProject, deleteProjectHandler, moveCanvasToProject, tsSwitchToToday
  } = useWorkspace({
    worldRef, viewRef, undoStack, redoStack, lastAIHashRef,
    setActiveWorldId, bump, setSessionsRev, setModalId,
    setActiveLink, setLinkFrom, setSelIds, setReplayIdx,
    setTargetId, setActiveTopic, setTopicMenuOpen, setMenuOpen,
    setInput, setDrawerOpen
  });

  // ── Phase 3: Graph mutation functions ─────────────────────────────────────
  const {
    spawnBurst, pushUndo, restoreSnapshot, undo, redo,
    createTopic, toggleVacuumPreview, confirmVacuum, cancelVacuum,
    executeManualPull, createLink, unlink, deleteNodes,
    moveNodeAndChildrenToTopic, panToNode
  } = useCanvasMutators({
    worldRef, viewRef, undoStack, redoStack, nodeBounds, bump, persist,
    callAI: null, // provided via useAI below; vacuum AI fallback handles null gracefully
    setModalId, setActiveLink, setSelIds, setTargetId, setActiveTopic,
    setVacuumTopicId, setVacuumSelectedIds
  });

"""

if insertion_marker in content:
    content = content.replace(
        insertion_marker,
        insertion_marker + hook_instantiations
    )
    print("✅ Inserted hook instantiations after resizeObserver useEffect")
else:
    print("⚠️  WARNING: Could not find resizeObserver useEffect end marker!")
    # Fallback: insert after viewRef line
    viewref_line = "  const viewRef = useRef(fitViewForNodes(worldRef.current ? worldRef.current.nodes : []));\n"
    if viewref_line in content:
        content = content.replace(viewref_line, viewref_line + hook_instantiations)
        print("  Fallback: inserted after viewRef")

# ============================================================
# ADD AI hook instantiation after addThought (AI hook needs addThought)
# ============================================================
# Insert after the addThought useCallback closing, before the window globals useEffect
ai_instantiation = """
  // ── Phase 2: AI functions (needs addThought from above) ──────────────────
  const { simulateAI, callAI, runAI, expandThought } = useAI({
    worldRef, lastAIHashRef, bump, addThought, pushUndo,
    setAiBusy, setAiNote, setExpandBusy, setModalId
  });

"""
# Find the window globals useEffect (window.tsAdd, window.tsWorld, etc.)
window_effect_marker = "    window.tsAdd = (t) => addThought(t); window.tsWorld = () => worldRef.current;"
if window_effect_marker in content:
    # Insert the AI hook before the useEffect that registers window globals
    # Find the useEffect line just before this
    lines2 = content.split('\n')
    for i, line in enumerate(lines2):
        if window_effect_marker.strip() in line:
            # Look backwards for the useEffect(
            for j in range(i-1, max(0, i-5), -1):
                if lines2[j].strip().startswith('useEffect('):
                    insert_pos = j
                    # Join and insert
                    lines2.insert(insert_pos, ai_instantiation)
                    content = '\n'.join(lines2)
                    print("✅ Inserted useAI instantiation before window globals useEffect")
                    break
            break
else:
    print("⚠️  WARNING: Could not find window.tsAdd marker for AI hook insertion!")

# ============================================================
# Write output
# ============================================================
with open(app_path, 'w') as f:
    f.write(content)

final_count = len(content.split('\n'))
print(f"\n✅ Final App.jsx written: {final_count} lines")
print("Run 'npm run build' to verify.")
