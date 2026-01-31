
async function runAll() {
  const BASE_URL = 'http://localhost:3000';

  const modeCases = [
    { method: 'task-based', params: { topic: '任务型学习', grade: 'Grade 8', duration: 45 }, expectedStep: '任务前' },
    { method: 'project-based', params: { topic: '项目学习', grade: 'Grade 9', duration: 50 }, expectedStep: '项目启动' },
    { method: 'PPP', params: { topic: '一般现在时', grade: 'Grade 6', duration: 40 }, expectedStep: '呈现阶段' },
    { method: 'PWP', params: { topic: '阅读理解', grade: 'Grade 7', duration: 45 }, expectedStep: '读前活动' },
  ];

  for (const c of modeCases) {
    const body = { mode: c.method, ...c.params };
    console.log(`\n[模式测试] ${c.method} -> ${JSON.stringify(body)}`);
    const resp = await fetch(`${BASE_URL}/api/generate-lesson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const text = await resp.text();
    if (!resp.ok) {
      console.log(`❌ 模式返回错误: ${resp.status} ${text}`);
      continue;
    }
    const result = JSON.parse(text);
    const typesOk = typeof result.title === 'string'
      && typeof result.grade === 'string'
      && typeof result.duration === 'number'
      && result.teachingPreparation
      && Array.isArray(result.teachingPreparation.objectives)
      && Array.isArray(result.teachingPreparation.keyWords)
      && Array.isArray(result.procedures)
      && typeof result.procedures[0]?.step === 'string';
    const stepOk = result.procedures.some(p => p.step.includes(c.expectedStep));
    console.log(`✅ 类型校验: ${typesOk}, 步骤包含预期: ${stepOk}`);
  }

  const negatives = [
    { name: '401 未授权', url: `${BASE_URL}/api/generate-lesson?simulate=401`, status: 401 },
    { name: '403 禁止访问', url: `${BASE_URL}/api/generate-lesson?simulate=403`, status: 403 },
    { name: '404 未找到', url: `${BASE_URL}/api/generate-lessons`, status: 404 },
    { name: '500 服务器错误', url: `${BASE_URL}/api/generate-lesson?simulate=500`, status: 500 },
  ];
  for (const n of negatives) {
    console.log(`\n[异常测试] ${n.name}`);
    const resp = await fetch(n.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    console.log(`返回状态: ${resp.status} (期望: ${n.status})`);
  }
}

runAll();
