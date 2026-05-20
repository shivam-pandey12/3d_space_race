const DEFAULT_ACTION_BINDINGS = {
  accelerate: ['KeyW', 'ArrowUp'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  drift: ['ShiftLeft', 'ShiftRight'],
  boost: ['Space'],
  item: ['KeyE'],
  pause: ['Escape']
};

function uniqueCodes(values) {
  return [...new Set((values ?? []).filter(Boolean).map((value) => String(value)))];
}

function mergeBindings(overrides = {}) {
  const bindings = {};

  for (const [action, defaults] of Object.entries(DEFAULT_ACTION_BINDINGS)) {
    const override = overrides?.[action];
    const primary = typeof override === 'string' && override ? [override] : [];
    bindings[action] = uniqueCodes([...primary, ...defaults]);
  }

  return bindings;
}

function formatKeyCode(code) {
  const labels = {
    ArrowUp: 'Up',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Space: 'Space',
    Escape: 'Esc',
    ShiftLeft: 'Shift',
    ShiftRight: 'Shift',
    Enter: 'Enter'
  };

  if (labels[code]) {
    return labels[code];
  }

  return String(code ?? '')
    .replace(/^Key/, '')
    .replace(/^Digit/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

export class InputController {
  constructor(bindingOverrides = {}) {
    this.keys = new Set();
    this.justPressed = new Set();
    this.bindings = mergeBindings(bindingOverrides);
    this.awaitingBinding = null;

    this.handleKeyDown = (event) => {
      if (this.awaitingBinding) {
        event.preventDefault();
        this.awaitingBinding.resolve(event.code);
        this.awaitingBinding = null;
        return;
      }

      if (!this.keys.has(event.code)) {
        this.justPressed.add(event.code);
      }

      this.keys.add(event.code);
    };

    this.handleKeyUp = (event) => {
      this.keys.delete(event.code);
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  setBindings(bindingOverrides = {}) {
    this.bindings = mergeBindings(bindingOverrides);
  }

  getBindingsSnapshot() {
    return Object.fromEntries(
      Object.entries(this.bindings).map(([action, codes]) => [action, codes[0] ?? ''])
    );
  }

  getActionCodes(action) {
    return this.bindings[action] ?? [];
  }

  getActionLabel(action) {
    return this.getActionCodes(action).map(formatKeyCode).join(' / ');
  }

  isPressed(code) {
    return this.keys.has(code);
  }

  isActionPressed(action) {
    return this.getActionCodes(action).some((code) => this.keys.has(code));
  }

  consumePressed(code) {
    const pressed = this.justPressed.has(code);

    if (pressed) {
      this.justPressed.delete(code);
    }

    return pressed;
  }

  consumeActionPressed(action) {
    const codes = this.getActionCodes(action);
    const pressed = codes.some((code) => this.justPressed.has(code));

    if (pressed) {
      for (const code of codes) {
        this.justPressed.delete(code);
      }
    }

    return pressed;
  }

  waitForRebind(action) {
    if (!DEFAULT_ACTION_BINDINGS[action]) {
      return Promise.reject(new Error('Unknown control action.'));
    }

    if (this.awaitingBinding) {
      this.awaitingBinding.resolve('');
    }

    return new Promise((resolve) => {
      this.awaitingBinding = {
        action,
        resolve
      };
    });
  }

  cancelRebind() {
    if (!this.awaitingBinding) {
      return;
    }

    this.awaitingBinding.resolve('');
    this.awaitingBinding = null;
  }

  describeControls() {
    return {
      accelerate: this.getActionLabel('accelerate'),
      steerLeft: this.getActionLabel('left'),
      steerRight: this.getActionLabel('right'),
      drift: this.getActionLabel('drift'),
      boost: this.getActionLabel('boost'),
      item: this.getActionLabel('item'),
      pause: this.getActionLabel('pause')
    };
  }

  dispose() {
    this.cancelRebind();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
