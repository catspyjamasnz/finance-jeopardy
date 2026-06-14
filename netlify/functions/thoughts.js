// Netlify Function: stores each team's "Team Thoughts" list in Netlify Blobs
// so any device (team phone or the host's laptop) sees the same list.
//
// GET    /.netlify/functions/thoughts?team=0        -> { thoughts: [...] }
// POST   /.netlify/functions/thoughts  {team, text} -> appends, returns { thoughts: [...] }
// DELETE /.netlify/functions/thoughts  {team, idx}  -> removes item at idx, returns { thoughts: [...] }

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
    const { team, idx } = await req.json();
    if (team === undefined || idx === undefined) {
      return Response.json({ error: "Missing team or idx" }, { status: 400 });
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
