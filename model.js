(() => {
  const choice = (key, title, note, options) => ({ key, title, note, options });
  const time = choice('years', '想和几年后的自己聊聊？', '先选一个你想展开的时间点。', [
    [3, '3 年后', '眼前的选择已经有了回音'], [5, '5 年后', '足够经历一次重要转弯'], [10, '10 年后', '看看积累会把你带到哪里'],
  ]);
  const field = choice('field', '你现在主要做哪类工作？', '在校、待业或暂时没有固定工作的朋友，可以选最后一项。', [
    ['tech', '技术、数据或产品'], ['creative', '设计、内容或创意'], ['business', '销售、市场或运营'], ['service', '教育、服务或公共事务'], ['other', '其他行业'], ['starting', '正在找第一份工作或重新出发'],
  ]);
  const workLabels = {
    tech: ['技术、数据或产品', '一个做过的项目', '技术或产品岗位'],
    creative: ['设计、内容或创意', '一份可以展示的作品', '创意岗位'],
    business: ['销售、市场或运营', '一次增长或业务案例', '业务岗位'],
    service: ['教育、服务或公共事务', '一份能说明服务成效的案例', '服务相关岗位'],
    other: ['现在所在的行业', '一项可以验证的成果', '同领域岗位'],
    starting: ['刚起步的探索期', '一个完整的小练习', '入门岗位'],
  };
  const topics = {
    salary: {
      title: '未来工资', english: 'INCOME', icon: '¥',
      questions: [time, field,
        { key: 'pay', title: '现在的固定月薪大概是多少？', note: '以人民币税前固定月薪为准，不计奖金、股票和副业。可以留空，只看三条路径。', numbers: [
          { key:'pay', label:'当前月薪（选填）', placeholder:'例如 12000', max:10000000 },
          { key:'target', label:'期望月薪（选填）', placeholder:'例如 20000', max:10000000 },
        ] },
        { key:'pace', title:'想用多少年涨幅来推演？', note:'可参考已经核实的调薪幅度，也可以留空，先看共同年增长 3% 的演示情景。结果页可修改。', numbers:[
          { key:'annualGrowth', label:'各路径共用的年涨幅假设（选填）', placeholder:'例如 0、3 或 -2', min:-30, max:40, step:0.1, unit:'%' },
        ] },
        choice('move', '现在更愿意尝试哪一种？', '在结果里可以切换到另外两条时间线。', [
          ['stay','先留在现在的平台', '重视稳定和现有积累'], ['grow','争取更大职责或晋升','愿意多承担一些，换取涨薪空间'], ['switch','测试新的公司或岗位','愿意为更好的机会重新适应'],
        ]),
        choice('proof', '手里有什么能谈薪的依据？', '想想最近半年能讲清楚的一次贡献。', [
          ['early','还在积累，暂时说不清'], ['some','有一个能讲清过程的项目'], ['strong','有可量化结果或公开作品'],
        ]),
        choice('reserve', '如果遇到变化，你最希望守住什么？', '这会影响怎样验证机会和怎么安排过渡。', [
          ['secure','收入不能有空窗'], ['balance','可以花几个月准备'], ['open','能接受一段适应期'],
        ]),
      ],
    },
    daily: {
      title:'理想日常', english:'LIFESTYLE', icon:'☼',
      questions:[time,
        choice('place','你希望未来在哪儿醒来？','日记会从你选择的地方开始。',[['metro','城市生活圈','便利，机会和人都近'],['near','熟悉的人附近','能多见家人朋友'],['quiet','安静舒展的地方','想把通勤和噪声降下来']]),
        choice('energy','哪一种时刻最能给你充电？','想一个最近真的让你觉得舒服的瞬间。',[['steady','按自己的节奏做完一件事'],['open','发现一条新路或学到新东西'],['people','和喜欢的人好好聊一会儿']]),
        choice('friction','现在最想改变的是什么？','选一个在普通工作日反复出现的困扰。',[['steady','下班后还在处理工作'],['open','每一周都过得太像'],['people','想见的人总是约不上']]),
        choice('free','每周能拿出多少时间试新生活？','从已经能支配的时间算起。',[['30 分钟','半小时左右'],['2 小时','两小时左右'],['半天','大约半天']]),
        choice('guard','无论怎么变，最不想牺牲什么？','这条底线在三条时间线里都保留。',[['health','规律作息和身体状态'],['money','稳定的现金流'],['family','照顾家人或陪伴时间']]),
      ],
    },
    career: {
      title:'下一份工作', english:'CAREER', icon:'✧',
      questions:[time, field,
        choice('reward','上一份工作里，什么让你最有成就感？','还没工作的话，想想一个项目、社团或志愿经历。',[['expert','把一个难题琢磨透了'],['lead','把几个人的努力拧在一起'],['pivot','用旧本事解决了一个新领域的问题']]),
        choice('ask','别人通常因为什么来找你帮忙？','选近期确实发生过的一种。',[['expert','请我拆解难题或检查质量'],['lead','请我协调信息、推进决策'],['pivot','请我找新角度或试一个新工具']]),
        choice('cost','哪一种变化代价目前可以接受？','未来来信会写到它的代价。',[['expert','花更多时间打磨专业功底'],['lead','承担沟通、反馈和协调成本'],['pivot','短时间回到新人状态']]),
        choice('study','每周能留多少时间为下一步做准备？','用现在的空档来估算。',[['30 分钟','约半小时'],['2 小时','约两小时'],['半天','大约半天']]),
        choice('guard','换工作时，你最看重什么底线？','用它来筛选第一轮机会。',[['pay','不能明显降低固定收入'],['time','工作时间要有边界'],['place','地点或照顾家人的安排要兼容']]),
      ],
    },
    ...FutureExplore.topics,
  };

  const salaryPaths = {
    stay: { name:'留任深耕', premise:'继续在熟悉的团队积累，在常规调薪中兑现能力。', risk:'岗位职责变化小，涨幅主要取决于公司的常规调薪。', action:'找出过去半年最能说明自己有价值的一次成果，整理成一页材料，再问清下一轮调薪如何评估。' },
    grow: { name:'进阶晋升', premise:'在现有方向争取更大职责，并在设定的年份完成一次晋升。', risk:'先多承担职责，并不一定能在同一轮兑现职级和待遇。', action:'向主管确认下一级的两个可验证要求，挑一项做一个小试点，约好复盘日期。' },
    switch: { name:'换个舞台', premise:'先试探外部机会，在设定的年份完成一次换岗。', risk:'面试准备和适应新环境会占用时间，实际报价可能低于现薪。', action:'找三个同城、同职级的职位，看职责重合度。和招聘方先确认固定月薪与浮动待遇各怎么算。' },
  };
  const salaryGuard = { secure:'先确认入职日期和固定工资，再考虑离职', balance:'先给准备留出几个月，再决定是否变动', open:'提前给适应新岗位留出时间和收入余量' };
  const firstJobPaths = {
    stay:{ name:'先找一个薪资起点', premise:'假设已经拿到符合底线的入职报价，再以这份报价作为起点。', risk:'实际入职时间和首份报价需要核实。', action:'挑三个能投递的入门岗位，记录各自的固定工资、职责和入职要求。' },
    grow:{ name:'核对入职后的进阶条件', premise:'假设先拿到首份报价，并在设定时间获得一次岗位进阶。', risk:'试用期结束或接手更多职责，待遇未必同步变化。', action:'问一位从业者或招聘方，入门之后的第一次职级评估要看哪些实际证据。' },
    switch:{ name:'多核对一种岗位的报价', premise:'假设先入职，随后按设定时间切换到另一岗位。', risk:'两个方向的报价、试用期和收入空档可能不同。', action:'选两个能投递的方向，用固定月薪、上手要求和试用期逐项对照。' },
  };
  const salaryEvidence = {
    early:'先留一份能证明具体成果的记录。', some:'把项目的结果和你本人负责的部分写在同一页。', strong:'用同行或招聘方的反馈核实这份成果在目标岗位上值不值同样的权重。',
  };

  const dailyPaths = {
    steady:{ name:'把日子过稳', scene:'我先留一段安静的时间给最重要的事。到了傍晚，我收起工作消息，照着自己的节奏吃饭、散步。', agenda:['留一段不被打扰的时间给最重要的事','把次要任务收进明天的清单','到点收工，散步或自在地吃一顿饭'], risk:'周围的人需要时间适应你新的可联系时段。', action:'挑一天设一个明确的收工点，写好明天的第一件事，再离开工作消息。' },
    open:{ name:'给新鲜事留座', scene:'今天有一点不一样。我把一段空档留给新路线或陌生话题，晚上记下了一个还想追的问题。', agenda:['试一条新路线，或者走进一家没去过的店','把想到的问题记下来，下次找人聊','给长期想学的东西留一个固定时段'], risk:'新鲜感需要留白撑住，排太满就容易半途而废。', action:'找一个零门槛的新活动，做一次短试验。结束后写下自己想复做的部分。' },
    people:{ name:'把时间分给重要的人', scene:'以前见面总要等到大家都有空。现在我把一次通话或见面提前写进日历，连一起买菜也变成了固定节目。', agenda:['给一个想念的人发条能接着聊的消息','提前约好一顿饭或一次通话','留一段没有手机打扰的陪伴时间'], risk:'固定见面的节奏要照顾双方的时间和精力。', action:'约一个想常见的人，先试一次低成本见面或短通话，选双方都舒服的频率。' },
  };
  const places = { metro:'楼下店铺刚开门，我从熟悉的城市街口出发。', near:'醒来时，重要的人就在可以随时碰面的距离。', quiet:'窗外安静，走几分钟就能见到一片绿。' };
  const dailyGuard = { health:'把睡觉和起床时间先定下来', money:'给每个月的固定支出留余量', family:'把照顾家人的时段先写进日历' };

  const careerPaths = {
    expert:{ name:'把一门本事做深', role:'专业骨干', scene:'同事拿着最难解释的那个问题来找我。我们把线索铺开，试出一条可以复用的解决办法。', risk:'一直独自埋头做事，成果可能没有被看见。', action:'整理一项代表作，写清约束、选择和结果，请一个同行给具体反馈。', steps:['找到你解决得最好的一个问题','把解决过程写成案例并收集反馈','用案例争取能承担完整问题的岗位'] },
    lead:{ name:'从做事到带事', role:'项目负责人', scene:'我上午和同伴把优先级敲定，下午给一个卡住的人反馈。后来我们一起守住了最重要的交付。', risk:'协调会占用自己做事的时间，角色目标也会变。', action:'主动接一件需要两三个人协作的小事，写下决策、分工和一次会后复盘。', steps:['选一个跨人协作的小项目','实践分工、反馈和进度对齐','拿实际复盘争取负责人机会'] },
    pivot:{ name:'带着本事去转弯', role:'相邻领域的实践者', scene:'第一次听新领域的行话时我跟不上。后来我从熟悉的问题入手，把旧经验翻译成对方能看见的结果。', risk:'短期要补陌生知识，也可能先接受较小的职责。', action:'对照三个相邻岗位，挑一个反复出现的新要求，用原有技能做一份小样。', steps:['找出三个岗位里的共通能力','做一次小项目或访谈验证需求','让招聘方看到你的可迁移成果'] },
  };
  const careerGuard = { pay:'提前确认固定收入有没有达到你的下限', time:'先问清正常工时和临时响应的频率', place:'提前核实地点、通勤和家庭安排是否兼容' };

  function orderPaths(paths, values, weights) {
    const keys = Object.keys(paths);
    const score = Object.fromEntries(keys.map(key => [key, 0]));
    values.forEach((key, index) => { score[key] += weights[index]; });
    return keys.sort((a, b) => score[b] - score[a]);
  }

  function salaryDefaults(a, path) {
    return {
      growth: a.annualGrowth ?? 3,
      event: { stay:0, grow:10, switch:15 }[path],
      eventMonth: path === 'grow' ? 36 : 24,
      spread: path === 'stay' ? 0 : 5,
    };
  }

  function salaryProjection(a, path, edits = {}) {
    const months = Math.round(a.years * 12);
    const { eventYear, ...settings } = edits;
    const params = { ...salaryDefaults(a, path), ...(eventYear ? { eventMonth:eventYear * 12 } : {}), ...settings };
    const included = path !== 'stay' && params.eventMonth > 0 && params.eventMonth <= months;
    const growthSource = Object.hasOwn(edits,'growth') ? '本路径手动设置' : a.annualGrowth != null ? '来自问卷里的共同假设' : '演示参数';
    const steps = [];
    const principal = Number(a.pay);
    const baseValue = (month, rate) => principal * (1 + rate / 100) ** (month / 12);
    if (principal > 0) {
      const milestones = Array.from({length:Math.floor(months/12)+1}, (_,index) => index * 12);
      if (included) milestones.push(params.eventMonth);
      milestones.push(months);
      for (const month of [...new Set(milestones)].sort((first,second)=>first-second)) {
        const value = (rate, event) => baseValue(month,rate) * (included && month >= params.eventMonth ? 1 + event / 100 : 1);
        steps.push({ month, low:value(params.growth - 3,params.event - params.spread), mid:value(params.growth,params.event), high:value(params.growth + 3,params.event + params.spread) });
      }
    }
    return { params, steps, endpoint:steps.at(-1), included, growthSource, unchanged:principal > 0 ? baseValue(months,params.growth) : null };
  }

  function build(topic, a, active, edits, prompt) {
    if (Object.hasOwn(FutureExplore.topics, topic)) return FutureExplore.build(topic, a, active, prompt);
    if (topic === 'salary') {
      const paths = a.field === 'starting' ? firstJobPaths : salaryPaths;
      const order = [a.move, ...Object.keys(paths).filter(key => key !== a.move)];
      const key = active || order[0];
      const path = paths[key];
      const projection = salaryProjection(a,key,edits[key]);
      const premise = key !== 'stay' && !projection.included ? '这段期限先验证机会。模型只计入共同工资起点和每年变化的假设。' : path.premise;
      const guard = a.field === 'starting' ? '先问清书面报价和实际入职条件。'
        : key === 'stay' ? '把可核实的调薪标准和时间记下来。'
        : `同时记得${salaryGuard[a.reserve]}。`;
      return {
        key, order, paths, path, headline:path.name,
        letter:`写信这天，我想起我们还在${a.field === 'starting' ? '摸索方向' : workLabels[a.field][0] + '这条路上'}时，对收入的那点好奇。${premise}为了知道这个情景离现实多远，我可以拿${workLabels[a.field][1]}去问清机会的条件。`,
        plan:['梳理一项有证据的成果', key === 'stay' ? '在调薪周期前确认标准' : '用一个真实机会验证待遇', '按新的信息更新薪资区间'],
        action:`${path.action}${salaryEvidence[a.proof]} ${guard}`,
        evidence:['move','proof','reserve'],
        projection,
        all:order.map(id=>({ id, ...salaryProjection(a,id,edits[id]) })),
      };
    }
    if (topic === 'daily') {
      const order = orderPaths(dailyPaths,[a.energy,a.friction],[3,2]);
      const key = active || order[0];
      const path = dailyPaths[key];
      return { key, order, paths:dailyPaths, path, headline:path.name,
        letter:`${places[a.place]}${path.scene}这不是一夜之间换来的。我先学会${dailyGuard[a.guard]}，每周只拿出${a.free}试一次，后来才留下真的适合自己的安排。`,
        plan:path.agenda, planTitle:'未来某个普通工作日', action:`用你每周能留出的 ${a.free}。${path.action} 记得${dailyGuard[a.guard]}。`, evidence:['place','energy','friction','guard'],
      };
    }
    const order = orderPaths(careerPaths,[a.reward,a.ask,a.cost],[3,2,2]);
    const key = active || order[0];
    const path = careerPaths[key];
    return { key, order, paths:careerPaths, path, headline:path.name,
      letter:`最近有人问我是怎么做起${path.role}的。我想到在${workLabels[a.field][2]}摸索的那段时间。${path.scene}如果你也想试试，就从${workLabels[a.field][1]}开始。`,
      plan:path.steps, planTitle:'三步试出这个方向', action:`用每周能留出的 ${a.study} 开始。${path.action} 进入正式面试前，${careerGuard[a.guard]}。`, evidence:['reward','ask','cost','guard'],
    };
  }

  const demo = { years:5, field:'creative', pay:12000, target:20000, pace:'steady', move:'grow', proof:'some', reserve:'balance' };
  globalThis.FutureFold = { topics, build, demo, salaryProjection };
})();
