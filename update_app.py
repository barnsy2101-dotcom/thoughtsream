import re

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

# 1. Imports
for i, line in enumerate(lines):
    if "import { useCanvasRefs }" in line:
        lines[i] = "import { useCanvasRefs } from './hooks/useCanvasRefs';\nimport { useWorkspace } from './hooks/useWorkspace';\nimport { useAI } from './hooks/useAI';\n"
        break

# 2. Insert hooks and remove AI functions
# Find simulateAI
start_ai = -1
end_ai = -1
for i, line in enumerate(lines):
    if line.strip() == "const simulateAI = () => {":
        start_ai = i
    if start_ai != -1 and line.strip() == "setModalId(null);":
        # The end of expandThought is just after this
        end_ai = i + 2 # covers bump(); and };
        break

hooks_str = """  const {
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

  const { simulateAI, callAI, runAI, expandThought } = useAI({
    worldRef, lastAIHashRef, setAiNote, setAiBusy, setExpandBusy,
    setModalId, bump, addThought, pushUndo
  });

"""
if start_ai != -1 and end_ai != -1:
    lines = lines[:start_ai] + [hooks_str] + lines[end_ai+1:]

# 3. Remove workspace functions
start_ws = -1
end_ws = -1
for i, line in enumerate(lines):
    if line.strip() == "const persist = useCallback(() => {":
        start_ws = i
    if start_ws != -1 and line.strip() == "window.tsSwitchToToday = () => {":
        # Search for the end of tsSwitchToToday
        for j in range(i, len(lines)):
            if lines[j].strip() == "};" and "switchWorld(newW);" in lines[j-1]:
                end_ws = j
                break
        break

if start_ws != -1 and end_ws != -1:
    lines = lines[:start_ws] + lines[end_ws+1:]

with open('src/App.jsx', 'w') as f:
    f.writelines(lines)
