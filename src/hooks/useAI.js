import { useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { topicOf, uid } from '../utils/helpers';

export function useAI({
  worldRef,
  lastAIHashRef,
  setAiNote,
  setAiBusy,
  setExpandBusy,
  setModalId,
  bump,
  addThought,
  pushUndo
}) {
  const simulateAI = () => {
    const w = worldRef.current;
    if (!w) return;
    const thoughts = w.nodes.filter(n => !n.isTopic && !n.isHub && !n.topicId && n.text.trim());
    const metaHubs = [];
    const topic = new Map(thoughts.map(t => [t.id, topicOf(t.text)]));

    const byTopic = {};
    for (const t of thoughts) { 
      const c = topic.get(t.id); 
      if (c) (byTopic[c] = byTopic[c] || []).push(t.id); 
    }
    for (const [cat, ids] of Object.entries(byTopic)) {
      const existingHub = w.nodes.find(n => 
        (n.isHub || n.isTopic) && n.title && n.title.toLowerCase() === cat.toLowerCase()
      );
      if (!existingHub && ids.length >= 5) {
        metaHubs.push({ topicName: cat, thoughtIds: ids });
      } else if (existingHub && ids.length >= 1) {
        metaHubs.push({ topicName: existingHub.title, thoughtIds: ids });
      }
    }
    if (metaHubs.length > 0) {
      useStore.getState().setAiTopicSuggestions(metaHubs.slice(0, 3));
    }
  };

  const callAI = async (prompt, schema, maxTokens = 2048) => {
    const apiKey = useStore.getState().apiKey;
    if (apiKey.startsWith('AIza') || apiKey.startsWith('AQ.')) {
      const cleanSchema = JSON.parse(JSON.stringify(schema));
      const removeExtra = (obj) => {
        if (obj.additionalProperties !== undefined) delete obj.additionalProperties;
        if (obj.properties) Object.values(obj.properties).forEach(removeExtra);
        if (obj.items) removeExtra(obj.items);
      };
      removeExtra(cleanSchema);

      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
      let lastErr = null;
      for (const model of modelsToTry) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: cleanSchema,
                maxOutputTokens: maxTokens,
              }
            })
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err.error && err.error.message) || `Gemini API error ${res.status}`);
          }
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          return JSON.parse(text);
        } catch (err) {
          lastErr = err;
          // If model is not found or unsupported, continue to try the next model
          if (err.message && err.message.includes('not found')) continue;
          throw err;
        }
      }
      throw lastErr;
    } else {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: maxTokens,
          output_config: { format: { type: 'json_schema', schema } },
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err.error && err.error.message) || `API error ${res.status}`);
      }
      const data = await res.json();
      const text = data.content.find(b => b.type === 'text');
      return JSON.parse(text.text);
    }
  };

  const runAI = useCallback(async () => {
    if (useStore.getState().pureDump) return;
    const w = worldRef.current;
    if (!w) return;
    const thoughts = w.nodes.filter(n => !n.isTopic && !n.isHub && !n.topicId && n.text.trim());
    if (thoughts.length < 2) return;
    const apiKey = useStore.getState().apiKey;
    if (!apiKey) { simulateAI(); return; }
    const hash = thoughts.map(t => t.id + t.text).join('|');
    if (hash === lastAIHashRef.current || useStore.getState().aiBusy) return;
    useStore.getState().aiBusy = true; setAiBusy(true); setAiNote('');
    try {
      const hubs = w.nodes
        .filter(n => (n.isHub || n.isTopic) && n.title)
        .map(n => ({ id: n.id, title: n.title }));

      const prompt = `You are the synthesis engine inside a brainstorming canvas. Analyze these thoughts and suggest connections and thematic clusters.
Thoughts (id: text):
${thoughts.map(t => `${t.id}: ${t.text}`).join('\n')}
Existing cluster hubs:
${JSON.stringify(hubs)}

Rules:
- Suggest at most 5 new connections between genuinely related thoughts. Each reason must be one short, specific sentence (max 10 words).
- NEW TOPICS: Propose a new topic ONLY when 5 or more unassigned thoughts share a strong theme NOT already covered by an existing hub.
- EXISTING TOPICS: If 1 or more unassigned thoughts belong to an existing hub/topic title from the list above, list them under that EXACT existing title. NEVER invent a new or duplicate title for an existing topic.
- Only use thought ids from the list above. Quality over quantity - an empty list is fine.`;
      const schema = {
        type: 'object',
        properties: {
          topics: {
            type: 'array',
            items: {
              type: 'object',
              properties: { topicName: { type: 'string' }, thoughtIds: { type: 'array', items: { type: 'string' } } },
              required: ['topicName', 'thoughtIds'], additionalProperties: false,
            },
          },
        },
        required: ['topics'], additionalProperties: false,
      };
      const out = await callAI(prompt, schema);
      lastAIHashRef.current = hash;
      useStore.getState().setAiTopicSuggestions((out.topics || []).slice(0, 3));
    } catch (e) {
      setAiNote(e.message.slice(0, 80));
      simulateAI();
    } finally {
      useStore.getState().aiBusy = false; setAiBusy(false);
    }
  }, [worldRef, lastAIHashRef, setAiBusy, setAiNote]);

  useEffect(() => {
    const t = setInterval(() => {
      const apiKey = useStore.getState().apiKey;
      if (useStore.getState().autoAIEnabled) runAI();
    }, useStore.getState().apiKey ? 60000 : 7000);
    return () => clearInterval(t);
  }, [runAI]);

  const expandThought = async (node) => {
    setExpandBusy(true);
    let ideas;
    try {
      if (useStore.getState().apiKey) {
        const out = await callAI(
          `In a brainstorming session, the thought is: "${node.text}"${node.notes ? ` (notes: ${node.notes})` : ''}.
Other thoughts on the canvas: ${worldRef.current.nodes.filter(n => !n.isHub && n.id !== node.id).slice(0, 20).map(n => n.text).join('; ')}
Generate exactly 3 short, concrete follow-on ideas that develop this thought. Each under 12 words. No numbering.`,
          { type: 'object', properties: { ideas: { type: 'array', items: { type: 'string' } } }, required: ['ideas'], additionalProperties: false },
          1024,
        );
        ideas = (out.ideas || []).slice(0, 4);
      }
    } catch (e) { setAiNote(e.message.slice(0, 80)); }
    if (!ideas || !ideas.length) {
      const stub = node.text.length > 40 ? node.text.slice(0, 40) + '…' : node.text;
      ideas = [
        `First concrete step toward: ${stub}`,
        `Biggest obstacle to: ${stub}`,
        `How do we measure: ${stub}`,
      ];
    }
    pushUndo();
    ideas.forEach((idea, i) => {
      const angle = (i / ideas.length) * Math.PI + Math.PI * 0.15;
      const child = addThought(idea, {
        at: { x: node.x + Math.cos(angle) * 240 * (i % 2 ? 1 : -1), y: node.y + 170 + Math.sin(angle) * 60 },
        skipUndo: true,
      });
      if (child) worldRef.current.links.push({ id: uid(), a: node.id, b: child.id });
    });
    setExpandBusy(false);
    setModalId(null);
    bump();
  };

  return {
    simulateAI,
    callAI,
    runAI,
    expandThought
  };
}
