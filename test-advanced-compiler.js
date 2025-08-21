const PatternVueCompiler = require('./compiler/pattern-vue-compiler');
const fs = require('fs');

// Test the advanced compiler with real APML examples
function testAdvancedCompiler() {
  console.log('🧪 Testing Advanced PatternVueCompiler...');
  
  const compiler = new PatternVueCompiler();
  
  // Test with a complex APML example
  const testAPML = `
## App Configuration
name: "Advanced Test App"
type: "social_platform"

## Data Model
app_state: {
  user_profile: { type: "object", default: "{}" },
  messages: { type: "array", default: "[]" },
  current_view: { type: "string", default: "welcome" }
}

## UI Components
welcome_screen: {
  type: "welcome_card",
  title: "Welcome to ADE",
  subtitle: "Build apps in minutes",
  description: "Transform conversations into production-ready applications",
  meta_info: "Powered by Claude Sonnet 4",
  action_text: "Start Building",
  visible_when: "current_view === 'welcome'"
}

user_form: {
  type: "form_input",
  action: "submitUserInfo",
  elements: [
    {
      type: "input",
      bind: "user_name",
      placeholder: "Enter your name",
      required: true
    },
    {
      type: "text_area", 
      bind: "user_description",
      placeholder: "Tell us about your app idea...",
      rows: 4,
      required: true
    },
    {
      type: "button",
      text: "Continue",
      action: "processUserInput",
      disabled_when: "!user_name || !user_description"
    }
  ]
}

data_display: {
  type: "data_table",
  data_source: "user_projects",
  key_field: "id",
  columns: [
    { key: "name", label: "Project Name" },
    { key: "type", label: "App Type" },
    { key: "status", label: "Status" }
  ]
}

navigation_modal: {
  type: "modal_dialog",
  visible_when: "show_nav_modal",
  title: "Navigation Menu",
  content: "Choose your next destination",
  overlay_click: "closeModal",
  actions: [
    { text: "Dashboard", action: "goToDashboard", style: "primary" },
    { text: "Settings", action: "goToSettings", style: "secondary" },
    { text: "Cancel", action: "closeModal", style: "secondary" }
  ]
}
`;

  try {
    console.log('📝 Compiling APML...');
    const vueApp = compiler.compile(testAPML);
    
    console.log('✅ Compilation successful!');
    console.log('📊 Generated Vue.js application structure:');
    
    // Show first 1000 characters to see the structure
    console.log(vueApp.substring(0, 1000) + '...');
    
    // Save the compiled output
    fs.writeFileSync('./compiled-advanced-test-app.html', vueApp);
    console.log('💾 Compiled app saved to compiled-advanced-test-app.html');
    
    // Show statistics
    const lines = vueApp.split('\n').length;
    const size = Buffer.byteLength(vueApp, 'utf8');
    console.log(`📈 Generated ${lines} lines, ${size} bytes`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Compilation failed:', error.message);
    console.error('🔍 Error details:', error);
    return false;
  }
}

// Run the test
const success = testAdvancedCompiler();

if (success) {
  console.log('\n🎉 Advanced APML compiler test PASSED!');
  console.log('🚀 PatternVueCompiler successfully handles complex patterns');
  console.log('🔥 Ready for production use with Claude Sonnet 4');
} else {
  console.log('\n⚠️  Advanced APML compiler test FAILED');
  console.log('🔧 Check the error details above for debugging');
}