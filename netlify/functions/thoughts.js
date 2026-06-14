// Netlify Function: stores each team's "Show Me The Money" data in Netlify Blobs
// so any device (team phone or the host's laptop) sees the same data.
//
// Per team, stored data shape: { thoughts: [...], answers: ["","",""], recommendation: "" }
//
// GET    /.netlify/functions/thoughts?team=0
//        -> { thoughts: [...], answers: [...], recommendation: "" }
// POST   /.netlify/functions/thoughts  {team, text}
//        -> appends a thought, returns full team data
// POST   /.netlify/functions/thoughts  {team, answers, recommendation}
//        -> saves the 3 starter-question answers and/or the recommendation, returns full team data
// DELETE /.netlify/functions/thoughts  {team, idx}        -> removes thought at idx
// DELETE /.netlify/functions/thoughts  {team, clear:true} -> clears that team's thoughts list
// DELETE /.netlify/functions/thoughts  {resetAll:true}    -> resets ALL teams (host reset)

import { getStore } from "@netlify/blobs";

const STORE_NAME = "smtm-thoughts";

function keyFor(team) {
  return `team-${team}`;
}

function blank() {
  return { thoughts: [], answers: ["", "", ""], recommendation: "" };
}

function normalize(data) {
  if (!data) return blank();
  // Backwards-compat: older entries were stored as a plain array of thoughts
  if (Array.isArray(data)) {
    return { thoughts: data, answers: ["", "", ""], recommendation: "" };
  }
  return {
    thoughts: Array.isArray(data.thoughts) ? data.thoughts : [],
    answers: Array.isArray(data.answers) ? data.answers : ["", "", ""],
    recommendation: typeof data.recommendation === "string" ? data.recommendation : "",
  };
}

export default async (req) => {
  const store = getStore(STORE_NAME);
  const url = new URL(req.url);

  if (req.method === "GET") {
    const team = url.searchParams.get("team");
    if (team === null) {
      return Response.json({ error: "Missing team" }, { status: 400 });
    }
    const data = normalize(await store.get(keyFor(team), { type: "json" }));
    return Response.json(data);
  }

  if (req.method === "POST") {
    const body = await req.json();
    const { team } = body;
    if (team === undefined) {
      return Response.json({ error: "Missing team" }, { status: 400 });
    }
    const data = normalize(await store.get(keyFor(team), { type: "json" }));

    if (body.text !== undefined) {
      if (!body.text.trim()) {
        return Response.json({ error: "Missing text" }, { status: 400 });
      }
      data.thoughts.push(body.text.trim());
    }
    if (body.answers !== undefined) {
      data.answers = body.answers;
    }
    if (body.recommendation !== undefined) {
      data.recommendation = body.recommendation;
    }

    await store.setJSON(keyFor(team), data);
    return Response.json(data);
  }

  if (req.method === "DELETE") {
    const body = await req.json();

    // Host reset: clear every team's data
    if (body.resetAll) {
      for (let t = 0; t < 5; t++) {
        await store.setJSON(keyFor(t), blank());
      }
      return Response.json({ ok: true });
    }

    const { team, idx, clear } = body;
    if (team === undefined) {
      return Response.json({ error: "Missing team" }, { status: 400 });
    }
    const data = normalize(await store.get(keyFor(team), { type: "json" }));

    // Clear a single team's thoughts list
    if (clear) {
      data.thoughts = [];
      await store.setJSON(keyFor(team), data);
      return Response.json(data);
    }

    if (idx === undefined) {
      return Response.json({ error: "Missing idx" }, { status: 400 });
    }
    data.thoughts.splice(idx, 1);
    await store.setJSON(keyFor(team), data);
    return Response.json(data);
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config = {
  path: "/.netlify/functions/thoughts",
};
