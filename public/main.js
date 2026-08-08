/* ─────────────────────────────────────────────
   Ruth Rojas — Portfolio
   Vanilla JS: data, rendering, and interactivity
   ───────────────────────────────────────────── */

/* ── DATA ── */
const PROJECTS = [
  {
    id: "01",
    name: "Distributed Test Execution Platform",
    desc: "Built to solve a real problem: executing automated tests on remote physical hardware at scale. The platform deploys test suites, manages remote processes cross-platform, and streams results back reliably, even under network variability. Uses HTTP/3 and QUIC for transport.",
    tags: ["Go (Golang)", "Python", "HTTP/3", "QUIC", "PostgreSQL", "CI/CD"],
    link: null,
    linkLabel: null,
    notice: "Proprietary, built for internal use. Code not publicly available.",
  },
];

const SIDE_PROJECTS = [
  {
    id: "S1",
    name: "AnimalsMD",
    desc: "A learning project to get comfortable designing and building REST APIs. Serves structured animal data with clean resource modeling, built to understand how a well-shaped API makes frontend consumption predictable and painless.",
    context: "Learning: API design & REST fundamentals",
    tags: ["API", "REST", "Backend"],
    link: "https://github.com/ruro122020/animalsmd-backend-2.0",
    linkLabel: "View on GitHub",
  },
  {
    id: "S2",
    name: "RTOS Task Scheduler",
    desc: "A from-scratch minimal scheduler to understand how real-time operating systems actually work. Manages two tasks that flash individual LEDs with independent timing constraints, a small scope that forces real decisions about preemption, task state, and hardware timing.",
    context: "Learning: Real-time operating systems & embedded",
    tags: ["C", "RTOS", "Embedded", "Bare Metal"],
    link: "https://github.com/ruro122020/RTOS",
    linkLabel: "View on GitHub",
  },
];

const LEARNING = [
  {
    topic: "RTOS Internals",
    desc: "Learning how a real-time operating system works by building one, specifically the scheduler. The project manages two tasks that flash LEDs 'simultaneously', which means understanding preemptive scheduling, task state machines, and timing guarantees at the hardware level.",
    depth: "building",
    depthLabel: "Building Projects",
  },
];

const SKILLS = {
  "Languages": ["Go (Golang)", "Python", "SQL"],
  "Backend & Networking": ["HTTP/3", "QUIC", "HTTP-based RPC", "REST APIs", "PostgreSQL", "Web Servers"],
  "Infrastructure & DevOps": ["Docker", "systemd services", "Git", "Bitbucket", "Jira"],
  "Currently Learning": ["Rust", "RTOS", "Embedded Systems", "Bare-Metal C"],
};

/* ── HELPERS ── */
// Escape text inserted into HTML to avoid breaking markup
function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// Render into a homepage-only container; a no-op on pages where it is absent
function renderInto(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

const depthClass = { docs: "depth-docs", building: "depth-building", deployed: "depth-deployed" };

/* ── RENDER: PROJECTS ── */
function projectCardHTML(p, i, bordered) {
  const borderStyle = bordered ? "border:1.5px solid var(--rule);" : "";
  const context = p.context
    ? `<div style="font-family:var(--mono);font-size:0.62rem;letter-spacing:0.07em;color:var(--accent);margin-bottom:0.6rem;opacity:0.85">${esc(p.context)}</div>`
    : "";
  const tags = p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("");
  let footer = "";
  if (p.link) {
    footer = `<a href="${esc(p.link)}" class="project-link" target="_blank" rel="noopener noreferrer">${esc(p.linkLabel)} <span class="project-link-arrow">→</span></a>`;
  } else if (p.notice) {
    footer = `<span style="font-family:var(--mono);font-size:0.65rem;letter-spacing:0.06em;color:var(--ink-muted);display:inline-flex;align-items:center;gap:0.4rem;opacity:0.7"><span style="font-size:0.8rem">🔒</span> ${esc(p.notice)}</span>`;
  }
  return `
    <div class="project-card reveal" style="transition-delay:${i * 0.08}s;${borderStyle}">
      <div class="project-number">/ ${esc(p.id)}</div>
      <div class="project-name">${esc(p.name)}</div>
      ${context}
      <p class="project-desc">${esc(p.desc)}</p>
      <div class="project-tags">${tags}</div>
      ${footer}
    </div>`;
}

renderInto("projectsGrid", PROJECTS.map((p, i) => projectCardHTML(p, i, false)).join(""));
renderInto("sideProjectsGrid", SIDE_PROJECTS.map((p, i) => projectCardHTML(p, i, true)).join(""));

/* ── RENDER: SKILLS ── */
renderInto("skillsGrid",
  Object.entries(SKILLS).map(([cat, items]) => `
    <div>
      <div style="font-family:var(--mono);font-size:0.68rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:0.85rem">${esc(cat)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.4rem">${items.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div>
    </div>`).join(""));

/* ── RENDER: LEARNING ── */
renderInto("learningList", LEARNING.map((item, i) => `
  <div class="learning-item reveal" style="transition-delay:${i * 0.07}s">
    <div>
      <div class="learning-topic">${esc(item.topic)}</div>
      <div class="learning-desc">${esc(item.desc)}</div>
    </div>
    <span class="learning-depth ${depthClass[item.depth]}">${esc(item.depthLabel)}</span>
  </div>`).join(""));

/* ── INTERACTIVITY ── */

// Smooth scroll for any element with data-scroll; when the target section is
// not on this page, fall through so the browser follows the /#section href
document.querySelectorAll("[data-scroll]").forEach((link) => {
  link.addEventListener("click", (e) => {
    const target = document.getElementById(link.getAttribute("data-scroll"));
    if (!target) return;
    e.preventDefault();
    closeDrawer();
    target.scrollIntoView({ behavior: "smooth" });
  });
});

// Mobile menu toggle
const hamburger = document.getElementById("hamburger");
const drawer = document.getElementById("navDrawer");
function closeDrawer() {
  hamburger.classList.remove("open");
  drawer.classList.remove("open");
}
hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("open");
  drawer.classList.toggle("open");
});

// Scroll reveal
const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add("visible");
      revealObserver.unobserve(e.target);
    }
  }),
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// Custom cursor (skips touch devices)
const cursor = document.getElementById("cursor");
const ring = document.getElementById("cursorRing");
const isTouch = window.matchMedia("(pointer: coarse)").matches;
if (isTouch) {
  cursor.style.display = "none";
  ring.style.display = "none";
  document.body.style.cursor = "auto";
} else {
  window.addEventListener("mousemove", (e) => {
    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";
    ring.style.left = e.clientX + "px";
    ring.style.top = e.clientY + "px";
  });
}
