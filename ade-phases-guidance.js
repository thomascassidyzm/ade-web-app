/**
 * ADE Phase Guidance - The complete flow from idea to deployment
 * This gets sent to L1_ORCH on initialization
 */

const ADEPhases = {
  phases: [
    {
      id: 'specify',
      name: 'SPECIFY',
      description: 'Extract complete APML specification through conversation',
      focus: [
        'Understand what the user wants to build',
        'Use APML component library extensively',
        'Create mathematically complete specification',
        'Define every flow, screen, and data model'
      ],
      deliverables: {
        primary: 'Complete APML specification',
        includes: [
          'app_meta (name, platform, description)',
          'screens (all UI screens)',
          'user_flows (every interaction path)',
          'data_models (complete data structure)',
          'integrations (external services)'
        ]
      },
      questions: [
        'What problem does this app solve?',
        'Who are your target users?',
        'What are the 3-5 core features?',
        'How do users accomplish their main goal?',
        'What data needs to be stored?',
        'Any external services to integrate?'
      ]
    },
    
    {
      id: 'visualize',
      name: 'VISUALIZE',
      description: 'Show APML flows for verification - ensure mathematical completeness',
      interface: {
        layout: '1/3 - 1/3 - 1/3 split screen',
        panels: [
          {
            position: 'left',
            content: 'App Screens (wireframe only, no design)',
            shows: 'Every screen as basic boxes and flows'
          },
          {
            position: 'center',
            content: 'APML Message Flows',
            shows: [
              'user_action → (what user does)',
              '← system_response (what app does)',
              '↔ data_flow (data movement)',
              '⟲ app_internal (background processes)'
            ]
          },
          {
            position: 'right',
            content: 'Journey Map + Chat',
            shows: [
              'Current phase indicator',
              'Progress through phases',
              'Chat with L1_ORCH'
            ]
          }
        ]
      },
      purpose: 'Verify every possible path is defined before building',
      no_design: true,
      user_actions: [
        'Review all flows',
        'Confirm completeness',
        'Request changes if needed',
        'Sign off on specification'
      ]
    },
    
    {
      id: 'build',
      name: 'BUILD',
      description: 'Compile APML into real Vue/Swift/Kotlin components',
      process: [
        'L1_ORCH spawns specialized agents',
        'Frontend agents generate Vue components',
        'Backend agents create API endpoints',
        'Database agents build data models',
        'All work in parallel'
      ],
      outputs: [
        'Working Vue.js components',
        'Express.js API endpoints',
        'Database schemas',
        'Deployment configuration'
      ]
    },
    
    {
      id: 'eye_test',
      name: 'EYE-TEST',
      description: 'A/B test every UI element to match user preferences',
      interface: {
        layout: '1/3 - 1/3 - 1/3 split screen',
        panels: [
          {
            position: 'left',
            content: 'Option A',
            shows: 'First design variant'
          },
          {
            position: 'center',
            content: 'Option B',
            shows: 'Second design variant'
          },
          {
            position: 'right',
            content: 'Journey Map + Chat',
            shows: [
              'Current test item',
              'Progress indicator',
              'Preference controls'
            ]
          }
        ]
      },
      tests: [
        'Button styles (rounded vs square)',
        'Color schemes (blue vs purple)',
        'Layouts (centered vs left-aligned)',
        'Transitions (slide vs fade)',
        'Typography (serif vs sans-serif)',
        'Spacing (compact vs spacious)',
        'Animations (subtle vs prominent)'
      ],
      builds_design_system: 'Creates user\'s personal design language'
    },
    
    {
      id: 'deploy',
      name: 'DEPLOY',
      description: 'Ship the perfected app to production',
      steps: [
        'Platform selection (Vercel, Railway, etc.)',
        'Environment configuration',
        'Database setup',
        'Domain configuration',
        'Launch checklist verification'
      ],
      deliverables: [
        'Live application URL',
        'Admin credentials',
        'API documentation',
        'Deployment guide'
      ]
    }
  ],
  
  key_principles: {
    mathematical_completeness: 'Every possible user path must be defined in APML before building',
    no_design_in_spec: 'Specification phase has zero design - only structure and flows',
    parallel_building: 'Multiple agents work simultaneously to compress time',
    user_preference_learning: 'Eye-test phase builds a complete design system from user choices',
    sophisticated_output: 'This is not a toy - output is production-ready, scalable applications'
  },
  
  time_compression: {
    traditional: {
      specification: '1-2 weeks',
      design: '2-3 weeks',
      development: '4-8 weeks',
      testing: '1-2 weeks',
      deployment: '1 week',
      total: '9-16 weeks'
    },
    with_ade: {
      specify: '15-30 minutes',
      visualize: '5 minutes',
      build: '5-10 minutes',
      eye_test: '10-15 minutes',
      deploy: '2 minutes',
      total: '37-62 minutes'
    }
  }
};

module.exports = ADEPhases;