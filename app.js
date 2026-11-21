(() => {
  const { topics, build, demo } = FutureFold;
  const $ = (selector, root = document) => root.querySelector(selector);
  const views = { home:$('#home-view'), quiz:$('#quiz-view'), result:$('#result-view') };
  const method = $('#method');
  const composer = $('#own-question');
  const promptInput = $('#own-text');
  const storageKey = 'future-fold-session-v2';
  const year = new Date().getFullYear();
  const format = new Intl.NumberFormat('zh-CN', { maximumFractionDigits:0 });
  const money = value => `¥${format.format(Math.round(value / 10) * 10)}`;
  const range = point => `${money(point.low)} – ${money(point.high)}`;
  const safe = value => String(value ?? '').replace(/[&<>"']/g,c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(storageKey)); } catch {}
  let draft = saved && Object.hasOwn(topics,saved.topic) ? restoreDraft(saved) : null;
  let example = null;
  let toastTimer;

  const entries = [
    ['routine','作息、独处、通勤和那些想留给自己的时间。'],
    ['study','外语、考试、转专业，或一项一直想学的技能。'],
    ['bonds','和家人、朋友、伴侣找到双方都舒服的相处方式。'],
    ['choice','要不要搬家、出发，或给自己换个方向。'],
    ['careerPlan','看现有经验能带你走多远，怎样试一份新工作。'],
    ['money','理清生活开销，看看怎么留下更多余量。'],
    ['salary','对照留任、晋升和换岗的固定工资情景。'],
  ];
  $('#topic-grid').innerHTML = entries.map(([key, intro]) => {
    const topic = topics[key];
    return `<button class="topic ${key}" type="button" data-start="${key}"><span class="topic-icon" aria-hidden="true">${topic.icon}</span><span class="topic-text"><strong>${topic.title}</strong><span>${intro}</span></span><span class="topic-spark" aria-hidden="true">✦</span></button>`;
  }).join('');

  function persist() {
    try {
      if (draft) sessionStorage.setItem(storageKey, JSON.stringify(draft));
      else sessionStorage.removeItem(storageKey);
    } catch {}
  }

  function promptContext(topic, prompt) {
    const parsed = FuturePrompt.read(prompt);
    const known = {};
    const timeKey = Object.hasOwn(FutureExplore.topics,topic) ? 'horizon' : 'years';
    if (parsed.horizons.length === 1) {
      const [months] = parsed.horizons;
      known[timeKey] = timeKey === 'years' ? months / 12 : FutureExplore.horizonValue(months);
    }
    if (timeKey === 'horizon' && parsed.capacity) known.capacity = parsed.capacity;
    if (topic === 'choice') {
      const [first,second] = FuturePrompt.alternatives(prompt);
      if (first && second) Object.assign(known,{ optionA:first, optionB:second });
    }
    const salary = topic === 'salary' ? parsed.salary : null;
    if (salary?.fixed) known.pay = salary.value;
    return { known, salaryHint:salary && !salary.fixed ? salary.value : undefined, horizons:parsed.horizons };
  }

  function questionsFor(state) {
    const context = state.context;
    let questions = topics[state.topic].questions;
    if (state.topic === 'salary' && state.prompt) {
      const [timeQuestion, roleQuestion, payQuestion, ...rest] = questions;
      questions = [timeQuestion,payQuestion,roleQuestion,...rest];
    }
    const visible = state.review || !context ? questions : questions.filter(question => !Object.hasOwn(context.known,question.key));
    return visible.map(question => {
      if (question.key === 'fact' && state.topic === 'choice' && (state.review || !context?.known.optionA || !context?.known.optionB)) {
        return { ...question, extraTexts:[
          { key:'optionA', label:'第一个选择', placeholder:'例如留在家附近工作', max:64 },
          { key:'optionB', label:'第二个选择', placeholder:'例如去杭州读研', max:64 },
        ] };
      }
      if (question.key === 'pay' && context?.salaryHint) {
        return { ...question, note:`你提到了 ${money(context.salaryHint)}。请核对它是否为人民币税前固定月薪，再确认或改成对应金额。也可以留空。` };
      }
      const mentioned = context?.horizons;
      if (!mentioned?.length || !['years','horizon'].includes(question.key)) return question;
      const extra = mentioned.map(months => [question.key === 'years' ? months / 12 : FutureExplore.horizonValue(months),`${FuturePrompt.label(months)}后`]);
      if (mentioned.length > 1 && !state.review) {
        return { ...question, title:'这次先推演哪个时间点？', note:'原问题里有多个时间点。选一个作为本次推演的期限。', options:extra };
      }
      const options = new Map([...question.options,...extra].map(option => [option[0],option]));
      return { ...question, options:[...options.values()] };
    });
  }

  function restoreDraft(state) {
    if (!state.prompt || state.context || state.done) return state;
    const context = promptContext(state.topic,state.prompt);
    for (const [key,value] of Object.entries(context.known)) {
      if (!Object.hasOwn(state.answers,key)) state.answers[key] = value;
      else if (state.answers[key] !== value) delete context.known[key];
    }
    const previousQuestions = topics[state.topic].questions;
    const answered = new Set(previousQuestions.slice(0,state.step).map(question => question.key));
    if (context.salaryHint && !Object.hasOwn(state.answers,'pay') && !answered.has('pay')) state.answers.pay = context.salaryHint;
    state.context = context;
    state.step = Math.max(0,questionsFor(state).findIndex(question => !answered.has(question.key)));
    return state;
  }

  function contextLabels(state) {
    const labels = [];
    const known = state.context?.known;
    if (!known || state.review) return labels;
    if (Object.hasOwn(known,'years')) labels.push(`期限 ${FuturePrompt.label(Math.round(state.answers.years * 12))}`);
    if (Object.hasOwn(known,'horizon')) labels.push(`期限 ${FuturePrompt.label(FutureExplore.horizonMonths(state.answers.horizon))}`);
    if (Object.hasOwn(known,'pay')) labels.push(`当前税前固定月薪 ${money(state.answers.pay)}`);
    if (known.optionA && known.optionB) labels.push(`选项「${state.answers.optionA}」和「${state.answers.optionB}」`);
    if (Object.hasOwn(known,'capacity')) {
      const question = topics[state.topic].questions.find(item => item.key === 'capacity');
      labels.push(`每周余量 ${question.options.find(([value]) => value === state.answers.capacity)[1]}`);
    }
    return labels;
  }

  function show(key, focus) {
    Object.entries(views).forEach(([name, element]) => { element.hidden = name !== key; });
    window.scrollTo(0, 0);
    if (focus) $(focus, views[key])?.focus({ preventScroll:true });
  }

  function notify(message) {
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3600);
  }

  function home() {
    example = null;
    const resume = $('#resume-home');
    resume.innerHTML = draft ? `<div class="resume"><span>本会话有一份「${topics[draft.topic].title}」${draft.done ? '推演' : '草稿'}</span><button type="button" class="text-button" data-resume>${draft.done ? '打开结果' : '继续填写'}</button><button type="button" class="text-button" data-erase>清除答案</button></div>` : '';
    show('home');
  }

  function start(topic, prompt) {
    example = null;
    if (draft?.topic === topic && draft.prompt === prompt) {
      return draft.done ? renderResult() : renderQuiz();
    }
    const context = promptContext(topic,prompt);
    const answers = { ...context.known };
    if (context.salaryHint) answers.pay = context.salaryHint;
    draft = { topic, prompt, context, step:0, answers, edits:{}, selected:null, done:false };
    persist();
    renderQuiz();
  }

  promptInput.addEventListener('input', () => promptInput.setCustomValidity(''));
  composer.addEventListener('submit', event => {
    event.preventDefault();
    const prompt = promptInput.value.trim();
    if (prompt.length < 4) {
      promptInput.setCustomValidity('请写下一个完整的问题。');
      promptInput.reportValidity();
      return;
    }
    start(draft?.prompt === prompt ? draft.topic : FutureExplore.suggest(prompt),prompt);
  });

  function renderQuiz() {
    const topic = topics[draft.topic];
    const questions = questionsFor(draft);
    const question = questions[draft.step];
    const total = questions.length;
    const answer = draft.answers[question.key];
    const carried = contextLabels(draft);
    const correction = draft.prompt ? `<details class="topic-correction"><summary>修改主题</summary><div>${[...entries.map(([key]) => key),'general'].filter(key => key !== draft.topic).map(key => `<button type="button" class="text-button" data-change-topic="${key}">${topics[key].title}</button>`).join('')}</div></details>` : '';
    let fields;
    if (question.text) {
      const { label, placeholder, min, max } = question.text;
      const extra = (question.extraTexts || []).map(field => `<label class="written-answer"><span>${field.label}</span><textarea name="${field.key}" rows="1" minlength="2" maxlength="${field.max}" placeholder="${field.placeholder}" required>${safe(draft.answers[field.key])}</textarea></label>`);
      fields = [...extra, `<label class="written-answer"><span>${label}</span><textarea name="written" rows="4" ${min ? `minlength="${min}" required` : ''} maxlength="${max}" placeholder="${safe(placeholder)}">${safe(answer)}</textarea></label>`].join('');
    } else if (question.numbers) {
      fields = question.numbers.map(field => `<label class="number-field"><span>${field.label}</span><span><input name="${field.key}" type="number" ${field.step ? 'inputmode="decimal"' : 'inputmode="numeric"'} min="${field.min ?? 1}" max="${field.max}" step="${field.step ?? 1}" placeholder="${field.placeholder}" value="${safe(draft.answers[field.key])}"><b>${field.unit || '元 / 月'}</b></span></label>`).join('');
    } else {
      fields = question.options.map(([value, label, hint],index) => `<label class="option"><input type="radio" name="answer" value="${safe(value)}" ${String(answer) === String(value) ? 'checked' : ''} ${index === 0 ? 'required' : ''}><span class="radio-mark" aria-hidden="true"></span><span><strong>${label}</strong>${hint ? `<small>${hint}</small>` : ''}</span></label>`).join('');
    }
    views.quiz.innerHTML = `<div class="flow-head"><button type="button" data-home class="text-button">‹ 返回提问</button>${draft.prompt ? '' : `<span class="eyebrow">${topic.english} / ${topic.title}</span>`}</div>
      <div class="quiz-card">
        ${draft.prompt ? `<div class="quiz-topic"><p>主题 <strong>${topic.title}</strong> · ${draft.step === 0 ? `请回答 ${total} 个问题` : `还剩 ${total-draft.step} 个问题`}</p>${correction}</div>` : ''}
        <div class="quiz-progress"><span>第 ${draft.step+1} 题${draft.prompt ? '' : `，共 ${total} 题`}</span><span>${Math.round((draft.step+1)/total*100)}%</span></div>
        <progress max="${total}" value="${draft.step+1}" aria-label="答题进度"></progress>
        ${draft.prompt ? `<p class="question-origin">你的问题 · ${safe(draft.prompt)}</p>` : ''}
        ${carried.length ? `<div class="context-note"><span>已带入 · ${carried.map(safe).join(' · ')}</span><button type="button" class="text-button" data-review>修改</button></div>` : ''}
        <h1 tabindex="-1">${question.title}</h1><p class="question-note" id="question-note">${question.note}</p>
        <form id="question" aria-describedby="question-note"><div class="options ${question.numbers ? 'number-options' : ''}">${fields}</div>
          <div class="quiz-actions">${draft.step ? '<button type="button" class="button quiet" data-back>上一题</button>' : ''}<button class="button primary" type="submit">${draft.step+1 === total ? '查看推演' : '下一题'} <span aria-hidden="true">✦</span></button></div>
        </form>
      </div>`;
    const form = $('#question');
    function saveInputs() {
      const data = new FormData(form);
      if (question.text) {
        draft.answers[question.key] = data.get('written').trim();
        for (const field of question.extraTexts || []) draft.answers[field.key] = data.get(field.key).trim();
      } else if (question.numbers) {
        for (const field of question.numbers) {
          const value = data.get(field.key);
          if (value === '') delete draft.answers[field.key];
          else if (form.elements[field.key].validity.valid) draft.answers[field.key] = Number(value);
        }
      } else {
        const picked = question.options.find(([value]) => String(value) === data.get('answer'));
        if (picked) draft.answers[question.key] = picked[0];
      }
      persist();
    }
    form.addEventListener('input', () => {
      form.elements.written?.setCustomValidity('');
      form.elements.optionB?.setCustomValidity('');
      saveInputs();
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (question.extraTexts) {
        const { optionA, optionB } = form.elements;
        const first = optionA.value.trim();
        const second = optionB.value.trim();
        if (first.length < 2 || second.length < 2 || first === second) {
          optionB.setCustomValidity('请写两个不同的选择，每个至少两个字。');
          optionB.reportValidity();
          return;
        }
      }
      if (question.text?.min && form.elements.written.value.trim().length < question.text.min) {
        form.elements.written.setCustomValidity('请写一件具体发生过的事，至少写 6 个字。');
        form.elements.written.reportValidity();
        return;
      }
      saveInputs();
      if (draft.step+1 === total) {
        draft.done = true;
        draft.selected = null;
        persist();
        renderResult();
      } else {
        draft.step++;
        persist();
        renderQuiz();
      }
    });
    show('quiz', 'h1');
  }

  function sample(topic) {
    example = topic === 'study' ? {
      topic, prompt:'工作日只有通勤时间，一年后我能用英语介绍自己吗？', answers:{...FutureExplore.demo},
    } : { topic:'salary', answers:{...demo} };
    example.selected = null;
    example.edits = {};
    renderResult();
  }

  function salaryDetails(state, result) {
    const a = state.answers;
    const { endpoint, steps, params, included, growthSource, unchanged } = result.projection;
    if (!endpoint) return `<div class="section-card"><p class="eyebrow">INCOME SCENARIO</p><h2>先看选择，再补数字</h2><p>填写当前固定月薪后，可以看到逐年推演、期望月薪对照和假设调节。</p><button class="text-button" data-edit-pay>填写当前月薪</button></div>`;
    const ceiling = steps.reduce((max, point) => Math.max(max, point.high), 0);
    const chart = steps.map(point => {
      const time = point.month === 0 ? '现在' : `${FuturePrompt.label(point.month)}后`;
      return `<li><span>${time}</span><div class="bar-track" aria-hidden="true"><i style="width:${point.mid/ceiling*100}%"></i></div><b>${money(point.mid)}</b></li>`;
    }).join('');
    const target = a.target ? `<p class="target">你的期望 ${money(a.target)} / 月 · ${a.target > endpoint.high ? '高于' : a.target < endpoint.low ? '低于' : '落在'}当前情景区间</p>` : '';
    const allowEvent = result.key !== 'stay';
    const eventText = params.eventMonth ? `第 ${params.eventMonth} 个月假设变动 ${params.event > 0 ? '+' : ''}${params.event}%${included ? '' : ' · 超出这次期限'}` : '假设本期没有岗位变动';
    const events = allowEvent ? `<label>从现在起第几个月发生变动<div class="unit-input"><input name="eventMonth" type="number" min="0" max="600" step="1" required value="${params.eventMonth}"><span>月</span></div></label><p class="caption">填 0 可比较变动没有发生的情况。</p><label>发生时的一次性变化<div class="unit-input"><input name="event" type="number" min="-45" max="100" step="0.1" required value="${params.event}"><span>%</span></div></label>` : '';
    return `<div class="section-card salary-detail"><p class="eyebrow">INCOME SCENARIO</p><h2>固定月薪怎么走</h2>${target}
      <p class="caption">工资起点 ${money(a.pay)} / 月 · 年涨幅 ${params.growth}%（${growthSource}）${allowEvent ? ` · ${eventText}` : ''}。</p>
      <div class="salary-comparison">${result.all.map(item => `<div class="${item.id === result.key ? 'current' : ''}"><span>${result.paths[item.id].name}</span><strong>${range(item.endpoint)}</strong><span class="caption">年增长 ${item.params.growth}%${item.included ? ` · 第 ${item.params.eventMonth} 月变动 ${item.params.event > 0 ? '+' : ''}${item.params.event}%` : ' · 无一次性变动'}</span></div>`).join('')}</div>
      ${allowEvent ? `<p class="counterfactual">如果这次变动没有发生，沿用本路径的年涨幅，期末基准为 <strong>${money(unchanged)} / 月</strong>。</p>` : ''}
      <div class="calculation-grid"><div><h3>各时间点的基准情景</h3><p class="caption">人民币税前固定月薪</p><ol class="bar-chart">${chart}</ol></div>
      <form id="assumptions"><h3>如果条件变了？</h3><p class="caption">区间按年涨幅上下浮动 3 个百分点${included ? `、一次性变化上下浮动 ${params.spread} 个百分点` : ''}计算。可用实际调薪或同口径报价替换这些假设。</p><label>每年固定工资涨幅<div class="unit-input"><input name="growth" type="number" min="-30" max="40" step="0.1" required value="${params.growth}"><span>%</span></div></label>${events}<div class="assumption-actions"><button type="submit" class="button primary small">重新计算</button><button type="button" class="text-button" data-reset-assumptions>恢复问卷设置</button></div></form></div>
      <details><summary>展开计算依据</summary><p>情景金额 = 工资起点 × (1 + 年涨幅)ⁿ，其中 n 为期限折算的年数。变动发生后额外乘以 (1 + 一次性变化)。区间展示参数变化造成的差别，金额按最近的 10 元显示。</p></details></div>`;
  }

  function realityDetails({ stage, capacity, constraint, boundary, gate, sign, fallback }) {
    return `<section class="section-card reality">
      <h2>这条路凭什么走得通？</h2>
      <dl><div><dt>你现在的起点</dt><dd>${stage}${capacity ? `<br>每周余量 · ${capacity}` : ''}</dd></div>
      ${constraint ? `<div><dt>先照顾这个限制</dt><dd><strong>${constraint}</strong><br>${boundary}</dd></div>` : ''}
      <div><dt>继续前需要的证据</dt><dd>${gate}</dd></div>
      ${sign ? `<div><dt>你想亲眼看到的变化</dt><dd>${safe(sign)}</dd></div>` : ''}
      <div><dt>如果条件还没到</dt><dd>${fallback}</dd></div></dl>
    </section>`;
  }

  function comparisonFeedback(checks, threshold) {
    if (!threshold.trim()) return '先写下一个能用同样方式核对的底线。';
    if (checks.includes('unknown')) return '还有选项的条件未核实。先补齐这一项，再判断是否能排除任何一边。';
    if (checks.every(value => value === 'pass')) return '两个选项都守住了这条底线。下一轮可以用另一条会影响决定的标准比较。';
    if (checks.every(value => value === 'fail')) return '两个选项都没守住这条底线。先调整选项或寻找另外一条可行的路。';
    return `按这条底线，先保留选项 ${checks.indexOf('pass')+1}。再核对它的其他代价。`;
  }

  function compareOptions({ alternatives, criterion }, sign, checks, threshold) {
    const statuses = [['unknown','还待核实'],['pass','核实后满足底线'],['fail','核实后达不到底线']];
    return `<section class="section-card decision-compare">
      <h2>用同一把尺比较你的两个选择</h2>
      ${sign ? `<p>你想看到的结果是「${safe(sign)}」。</p>` : ''}
      <p>${criterion}</p>
      <label class="decision-threshold">我要核对的底线<input type="text" id="decision-threshold" maxlength="100" placeholder="例如算上房租和通勤，每月还能存下 1000 元" value="${safe(threshold)}"></label>
      <dl>${alternatives.map((option,index) => `<div><dt>选项 ${index+1}</dt><dd>${safe(option)}<label><span class="caption">按同一标准核对后的结果</span><select data-option-check="${index}" ${threshold.trim() ? '' : 'disabled'}>${statuses.map(([key,label]) => `<option value="${key}" ${checks[index]===key ? 'selected' : ''}>${label}</option>`).join('')}</select></label></dd></div>`).join('')}</dl>
      <p class="comparison-feedback" role="status">${comparisonFeedback(checks,threshold)}</p>
    </section>`;
  }

  function timeline(result) {
    const title = result.checkpoints ? '到了这些时间点，回来核对' : result.planTitle || '把假设变成可以验证的行动';
    const steps = result.checkpoints
      ? result.checkpoints.map(point => `<li><div><strong>${point.time}</strong><p>${point.text}</p></div></li>`)
      : result.plan.map(item => `<li>${item}</li>`);
    return `<div class="section-card roadmap"><h2>${title}</h2><ol>${steps.join('')}</ol></div>`;
  }

  function renderResult({ keep = false, focusSelector } = {}) {
    const state = example || draft;
    const t = topics[state.topic];
    const a = state.answers;
    const result = build(state.topic,a,state.selected,state.edits,state.prompt);
    const period = result.period || `${FuturePrompt.label(Math.round(a.years * 12))}后`;
    const postmark = !result.period && Number.isInteger(a.years) ? year+a.years : null;
    const addressed = postmark ? `${postmark} 年` : period;
    const endpoint = result.projection?.endpoint;
    const alternative = result.key !== result.order[0];
    const alternativesOpen = keep && $('#scenario-menu',views.result)?.open;
    const basis = result.comparison && JSON.stringify([result.comparison.alternatives,a.barrier,a.sign]);
    const comparison = basis && state.comparisonChecks?.basis === basis ? state.comparisonChecks : { basis, values:['unknown','unknown'], threshold:'' };
    const scroll = window.scrollY;
    const letter = Array.isArray(result.letter)
      ? `${result.reality.fact ? `<blockquote>${safe(result.reality.fact)}</blockquote>` : ''}${result.letter.map(paragraph => `<p>${paragraph}</p>`).join('')}`
      : `<p>${result.letter}</p>`;
    const evidence = result.evidence?.map(key => t.questions.find(item => item.key === key).options.find(([value]) => value === a[key])[1]);
    const exampleLink = example ? `<button type="button" class="text-button" data-example="${state.topic === 'salary' ? 'study' : 'salary'}">${state.topic === 'salary' ? '看学习示例' : '看工资示例'}</button>` : '';
    views.result.innerHTML = `<div class="flow-head"><button type="button" class="text-button" data-home>‹ ${example ? '返回首页' : '换个主题'}</button><span class="eyebrow">${example ? '示例报告' : `${t.english} / ${t.title}`}</span>${exampleLink}</div>
    <div class="result-hero">
      <div class="result-glow" aria-hidden="true"></div>
      <p class="eyebrow"><span></span> ${postmark ? `POSTMARK / ${postmark}` : `${t.title} · 情景推演`}</p><h1 tabindex="-1">${period}的你</h1>
      ${state.prompt || t.defaultQuestion ? `<p class="result-question">${safe(state.prompt || t.defaultQuestion)}</p>` : ''}
      ${result.outlook ? `<section class="outlook"><p>当前依据最支持的走向</p><h2>${result.outlook.title}</h2><p>${result.outlook.basis}</p></section>` : `<p class="scenario-heading">${result.headline}</p>`}
      ${alternative ? `<p class="scenario-heading">正在查看 · ${result.headline}</p>` : ''}
      ${endpoint ? `<div class="result-money"><strong>${range(endpoint)}</strong><span>人民币 / 月 · 税前固定月薪 · 按下方假设算出的区间</span></div>` : ''}
    </div>
    <details id="scenario-menu" class="scenario-menu" ${alternativesOpen ? 'open' : ''}><summary>比较其他情景</summary><div class="path-picker">${result.reason ? `<span>${result.reason}</span>` : ''}<div role="group" aria-label="时间线">${result.order.map(id => `<button type="button" class="path-button" data-path="${id}" aria-pressed="${id===result.key}">${result.paths[id].name}</button>`).join('')}</div></div></details>
    ${result.comparison ? compareOptions(result.comparison,a.sign,comparison.values,comparison.threshold) : ''}
    <div class="result-grid">
      <article class="section-card letter"><h2>未来来信</h2><p>嗨，现在的我：</p>${letter}<p class="letter-sign">来自 ${addressed}的一种可能 <span>✦</span></p></article>
      <article class="section-card first-action"><h2>这周可以做的一小步</h2><p>${result.action || result.path.action}</p><div class="risk"><strong>可能遇到的代价</strong><p>${result.path.risk}</p></div></article>
    </div>
    ${evidence ? `<div class="evidence"><strong>你的推演依据</strong><ul>${evidence.map(label => `<li>${label}</li>`).join('')}</ul></div>` : ''}
    ${result.reality ? realityDetails(result.reality) : ''}
    ${state.topic === 'salary' ? salaryDetails(state,result) : ''}
    ${timeline(result)}
    ${result.reality && !example ? '<p class="update-evidence"><button type="button" class="text-button" data-edit-fact>补充新证据，更新推演</button></p>' : ''}
    <div class="share-box"><div><h2>把这条未来折成一张信签</h2><p>保存为图片，发给朋友看看他们想问什么。</p>${endpoint ? '<label class="salary-opt"><input type="checkbox" id="include-salary"> 在图片上显示推演工资区间</label>' : ''}</div><div><button type="button" data-share class="button primary">保存分享卡 <span aria-hidden="true">✦</span></button><button type="button" class="button quiet" ${example ? 'data-pick' : 'data-edit'}>${example ? '开始我的推演' : '修改答案'}</button></div></div>`;

    if (state.topic === 'salary' && endpoint) {
      $('#assumptions').addEventListener('submit', event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        state.edits[result.key] = Object.fromEntries(Array.from(data,([key,value])=>[key,Number(value)]));
        if (!example) persist();
        renderResult({ keep:true, focusSelector:'#assumptions button[type="submit"]' });
        notify('已按新条件更新情景。');
      });
    }
    if (basis) {
      const threshold = $('#decision-threshold',views.result);
      const fields = views.result.querySelectorAll('[data-option-check]');
      const update = () => {
        state.comparisonChecks = comparison;
        if (!example) persist();
        $('.comparison-feedback',views.result).textContent = comparisonFeedback(comparison.values,comparison.threshold);
      };
      threshold.addEventListener('input', () => {
        if (threshold.value.trim() !== comparison.threshold.trim()) {
          comparison.values.fill('unknown');
          for (const field of fields) field.value = 'unknown';
        }
        comparison.threshold = threshold.value;
        for (const field of fields) field.disabled = !threshold.value.trim();
        update();
      });
      for (const field of fields) {
        field.addEventListener('change', () => {
          comparison.values[Number(field.dataset.optionCheck)] = field.value;
          update();
        });
      }
    }
    if (keep) {
      window.scrollTo(0,scroll);
      if (focusSelector) $(focusSelector, views.result)?.focus({preventScroll:true});
    } else show('result','h1');
  }

  function downloadCard() {
    const state = example || draft;
    const result = build(state.topic,state.answers,state.selected,state.edits,state.prompt);
    const image = document.createElement('canvas');
    image.width = 1080;
    image.height = 1440;
    const ctx = image.getContext('2d');
    const a = state.answers;
    const serif = '"Noto Serif SC","Songti SC",SimSun,serif';
    const sans = '"Microsoft YaHei","PingFang SC",sans-serif';
    const write = (text,x,y,font,color) => { ctx.font=font; ctx.fillStyle=color; ctx.fillText(text,x,y); };
    const cream = '#f0e9d9';
    const peach = '#feb895';
    ctx.fillStyle = '#15251f';
    ctx.fillRect(0,0,1080,1440);
    ctx.strokeStyle = '#60786a';
    ctx.lineWidth = 2;
    ctx.strokeRect(46,46,988,1348);
    ctx.fillStyle = '#2d4438';
    ctx.beginPath(); ctx.roundRect(623,235,290,492,[145,145,0,0]); ctx.fill();
    ctx.fillStyle = '#dd9272';
    ctx.beginPath(); ctx.arc(768,426,95,0,2*Math.PI); ctx.fill();
    ctx.strokeStyle = '#84988888';
    for (let i=0;i<10;i++) {
      ctx.beginPath(); ctx.moveTo(510+i*15,795); ctx.quadraticCurveTo(840,654-i*10,960,718-i*10); ctx.stroke();
    }
    write('✦   FUTURE FOLD',94,151,'500 33px monospace',peach);
    write('寄给未来的我',94,350,`700 80px ${serif}`,cream);
    const shareDate = result.period || (Number.isInteger(a.years) ? String(year+a.years) : `${FuturePrompt.label(Math.round(a.years * 12))}后`);
    if (/^\d{4}$/.test(shareDate)) write(shareDate,91,571,'500 172px monospace',cream);
    else write(shareDate,93,560,`700 76px ${serif}`,cream);
    write(result.headline,97,933,`700 66px ${serif}`,peach);
    const showSalary = $('#include-salary')?.checked && result.projection?.endpoint;
    write(showSalary ? `${range(result.projection.endpoint)} / 月` : `我的未来信签 · ${topics[state.topic].title}`,99,1040,`40px ${sans}`,cream);
    write(showSalary ? '税前固定工资 · 假设情景' : '一条可能的未来时间线',99,1107,`31px ${sans}`,'#bdcbbf');
    write(example ? '未来有信 · 示例信签' : '未来有信 · 你也可以问未来一个问题',99,1304,`32px ${sans}`,'#bdcbbf');
    image.toBlob(blob => {
      if (!blob) return notify('图片生成失败，请重试。');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `未来有信-${shareDate}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(()=>URL.revokeObjectURL(link.href),30000);
      notify('分享卡已生成。');
    },'image/png');
  }

  document.addEventListener('click',event => {
    const control = event.target.closest('button, a');
    if (!control) return;
    if (control.matches('a[href="#home"], [data-home]')) { event.preventDefault(); home(); }
    else if (control.matches('[data-method]')) method.showModal();
    else if (control.matches('[data-example]')) { event.preventDefault(); sample(control.dataset.example); }
    else if (control.matches('[data-pick]')) {
      if (views.home.hidden) home();
      $('#topics').scrollIntoView({ behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      $('#topics-title').focus({preventScroll:true});
    } else if (control.dataset.prompt) {
      promptInput.value = control.dataset.prompt;
      promptInput.dispatchEvent(new Event('input'));
      composer.requestSubmit();
    } else if (control.dataset.changeTopic) start(control.dataset.changeTopic,draft.prompt);
    else if (control.dataset.start) start(control.dataset.start);
    else if (control.matches('[data-resume]')) { if (draft.done) renderResult(); else renderQuiz(); }
    else if (control.matches('[data-erase]')) {
      draft = null;
      promptInput.value = '';
      promptInput.dispatchEvent(new Event('input'));
      persist();
      home();
      notify('本会话已清除。');
    }
    else if (control.matches('[data-back]')) { draft.step--; persist(); renderQuiz(); }
    else if (control.matches('[data-edit], [data-edit-pay], [data-edit-fact], [data-review]')) {
      draft.review = true;
      const questions = questionsFor(draft);
      const startKey = control.matches('[data-edit-pay]') ? 'pay' : control.matches('[data-edit-fact]') ? 'fact' : questions[0].key;
      draft.step = questions.findIndex(question => question.key === startKey);
      draft.done = false;
      persist();
      renderQuiz();
    } else if (control.dataset.path) {
      const state = example || draft;
      if (control.getAttribute('aria-pressed') !== 'true') {
        state.selected = control.dataset.path;
        if (!example) persist();
        renderResult({ keep:true, focusSelector:`[data-path="${state.selected}"]` });
      }
    } else if (control.matches('[data-reset-assumptions]')) {
      const state = example || draft;
      const path = build(state.topic,state.answers,state.selected,state.edits).key;
      delete state.edits[path];
      if (!example) persist();
      renderResult({ keep:true, focusSelector:'[data-reset-assumptions]' });
      notify('已恢复默认假设。');
    } else if (control.matches('[data-share]')) downloadCard();
  });

  home();
})();
