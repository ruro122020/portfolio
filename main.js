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
    tags: ["C", "RTOS", "Embedded", "Bare Metal", "In Progress"],
    link: "https://github.com/ruro122020/Custom-RTOS",
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

const POSTS = [
  {
    date: "May 2026",
    title: "Custom RTOS in C (series)",
    excerpt: "An ongoing series on building a real-time operating system in C from the ground up, working through the low-level mechanics one piece at a time.",
    link: "https://ruthr.hashnode.dev/series/rtos-in-c",
  },
  {
    date: "Sep 2025",
    title: "Installing Docker Engine on ARM64 Debian Linux",
    excerpt: "If Docker's default setup isn't working on ARM64 Debian Bookworm, this walks through the architecture and distribution checks that fixed it for me.",
    link: "https://ruthr.hashnode.dev/installing-docker-engine-in-arm64-linux-debian",
  },
  {
    date: "Oct 2024",
    title: "API Template with Flask, SQLAlchemy, and PostgreSQL",
    excerpt: "A reusable starting point for a Flask API: wiring up PostgreSQL with SQLAlchemy and Marshmallow, running migrations, and adding user auth with secure sessions.",
    link: "https://ruthr.hashnode.dev/api-template-with-flask-sqlalchemy-postgresql",
  },
];

const EXPERIENCE = [
  {
    role: "Junior Validation Automation Engineer",
    company: "AtlasIED",
    period: "Feb 2025 — Present",
    summary: "Build the platform that runs hardware validation for up to 30 remote test stations, replacing a slow, manual process and freeing several engineer-days per week across the team.",
    bullets: [
      "Design and build the backend services for a distributed test-automation platform in Go, using HTTP/3 over QUIC with TLS encryption to deliver test software to up to 30 remote test machines and run it reliably.",
      "Build a streaming file-transfer pipeline that delivers multi-gigabyte test packages piece by piece, eliminating the memory limits and transfer failures of the previous system.",
      "Engineer the platform with security throughout, adding protections against malicious archives (path-traversal, decompression bombs, unsafe links), enforcing encrypted connections, and sanitizing error responses so internal details are never exposed externally.",
      "Implement OS-aware execution so the platform runs and correctly interprets failures across Windows, macOS, and Linux, mapping each platform's error codes to consistent categories.",
      "Develop fault-tolerant download and dispatch logic, including request coalescing that fetches duplicate concurrent requests only once and caching that skips redundant downloads, saving time and bandwidth.",
      "Build structured logging and per-request tracing that follows each request end to end, turning cryptic failures into clear diagnostics for operators.",
      "Replace a slow, manual validation workflow with automation, reducing tester fatigue, surfacing defects earlier, and freeing several engineer-days per week across the team.",
    ],
  },
];

const SKILLS = {
  "Languages": ["Go (Golang)", "Python", "SQL"],
  "Backend & Networking": ["HTTP/3", "QUIC", "HTTP-based RPC", "REST APIs", "PostgreSQL", "Web Servers"],
  "Infrastructure & DevOps": ["Docker", "systemd services", "Git", "Bitbucket", "Jira"],
  "Currently Learning": ["RTOS", "Embedded Systems", "Bare-Metal C"],
};

/* ── HELPERS ── */
// Escape text inserted into HTML to avoid breaking markup
function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
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

document.getElementById("projectsGrid").innerHTML =
  PROJECTS.map((p, i) => projectCardHTML(p, i, false)).join("");
document.getElementById("sideProjectsGrid").innerHTML =
  SIDE_PROJECTS.map((p, i) => projectCardHTML(p, i, true)).join("");

/* ── RENDER: EXPERIENCE ── */
document.getElementById("experienceList").innerHTML = EXPERIENCE.map((job) => {
  const bullets = job.bullets.map((b) => `
    <li style="display:grid;grid-template-columns:auto 1fr;gap:0.85rem;font-size:0.9rem;line-height:1.6;color:var(--ink)">
      <span style="color:var(--accent);font-family:var(--mono);font-size:0.8rem;padding-top:0.1rem">—</span>
      <span>${esc(b)}</span>
    </li>`).join("");
  return `
    <div class="reveal" style="padding:2.5rem 0;border-bottom:1px solid var(--rule)">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;align-items:baseline;margin-bottom:0.75rem">
        <div>
          <div style="font-family:var(--serif);font-size:1.4rem;font-weight:400;letter-spacing:-0.01em">${esc(job.role)}</div>
          <div style="font-family:var(--mono);font-size:0.75rem;letter-spacing:0.06em;color:var(--accent);margin-top:0.25rem">${esc(job.company)}</div>
        </div>
        <div style="font-family:var(--mono);font-size:0.7rem;letter-spacing:0.06em;color:var(--ink-muted);text-transform:uppercase">${esc(job.period)}</div>
      </div>
      <p style="font-size:0.9rem;color:var(--ink-muted);font-style:italic;margin-bottom:1.5rem;max-width:640px">${esc(job.summary)}</p>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:0.85rem">${bullets}</ul>
    </div>`;
}).join("");

/* ── RENDER: SKILLS ── */
document.getElementById("skillsGrid").innerHTML =
  Object.entries(SKILLS).map(([cat, items]) => `
    <div>
      <div style="font-family:var(--mono);font-size:0.68rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:0.85rem">${esc(cat)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.4rem">${items.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div>
    </div>`).join("");

/* ── RENDER: LEARNING ── */
document.getElementById("learningList").innerHTML = LEARNING.map((item, i) => `
  <div class="learning-item reveal" style="transition-delay:${i * 0.07}s">
    <div>
      <div class="learning-topic">${esc(item.topic)}</div>
      <div class="learning-desc">${esc(item.desc)}</div>
    </div>
    <span class="learning-depth ${depthClass[item.depth]}">${esc(item.depthLabel)}</span>
  </div>`).join("");

/* ── RENDER: BLOG ── */
document.getElementById("blogList").innerHTML = POSTS.map((post, i) => {
  const external = post.link !== "#";
  const newTab = external ? ` target="_blank" rel="noopener noreferrer"` : "";
  return `
  <a href="${esc(post.link)}"${newTab} class="blog-item reveal" style="transition-delay:${i * 0.07}s">
    <div class="blog-date">${esc(post.date)}</div>
    <div>
      <div class="blog-title">${esc(post.title)}</div>
      <div class="blog-excerpt">${esc(post.excerpt)}</div>
    </div>
    <span class="blog-arrow">→</span>
  </a>`;
}).join("");

/* ── INTERACTIVITY ── */

// Smooth scroll for any element with data-scroll
function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}
document.querySelectorAll("[data-scroll]").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    closeDrawer();
    scrollToId(link.getAttribute("data-scroll"));
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
