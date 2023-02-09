import { ttying } from '../src/index.js';

const ttyingInstance = ttying({
  shortcuts: [
    {
      trigger: 'p',
      description: 'Execute Task P',
      action() {
        console.log('Running Task P...');
        console.log('Task P Over');
      },
    },
    {
      trigger: 'r',
      description: 'Execute Task R',
      action() {
        console.log('Running Task R...');
        console.log('Task R Over');
      },
    },
    {
      trigger: 'h',
      description: 'Print helps',
      action() {
        ttyingInstance.help();
      },
    },
    {
      trigger: 'x',
      description: 'Exit Process',
      action() {
        process.exit();
      },
    },
  ],
});

ttyingInstance.start();
