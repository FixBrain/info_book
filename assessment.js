// Shared assessment interface for the third block and the final test.
(() => {
  'use strict';

  const { id, title, max, makeTasks } = assessmentConfig;
  const key = `ss-assessment:v1:${id}`;
  const byId = (name) => document.getElementById('assessment-' + name);
  const form = byId('form');
  const taskList = byId('tasks');
  const submit = byId('submit');
  const retry = byId('retry');
  const download = byId('download');
  const score = byId('score');
  let storageUnavailable = false;

  function assessmentRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value + 0x6D2B79F5) >>> 0;
      let bits = Math.imul(value ^ (value >>> 15), value | 1);
      bits ^= bits + Math.imul(bits ^ (bits >>> 7), bits | 61);
      return ((bits ^ (bits >>> 14)) >>> 0) / 4294967296;
    };
  }

  function newSeed() {
    if (window.crypto?.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0];
    return Math.floor(Math.random() * 4294967296);
  }

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (!saved || !Number.isInteger(saved.seed) || saved.seed < 0 || saved.seed > 0xFFFFFFFF ||
          !Number.isInteger(saved.attempt) || saved.attempt < 1 || !saved.values ||
          Array.isArray(saved.values) || typeof saved.values !== 'object' ||
          Object.values(saved.values).some((value) => typeof value !== 'string' && !Array.isArray(value)) ||
          !Number.isInteger(saved.best) || saved.best < 0 || saved.best > max ||
          (saved.completedAt && Number.isNaN(Date.parse(saved.completedAt))) ||
          (saved.last && (typeof saved.last.report !== 'string' || !Number.isInteger(saved.last.attempt)))) {
        return null;
      }
      return saved;
    } catch {
      return null;
    }
  }

  let progress = loadProgress() ?? { seed: newSeed(), attempt: 1, values: {}, completedAt: null, best: 0, last: null };
  let tasks;

  function saveProgress() {
    if (storageUnavailable) return;
    try {
      localStorage.setItem(key, JSON.stringify(progress));
    } catch {
      storageUnavailable = true;
      byId('storage').hidden = false;
    }
  }

  function nameOf(taskIndex, partIndex) {
    return `answer-${taskIndex + 1}-${partIndex + 1}`;
  }

  function normalize(value, mode) {
    const text = String(value ?? '').trim();
    if (mode === 'record') return text.replace(/\s/g, '').replace('.', ',').normalize('NFC').toUpperCase();
    if (mode === 'symbol') return text.normalize('NFKC');
    if (mode === 'integer') {
      const integer = text.replace('−', '-');
      return /^[+-]?\d+$/.test(integer) ? String(BigInt(integer)) : null;
    }
    if (mode === 'tuple') {
      const entries = text.replace(/^\((.*)\)$/, '$1').trim().split(/\s*[,;]\s*|\s+/);
      const normalized = entries.map((entry) => normalize(entry, 'integer'));
      return normalized.includes(null) ? null : normalized.join(',');
    }
    if (mode === 'alphabet') {
      return text.replace(/[\s,;]+/g, '').normalize('NFC').toUpperCase();
    }
    return text;
  }

  function isCorrect(part, value) {
    if (part.kind === 'checkbox') {
      const expected = new Set(part.expected);
      return Array.isArray(value) && new Set(value).size === expected.size && value.every((item) => expected.has(item));
    }
    if (typeof value !== 'string' || !value.trim()) return false;
    const actual = normalize(value, part.normalization);
    return actual !== null && actual === normalize(part.expected, part.normalization);
  }

  function taskPoints(task) {
    return task.parts.reduce((sum, part) => sum + part.points, 0);
  }

  function evaluate() {
    return tasks.map((task, taskIndex) => {
      const answers = task.parts.map((_, partIndex) => progress.values[nameOf(taskIndex, partIndex)]);
      const correct = task.parts.map((part, partIndex) => isCorrect(part, answers[partIndex]));
      const points = task.parts.reduce((sum, part, index) => sum + (correct[index] ? part.points : 0), 0);
      return { answers, correct, points };
    });
  }

  function asText(part, value) {
    if (!value || (Array.isArray(value) && !value.length)) return 'Без ответа';
    if (!part.options) return String(value);
    const optionLabel = (optionId) => part.options.find((option) => option.value === optionId)?.label ?? optionId;
    return Array.isArray(value) ? value.map(optionLabel).join(', ') : optionLabel(value);
  }

  function expectedAnswer(part) {
    return part.answer ?? asText(part, part.expected);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderPart(part, taskIndex, partIndex) {
    const field = element('fieldset', `part part-${part.kind}`);
    const name = nameOf(taskIndex, partIndex);
    const value = progress.values[name];
    field.append(element('legend', '', part.label));

    if (part.kind === 'text') {
      const input = element('input', 'entry');
      input.type = 'text';
      input.name = name;
      input.maxLength = 100;
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('aria-label', part.label);
      input.value = typeof value === 'string' ? value : '';
      if (part.placeholder) input.placeholder = part.placeholder;
      if (part.normalization === 'integer') input.inputMode = 'numeric';
      field.append(input);
    } else {
      const options = element('div', 'choices');
      for (const option of part.options) {
        const label = element('label', 'choice');
        const input = document.createElement('input');
        input.type = part.kind;
        input.name = name;
        input.value = option.value;
        input.checked = part.kind === 'checkbox' ? Array.isArray(value) && value.includes(option.value) : value === option.value;
        label.append(input, element('span', '', option.label));
        options.append(label);
      }
      field.append(options);
    }
    return field;
  }

  function renderTask(task, index, result) {
    const section = element('section', 'question');
    section.dataset.task = index + 1;
    const heading = element('h2', '', `${index + 1}. ${task.title}`);
    heading.id = `task-heading-${index + 1}`;
    section.setAttribute('aria-labelledby', heading.id);
    const header = element('div', 'question-header');
    header.append(heading, element('span', 'question-points', `Максимум ${taskPoints(task)}`));
    section.append(header, element('p', 'prompt', task.prompt));
    if (task.context) {
      const context = element('div', 'math-context');
      context.innerHTML = task.context;
      section.append(context);
    }
    task.parts.forEach((part, partIndex) => {
      const field = renderPart(part, index, partIndex);
      if (progress.completedAt) {
        field.disabled = true;
        const correct = result.correct[partIndex];
        const feedback = correct ? 'Верно.' : `Верный ответ — ${expectedAnswer(part)}.`;
        field.append(element('p', `feedback ${correct ? 'correct' : 'incorrect'}`, feedback));
      }
      section.append(field);
    });
    if (progress.completedAt) {
      section.append(element('p', 'task-score', `За задание — ${result.points} из ${taskPoints(task)}.`));
      const review = element('div', 'review');
      const body = element('div');
      body.innerHTML = task.explanation;
      review.append(element('h3', '', 'Разбор'), body);
      section.append(review);
    }
    return section;
  }

  function updateSubmit() {
    const total = tasks.reduce((count, task) => count + task.parts.length, 0);
    const answered = Object.values(progress.values).filter((value) => Array.isArray(value) ? value.length : value.trim()).length;
    byId('answered').hidden = Boolean(progress.completedAt);
    byId('answered').textContent = `Заполнено ответов — ${answered} из ${total}.`;
    submit.disabled = Boolean(progress.completedAt) || !answered;
  }

  function render() {
    tasks = makeTasks(assessmentRandom(progress.seed));
    const results = evaluate();
    taskList.replaceChildren(...tasks.map((task, index) => renderTask(task, index, results[index])));
    byId('attempt').textContent = `Попытка ${progress.attempt}`;
    byId('best').textContent = progress.last ? `Лучший результат — ${progress.best} из ${max}.` : '';
    retry.hidden = !progress.completedAt;
    download.disabled = !progress.last;
    updateSubmit();
    score.replaceChildren();
    if (progress.completedAt) {
      const points = results.reduce((sum, result) => sum + result.points, 0);
      score.append(element('strong', '', `${points} из ${max} баллов.`));
    }
  }

  function plainText(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    for (const index of template.content.querySelectorAll('sub, sup')) {
      const marker = index.tagName === 'SUB' ? '_' : '^';
      index.replaceWith(document.createTextNode(marker + index.textContent));
    }
    for (const breakTag of template.content.querySelectorAll('br')) breakTag.replaceWith(' ');
    for (const block of template.content.querySelectorAll('p, li')) block.append(' ');
    return template.content.textContent.trim().replace(/\s+/g, ' ');
  }

  function makeReport(results, points) {
    const date = new Date(progress.completedAt).toLocaleString('ru-RU');
    const lines = [title, `Попытка ${progress.attempt} от ${date}`, `Результат — ${points} из ${max}.`,
      `Лучший результат — ${progress.best} из ${max}.`];
    tasks.forEach((task, index) => {
      const { answers, points: earned } = results[index];
      lines.push('', `${index + 1}. ${task.title} — ${earned} из ${taskPoints(task)}.`, task.prompt);
      if (task.context) lines.push(plainText(task.context));
      task.parts.forEach((part, partIndex) => {
        lines.push(`  ${part.label}`, `  Ваш ответ — ${asText(part, answers[partIndex])}.`,
          `  Верный ответ — ${expectedAnswer(part)}.`);
      });
      lines.push(`  Разбор. ${plainText(task.explanation)}`);
    });
    return lines.join('\r\n') + '\r\n';
  }

  form.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement) || progress.completedAt) return;
    const { name, type, value } = event.target;
    progress.values[name] = type === 'checkbox' ?
      Array.from(form.querySelectorAll(`input[name="${name}"]:checked`), (input) => input.value) : value;
    updateSubmit();
    saveProgress();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    const results = evaluate();
    const points = results.reduce((sum, result) => sum + result.points, 0);
    progress = { ...progress, completedAt: new Date().toISOString(), best: Math.max(progress.best, points) };
    progress.last = { attempt: progress.attempt, report: makeReport(results, points) };
    saveProgress();
    render();
    score.focus();
  });

  retry.addEventListener('click', () => {
    if (!progress.completedAt) return;
    const previousVariant = JSON.stringify(tasks);
    let seed = newSeed();
    while (JSON.stringify(makeTasks(assessmentRandom(seed))) === previousVariant) seed = (seed + 1) >>> 0;
    progress = { ...progress, seed, attempt: progress.attempt + 1, values: {}, completedAt: null };
    saveProgress();
    render();
    byId('attempt').focus();
  });

  download.addEventListener('click', () => {
    if (!progress.last) return;
    const url = URL.createObjectURL(new Blob(['\uFEFF', progress.last.report], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${id}-popytka-${progress.last.attempt}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== key) return;
    const updated = loadProgress();
    if (!updated) return;
    progress = updated;
    render();
  });

  saveProgress();
  render();
})();
