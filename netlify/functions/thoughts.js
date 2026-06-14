// Netlify Function: stores each team's "Team Thoughts" list in Netlify Blobs
// so any device (team phone or the host's laptop) sees the same list.
//
// GET    /.netlify/functions/thoughts?team=0        -> { thoughts: [...] }
// POST   /.netlify/functions/thoughts  {team, text} -> appends, returns { thoughts: [...] }
// DELETE /.netlify/functions/thoughts  {team, idx}  -> removes item at idx, returns { thoughts: [...] }
// DELETE /.netlify/functions/thoughts  {team, clear:true} -> clears that team's whole list
// DELETE /.netlify/functions/thoughts  {resetAll:true}    -> clears ALL teams' lists (host reset)

import { getStore } from "@netlify/blobs";

const STORE_NAME = "smtm-thoughts";

function keyFor(team) {
  return `team-${team}`;
}

export default async (req) => {
  const store = getStore(STORE_NAME);
  const url = new URL(req.url);

  if (req.method === "GET") {
    const team = url.searchParams.get("team");
    if (team === null) {
      return Response.json({ error: "Missing team" }, { status: 400 });
    }
    const list = (await store.get(keyFor(team), { type: "json" })) || [];
    return Response.json({ thoughts: list });
  }

  if (req.method === "POST") {
    const { team, text } = await req.json();
    if (team === undefined || !text || !text.trim()) {
      return Response.json({ error: "Missing team or text" }, { status: 400 });
    }
    const list = (await store.get(keyFor(team), { type: "json" })) || [];
    list.push(text.trim());
    await store.setJSON(keyFor(team), list);
    return Response.json({ thoughts: list });
  }

  if (req.method === "DELETE") {
    const body = await req.json();

    // Host reset: clear every team's list
    if (body.resetAll) {
      for (let t = 0; t < 5; t++) {
        await store.setJSON(keyFor(t), []);
      }
      return Response.json({ ok: true });
    }

    const { team, idx, clear } = body;
    if (team === undefined) {
      return Response.json({ error: "Missing team" }, { status: 400 });
    }

    // Clear a single team's whole list
    if (clear) {
      await store.setJSON(keyFor(team), []);
      return Response.json({ thoughts: [] });
    }

    if (idx === undefined) {
      return Response.json({ error: "Missing idx" }, { status: 400 });
    }
    const list = (await store.get(keyFor(team), { type: "json" })) || [];
    list.splice(idx, 1);
    await store.setJSON(keyFor(team), list);
    return Response.json({ thoughts: list });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config = {
  path: "/.netlify/functions/thoughts",
};
