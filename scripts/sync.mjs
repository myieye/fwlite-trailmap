// Pulls GitHub + forum data for everything trailmap.config.yaml mentions and writes
// src/data/snapshot.json. REST only, so it works with the Actions GITHUB_TOKEN or no token at all
// (the unauthenticated limit of 60 requests/hour is enough for a run or two).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = parse(await readFile(resolve(root, 'trailmap.config.yaml'), 'utf8'));
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const now = new Date();
const since = new Date(now.getTime() - (config.activity?.days ?? 70) * 86400_000);

let requests = 0;
async function getJson(url, headers = {}) {
  for (let attempt = 0; ; attempt++) {
    requests++;
    const res = await fetch(url, { headers: { 'user-agent': 'trailmap-sync', ...headers } });
    if (res.ok) return res.json();
    // Discourse rate-limits anonymous bursts with 429.
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    throw new Error(`${res.status} ${res.statusText} for ${url}: ${(await res.text()).slice(0, 200)}`);
  }
}

const gh = (path) =>
  getJson(`https://api.github.com${path}`, {
    accept: 'application/vnd.github+json',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  });

async function ghPages(path, maxPages = 10) {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const batch = await gh(`${path}${sep}per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

const repoByKey = Object.fromEntries(config.repos.map((r) => [r.key, r]));
const repoKeyByFullName = Object.fromEntries(
  config.repos.map((r) => [`${r.owner}/${r.name}`.toLowerCase(), r.key]),
);
const aliases = config.people?.aliases ?? {};
const ignored = new Set(config.people?.ignore ?? []);
const person = (login) => aliases[login] ?? login;

const items = {};
function addItem(repoKey, raw) {
  const key = `${repoKey}#${raw.number}`;
  const isPr = Boolean(raw.pull_request);
  items[key] = {
    key,
    repo: repoKey,
    number: raw.number,
    kind: isPr ? 'pr' : 'issue',
    state: isPr && raw.pull_request.merged_at ? 'merged' : raw.state,
    draft: raw.draft || undefined,
    title: raw.title,
    url: raw.html_url,
    labels: raw.labels.map((l) => (typeof l === 'string' ? l : l.name)),
    author: person(raw.user.login),
    bot: ignored.has(raw.user.login) || undefined,
    assignees: [...new Set((raw.assignees ?? []).map((a) => person(a.login)))],
    comments: raw.comments,
    reactions: raw.reactions?.total_count || undefined,
    milestone: raw.milestone?.title,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    closedAt: (isPr ? raw.pull_request.merged_at : null) ?? raw.closed_at ?? undefined,
    stateReason: raw.state_reason ?? undefined,
    refs: isPr ? closingRefs(repoKey, raw.body ?? '') : undefined,
  };
  return key;
}

// "Fixes #12", "closes sillsdev/harmony#3", "resolves https://github.com/o/r/issues/4"
function closingRefs(repoKey, body) {
  const refs = new Set();
  const re =
    /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|part of|towards|for)\b[:\s]+(?:https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/issues\/|([\w.-]+\/[\w.-]+)?#)(\d+)/gi;
  for (const m of body.matchAll(re)) {
    const full = (m[1] ?? m[2])?.toLowerCase();
    const target = full ? repoKeyByFullName[full] : repoKey;
    if (target) refs.add(`${target}#${m[3]}`);
  }
  return refs.size ? [...refs] : undefined;
}

const parseRef = (ref) => {
  const [repo, n] = ref.split('#');
  if (!repoByKey[repo] || !n) throw new Error(`Bad issue ref "${ref}" in config`);
  return [repo, Number(n)];
};

// 1. The summit milestone.
const summitRepo = repoByKey[config.summit.repo];
const milestones = await ghPages(`/repos/${summitRepo.owner}/${summitRepo.name}/milestones?state=all`);
const milestone = milestones.find((m) => m.title === config.summit.milestone);
if (!milestone) throw new Error(`Milestone "${config.summit.milestone}" not found`);
const summitKeys = (
  await ghPages(`/repos/${summitRepo.owner}/${summitRepo.name}/issues?milestone=${milestone.number}&state=all`)
)
  .filter((raw) => !raw.pull_request)
  .map((raw) => addItem(config.summit.repo, raw));

// 2. Recent activity and open PRs in every repo.
const releases = [];
for (const repo of config.repos) {
  const base = `/repos/${repo.owner}/${repo.name}`;
  for (const raw of await ghPages(`${base}/issues?state=all&sort=updated&since=${since.toISOString()}`, 15))
    addItem(repo.key, raw);
  // The pulls endpoint has no `pull_request` field; give it one so addItem treats it as a PR.
  for (const raw of await ghPages(`${base}/pulls?state=open`, 5))
    addItem(repo.key, { ...raw, pull_request: { merged_at: null } });
  for (const r of await ghPages(`${base}/releases`, 1)) {
    if (r.draft) continue;
    releases.push({ repo: repo.key, tag: r.tag_name, name: r.name, date: r.published_at, url: r.html_url, prerelease: r.prerelease });
  }
}

// 3. Anything the config names that we haven't seen yet.
const configRefs = [
  ...(config.camps ?? []).flatMap((c) => c.issues ?? []),
  ...(config.river ?? []).flatMap((c) => c.issues ?? []),
  ...Object.values(config.forum?.links ?? {}).flat(),
];
for (const ref of new Set(configRefs)) {
  if (items[ref]) continue;
  const [repoKey, n] = parseRef(ref);
  const repo = repoByKey[repoKey];
  addItem(repoKey, await gh(`/repos/${repo.owner}/${repo.name}/issues/${n}`));
}

// 4. Forum feature requests and the GitHub issues they point at.
const forum = [];
if (config.forum) {
  const { base, categoryId, categorySlug } = config.forum;
  const topics = [];
  for (let page = 0; page < 10; page++) {
    const list = await getJson(`${base}/c/${categorySlug}/${categoryId}/l/latest.json?page=${page}`);
    topics.push(...list.topic_list.topics);
    if (!list.topic_list.more_topics_url) break;
  }
  const ghLink = /github\.com\/([\w.-]+\/[\w.-]+)\/(?:issues|pull)\/(\d+)/g;
  for (const t of topics) {
    if (t.pinned || t.category_id !== categoryId) continue;
    const topic = await getJson(`${base}/t/${t.id}.json`);
    const html = topic.post_stream.posts.map((p) => p.cooked).join('\n');
    const refs = new Set(config.forum.links?.[t.id] ?? []);
    for (const m of html.matchAll(ghLink)) {
      const repoKey = repoKeyByFullName[m[1].toLowerCase()];
      if (repoKey) refs.add(`${repoKey}#${m[2]}`);
    }
    for (const ref of refs) {
      if (items[ref]) continue;
      const [repoKey, n] = parseRef(ref);
      const repo = repoByKey[repoKey];
      addItem(repoKey, await gh(`/repos/${repo.owner}/${repo.name}/issues/${n}`));
    }
    // Votes from before the voting plugin were carried over into titles as "(+2 votes)".
    const carried = /\s*\(\+(\d+) votes?\)/i.exec(t.title);
    forum.push({
      id: t.id,
      title: carried ? t.title.replace(carried[0], '') : t.title,
      url: `${base}/t/${t.slug}/${t.id}`,
      votes: (t.vote_count ?? 0) + Number(carried?.[1] ?? 0),
      likes: t.like_count ?? 0,
      replies: Math.max(0, (t.posts_count ?? 1) - 1),
      views: t.views ?? 0,
      createdAt: t.created_at,
      lastActivityAt: t.last_posted_at ?? t.bumped_at,
      tags: (t.tags ?? []).map((tag) => (typeof tag === 'string' ? tag : tag.name)),
      refs: [...refs],
    });
  }
}

const snapshot = {
  generatedAt: now.toISOString(),
  since: since.toISOString(),
  summit: { key: config.summit.repo, milestone: milestone.title, url: milestone.html_url, items: summitKeys },
  releases: releases.sort((a, b) => b.date.localeCompare(a.date)),
  forum,
  items,
};

const out = resolve(root, 'src/data/snapshot.json');
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(snapshot, null, 1) + '\n');
console.log(
  `Wrote ${Object.keys(items).length} items, ${releases.length} releases, ${forum.length} forum topics (${requests} requests${token ? '' : ', no token'})`,
);
