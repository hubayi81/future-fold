(() => {
  const digits = { 零:0, 〇:0, 一:1, 二:2, 两:2, 三:3, 四:4, 五:5, 六:6, 七:7, 八:8, 九:9 };
  const number = '(?<![\\d.])[0-9]{1,3}(?:\\.[0-9]+)?(?![\\d.])|[零〇一二两三四五六七八九十]+|半';
  const duration = `(${number})\\s*(?:个\\s*)?(年|月)`;
  const lead = '未来|往后|今后|接下来|再过';
  const tail = '之后|以后|后|(?:之内|以内|内)(?=\\s*(?:我(?:的|想|能|会|可以)?|能|想|会|可以|是否|工资|薪资))';

  function numeral(value) {
    if (value === '半') return 0.5;
    if (/^\d/.test(value)) return Number(value);
    if (value.includes('十')) {
      const [tens, ones] = value.split('十');
      return (tens ? digits[tens] : 1) * 10 + (ones ? digits[ones] : 0);
    }
    return value.length === 1 ? digits[value] : NaN;
  }

  function monthsIn(text) {
    const found = new Map();
    const add = (value, unit) => {
      const months = numeral(value) * (unit === '年' ? 12 : 1);
      if (Number.isInteger(months) && months >= 1 && months <= 600) found.set(months, true);
    };
    const ranges = new RegExp(`(?:(${lead})\\s*)?(${number})\\s*(?:个\\s*)?(年|月)?\\s*(?:到|至|和|与|及|或者|或|、|~|～|—|–|-)\\s*${duration}\\s*(${tail})?`, 'g');
    let remaining = text.replace(ranges, (whole, before, first, firstUnit, last, lastUnit, after) => {
      if (!before && !after) return whole;
      add(first,firstUnit || lastUnit);
      add(last,lastUnit);
      return ' ';
    });
    // Remove compound spans before matching single durations, so “一年半后” is one horizon.
    const compounds = new RegExp(`(?:(${lead})\\s*)?(${number})\\s*年\\s*(半|(${number})\\s*(?:个\\s*)?月)\\s*(${tail})?`, 'g');
    remaining = remaining.replace(compounds, (whole,before,years,extra,months,after) => {
      if (!before && !after) return whole;
      add(String(numeral(years) * 12 + (extra === '半' ? 6 : numeral(months))),'月');
      return ' ';
    });
    for (const match of remaining.matchAll(new RegExp(`(?:${lead})\\s*${duration}|${duration}\\s*(?:${tail})`, 'g'))) {
      add(match[1] ?? match[3], match[2] ?? match[4]);
    }
    return [...found.keys()].sort((a,b) => a-b);
  }

  function label(months) {
    const years = Math.floor(months / 12);
    const rest = months % 12;
    return [years ? `${years} 年` : '', rest ? `${rest} 个月` : ''].filter(Boolean).join(' ');
  }

  function salaryIn(text) {
    const amounts = new Set();
    let fixed = true;
    const pattern = /(?:目前|当前|现在|现有)\s*(?:我的?|的)?\s*(税前\s*)?(固定\s*)?(?:月薪|月工资)(?:\s*[是为约：:=]\s*)?(?:人民币|¥|￥)?\s*(\d+(?:\.\d+)?)\s*(万|千|[kK])?\s*(?:元)?/g;
    for (const match of text.matchAll(pattern)) {
      const after = text.slice(match.index + match[0].length);
      if (/^\s*(?:\d|[.%,，]\d|到|至|起|左右|上下|[-–—~～]|美元|港币|港元|欧元|日元|英镑)/.test(after) || /约/.test(match[0])) continue;
      const value = Number(match[3]) * (match[4] === '万' ? 10000 : match[4] ? 1000 : 1);
      if (!Number.isInteger(value) || value < 1 || value > 10000000) continue;
      amounts.add(value);
      fixed &&= Boolean(match[1] && match[2]);
    }
    const otherBasis = /税后|到手|总包|外币|美元|港币|港元|欧元|日元|英镑/.test(text);
    return amounts.size === 1 && !otherBasis ? { value:[...amounts][0], fixed } : null;
  }

  function capacityIn(text) {
    if (/(?:每周|每星期)\s*(?:完全)?(?:没有|腾不出|抽不出)\s*(?:可用|可支配的)?时间/.test(text)) return 'none';
    const matches = [...text.matchAll(new RegExp(`(?:每|一)(?:周|星期)\\s*(?:可以|能|只有|最多|大概|可用|可投入|能挤出|能留出|有)*\\s*(半(?:个)?小时|(?:${number})\\s*(?:个\\s*)?小时|(?:${number})\\s*分钟)(?![到至–—~～-])`, 'g'))];
    if (matches.length !== 1) return undefined;
    const span = matches[0][1];
    const fragments = span.match(new RegExp(`^(${number})\\s*(?:个\\s*)?(小时|分钟)$`));
    const minutes = fragments ? numeral(fragments[1]) * (fragments[2] === '小时' ? 60 : 1) : NaN;
    if (minutes > 0 && minutes <= 20) return 'scarce';
    if (minutes >= 25 && minutes <= 45) return 'short';
    if (minutes >= 60 && minutes <= 120) return 'regular';
    if (minutes >= 240 && minutes <= 10080) return 'room';
    return undefined;
  }

  function read(prompt = '') {
    const text = prompt.normalize('NFKC').replace(/(\d),(?=\d{3}(?!\d))/g,'$1');
    return { horizons:monthsIn(text), salary:salaryIn(text), capacity:capacityIn(text) };
  }

  function alternatives(prompt = '') {
    const parts = prompt.split('还是');
    if (parts.length !== 2) return [];
    const explicit = /二选一|选哪个|哪个更|哪种更|哪条路|要不要|该选|想选|在犹豫|在考虑|怎么选|到底是/.test(prompt);
    const action = /(?:留在|继续|搬|去|读|学|考|工作|辞职|跳槽|升职|转行|换|回|留下|选|住|买|租|做|接受|拒绝|放弃)/;
    const left = parts[0].trim().replace(/[，,、和或\s]+$/,'').split(/[，,。！？；;\n]/).at(-1)
      .trim().replace(/^(?:我)?(?:想知道|在犹豫|在考虑|应该|到底该|该|是)\s*/, '');
    const right = parts[1].split(/[，,。！？；;?\n]/)[0].trim()
      .replace(/(?:哪个|哪条路|哪种|哪一个)(?:更|比较)?(?:好|合适|适合我|值得)?$/, '').trim();
    if (!explicit && !(action.test(left) && action.test(right))) return [];
    return left.length >= 2 && right.length >= 2 && left.length <= 64 && right.length <= 64 && left !== right ? [left,right] : [];
  }

  globalThis.FuturePrompt = { read, label, alternatives };
})();
