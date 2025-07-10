const yaml = require('js-yaml');
const fs = require('fs');

// Simple APML to Vue Compiler
function compileAPMLToVue(apmlContent) {
  const spec = yaml.load(apmlContent);
  
  let template = '<template>\n';
  if (spec.template && spec.template.elements) {
    spec.template.elements.forEach(el => {
      const [tag, content] = Object.entries(el)[0];
      template += `  <${tag}>${content.text || ''}</${tag}>\n`;
    });
  } else {
    template += '  <div>No template defined</div>\n';
  }
  template += '</template>\n\n';
  
  let script = '<script setup>\n';
  if (spec.props) {
    const props = Object.entries(spec.props).map(([k,v]) => `  ${k}: ${v === 'string' ? 'String' : v}`).join(',\n');
    script += `defineProps({\n${props}\n})\n`;
  }
  script += '</script>';
  
  return template + script;
}

// Test with simple component
const testAPML = `
name: TestButton
template:
  elements:
    - button:
        text: Click me
props:
  label: string
`;

console.log(compileAPMLToVue(testAPML));

module.exports = { compileAPMLToVue };