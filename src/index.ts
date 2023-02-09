// Readline lets us tap into the process events
import * as readline from 'readline';
import colors from 'picocolors';
import createDebug from 'debug';
import { platform } from 'os';

const isMac = platform() === 'darwin';

const debug = createDebug('ttying');

// Allows us to listen for events from stdin
readline.emitKeypressEvents(process.stdin);

export type ShortcutTrigger = string | readline.Key;

export interface ShortcutConfig {
  /**
   * shortcut trigger could be a string or an object like [readline.Key](https://nodejs.org/dist/latest-v18.x/docs/api/readline.html#rlwritedata-key)
   **/
  trigger: ShortcutTrigger;
  /**
   * description of this shortcut, it will be used to generate help content
   */
  description?: string;
  /**
   * handler when trigger pressed.
   */
  action(): void | Promise<void>;
}

export interface TTYingOptions {
  shortcuts: ShortcutConfig[];
  /**
   * The frequency of printing help content:
   *
   * `"always"`: print after every action over
   *
   * `"once"`: only print once on start
   *
   * `false`: never print
   */
  printHelpFrequency?: 'always' | 'once' | false;
  /**
   *  You can pass it to override default help content
   */
  helpContent?: string;
}

function getShortcutTriggerDisplay(trigger: ShortcutTrigger) {
  if (typeof trigger === 'string') {
    return trigger;
  }

  let modifiers = '';

  if (trigger.ctrl) {
    modifiers += 'Ctrl+';
  }
  if (trigger.shift) {
    modifiers += 'Shift+';
  }
  if (trigger.meta) {
    modifiers += isMac ? 'Option+' : 'Alt+';
  }

  return `${modifiers}${trigger.name}`;
}

function generateHelpContentFromShortcuts(shortcuts: ShortcutConfig[]) {
  return shortcuts
    .map((shortcut) => {
      return (
        '  ' + colors.bold(getShortcutTriggerDisplay(shortcut.trigger)) + colors.blue(' ➜ ') + shortcut.description
      );
    })
    .join('\n');
}

function isShortcutTriggerMatch(trigger: ShortcutTrigger, input: string, keyInfo: readline.Key) {
  if (typeof trigger === 'string') {
    return trigger === input;
  }

  const { sequence, name, ctrl = false, shift = false, meta = false } = trigger;

  // sequence equal
  if (sequence && sequence === keyInfo.sequence) {
    return true;
  }

  return name === keyInfo.name && ctrl === keyInfo.ctrl && shift === keyInfo.shift && meta === keyInfo.meta;
}

export function ttying(options: TTYingOptions) {
  const { stdin } = process;

  const { shortcuts, helpContent: optionHelpContent, printHelpFrequency = 'always' } = options;
  const helpContent = optionHelpContent ?? generateHelpContentFromShortcuts(shortcuts);

  function help() {
    console.log(helpContent);
  }

  function start() {
    const needPauseAfterClose = stdin.isPaused();
    // Raw mode gets rid of standard keypress events and other
    // functionality Node.js adds by default
    stdin.setRawMode(true).setEncoding('utf8').resume();

    let runningAction = false;

    const handler = async (input: string, keyInfo: readline.Key) => {
      debug('input: %s, keyInfo: %o, runningAction: %s', input, keyInfo, runningAction);

      if (runningAction === true) {
        return;
      }

      // ctrl-c ( end of text )
      if (input === '\u0003') {
        process.exit();
      }

      const matchedShortcut = shortcuts.find((shortcut) => isShortcutTriggerMatch(shortcut.trigger, input, keyInfo));

      if (matchedShortcut) {
        runningAction = true;

        await matchedShortcut.action();
        if (printHelpFrequency === 'always') {
          help();
        }
        runningAction = false;
      }
    };

    // Start the keypress listener for the process
    stdin.on('keypress', handler);

    if (printHelpFrequency === 'always' || printHelpFrequency === 'once') {
      help();
    }

    return () => {
      stdin.off('keypress', handler);
      stdin.setRawMode(false);
      if (needPauseAfterClose) {
        stdin.pause();
      }
    };
  }

  return {
    start,
    help,
  };
}

export default ttying;
