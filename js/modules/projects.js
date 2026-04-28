import { safeText, sanitizeLink, createSvgIcon } from './sanitize.js';

function createStackPill(label) {
  const pill = document.createElement('span');
  pill.className = 'stack-pill';
  pill.textContent = safeText(label);
  return pill;
}

function createFeatureItem(feature) {
  const item = document.createElement('li');
  item.textContent = safeText(feature);
  return item;
}

function createProjectCard(project) {
  const isComingSoon = project.status === 'coming-soon';

  const card = document.createElement('article');
  card.className = 'project-card reveal kali-shell' + (isComingSoon ? ' coming-soon' : '');

  const scan = document.createElement('span');
  scan.className = 'kali-scan';
  scan.setAttribute('aria-hidden', 'true');

  const mini = document.createElement('div');
  mini.className = 'kali-line kali-mini';
  mini.innerHTML = '<span class="host">kali@lab</span><span class="sym">$</span><span class="cmd"></span>';
  mini.querySelector('.cmd').textContent = safeText(project.command);

  const tag = document.createElement('div');
  tag.className = 'proj-tag';
  tag.textContent = safeText(project.tag || (isComingSoon ? 'Coming Soon' : 'Featured Project'));

  const title = document.createElement('h3');
  title.className = 'proj-title';
  title.textContent = safeText(project.title);

  const desc = document.createElement('p');
  desc.className = 'proj-desc';
  desc.textContent = safeText(project.description);

  const stackWrap = document.createElement('div');
  stackWrap.className = 'proj-stack';
  const stack = Array.isArray(project.stack) ? project.stack : [];
  stack.forEach((item) => stackWrap.appendChild(createStackPill(item)));

  const featureList = document.createElement('ul');
  featureList.className = 'proj-features';

  if (isComingSoon) {
    const prog = document.createElement('div');
    prog.className = 'project-progress-text';
    prog.textContent = '[ in progress... ]';

    card.append(scan, mini, tag, title, desc, stackWrap, prog);
    return card;
  }

  const features = Array.isArray(project.features) ? project.features : [];
  features.forEach((item) => featureList.appendChild(createFeatureItem(item)));

  const linkValue = sanitizeLink(project.link);
  if (linkValue) {
    const link = document.createElement('a');
    link.className = 'proj-link';
    link.href = linkValue;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const icon = createSvgIcon();
    link.appendChild(icon);
    link.appendChild(document.createTextNode('View on GitHub'));

    card.append(scan, mini, tag, title, desc, stackWrap, featureList, link);
    return card;
  }

  card.append(scan, mini, tag, title, desc, stackWrap, featureList);
  return card;
}

export async function initProjects() {
  const container = document.getElementById('projects-grid');
  if (!container) return;

  try {
    let response = await fetch('/data/projects.json', { cache: 'no-store' });
    if (!response.ok) {
      response = await fetch('/api/projects', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch projects');
    }

    const list = await response.json();
    container.innerHTML = '';

    list.forEach((project) => {
      container.appendChild(createProjectCard(project));
    });
  } catch {
    container.innerHTML = '';
    const fallback = document.createElement('article');
    fallback.className = 'project-card reveal';
    fallback.innerHTML = '<p class="proj-desc">Projects are temporarily unavailable.</p>';
    container.appendChild(fallback);
  }
}
