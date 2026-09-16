const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = {};
context.globalThis = context;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../shared/provider-presets.js'), 'utf8'), context);

test('provider presets configure endpoint and model without shipping credentials', () => {
  const presets = context.ResumeProviderPresets.presets;
  assert.deepEqual(Array.from(presets, item => item.id), ['deepseek', 'qwen', 'kimi', 'openai', 'zhipu']);
  for (const preset of presets) {
    assert.match(preset.baseUrl, /^https:\/\//);
    assert.ok(preset.model);
    assert.equal('apiKey' in preset, false);
  }
});

test('provider request options disable thinking where structured JSON needs it', () => {
  const api = context.ResumeProviderPresets;
  const qwen = api.presets.find(item => item.id === 'qwen');
  assert.deepEqual({ ...api.requestOptions(qwen) }, { enable_thinking: false });
  assert.deepEqual({ ...api.requestOptions({ ...qwen, model: 'custom' }) }, {});
});
