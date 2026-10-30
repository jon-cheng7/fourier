// Overlay controls panel

export interface SliderOptions {
    label: string;
    min: number;
    max: number;
    value: number;
    format?: (value: number) => string;
    // Typed text (digits and maybe one '.') → slider value. Default: the number itself
    parse?: (text: string) => number;
    // Allow a decimal point when typing
    decimals?: boolean;
    tip?: string;
    onInput: (value: number) => void;
}

export interface Slider {
    set(value: number, max: number): void;
}

export interface ChoiceOptions<T extends string> {
    options: { value: T; label: string; tip?: string }[];
    value: T;
    onChange: (value: T) => void;
}

export interface Choice<T extends string> {
    row: HTMLElement;
    set(value: T): void;
}

export interface SelectOptions {
    label: string;
    tip?: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
}

export interface TextBoxOptions {
    value: string;
    placeholder: string;
    button: string;
    onSubmit: (text: string) => void;
}

export interface TextBox {
    row: HTMLElement;
    setError(message: string): void;
}

export interface ToggleOptions {
    label: string;
    tip?: string;
    value: boolean;
    onChange: (value: boolean) => void;
}

export interface Button {
    setLabel(label: string): void;
}

// Hover/focus text for the shared tooltip (ui/tooltip.ts)
function setTip(el: HTMLElement, tip: string | undefined) {
    if (!tip) return;
    el.dataset.tip = tip;
    el.classList.add('has-tip');
}

// Returns the body that controls go in; the header collapses it
export function createPanel(
    container: HTMLElement,
    collapsed: boolean,
): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'controls';

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'controls-header';
    header.textContent = 'Controls';

    const body = document.createElement('div');
    body.className = 'controls-body';
    body.id = 'controls-body';
    header.setAttribute('aria-controls', body.id);

    const setCollapsed = (c: boolean) => {
        body.hidden = c;
        header.setAttribute('aria-expanded', String(!c));
    };
    setCollapsed(collapsed);
    header.addEventListener('click', () => setCollapsed(!body.hidden));

    panel.append(header, body);
    container.append(panel);
    return body;
}

export function addSlider(panel: HTMLElement, opts: SliderOptions): Slider {
    const row = document.createElement('div');
    row.className = 'slider';

    const name = document.createElement('span');
    name.textContent = opts.label;
    setTip(name, opts.tip);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(opts.min);
    input.step = '1';
    input.setAttribute('aria-label', opts.label);

    // Shows the formatted value; click to type one
    const field = document.createElement('input');
    field.type = 'text';
    field.className = 'value';
    field.inputMode = opts.decimals ? 'decimal' : 'numeric';
    field.maxLength = 6;
    field.spellcheck = false;
    field.setAttribute('aria-label', `${opts.label} value`);

    const show = () => {
        const v = input.valueAsNumber;
        field.value = opts.format ? opts.format(v) : String(v);
    };

    const set = (value: number, max: number) => {
        input.max = String(max);
        input.value = String(value);
        show();
    };
    set(opts.value, opts.max);

    input.addEventListener('input', () => {
        show();
        opts.onInput(input.valueAsNumber);
    });

    // Only digits (and one point if allowed) get in: no signs, letters, spaces or units
    const clean = (text: string) => {
        const kept = text.replace(opts.decimals ? /[^0-9.]/g : /[^0-9]/g, '');
        const dot = kept.indexOf('.');
        return dot < 0
            ? kept
            : kept.slice(0, dot + 1) + kept.slice(dot + 1).replace(/\./g, '');
    };
    field.addEventListener('focus', () => {
        field.value = clean(field.value);
        field.select();
    });
    field.addEventListener('input', () => {
        field.value = clean(field.value);
    });

    // Empty or not a number → keep the old value. Out of range → clamp to min / current max
    let cancelled = false;
    const commit = () => {
        const text = field.value;
        const typed = text === '' || text === '.' ? NaN : Number(text);
        if (!cancelled && Number.isFinite(typed)) {
            const raw = opts.parse ? opts.parse(text) : typed;
            const min = Number(input.min);
            const max = Number(input.max);
            const v = Math.min(max, Math.max(min, Math.round(raw)));
            if (Number.isFinite(v) && v !== input.valueAsNumber) {
                input.value = String(v);
                opts.onInput(v);
            }
        }
        cancelled = false;
        show();
    };
    field.addEventListener('blur', commit);
    field.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') field.blur();
        if (e.key === 'Escape') {
            cancelled = true;
            field.blur();
        }
    });

    row.append(name, input, field);
    panel.append(row);
    return { set };
}

export function addChoice<T extends string>(
    panel: HTMLElement,
    opts: ChoiceOptions<T>,
): Choice<T> {
    const row = document.createElement('div');
    row.className = 'choice';
    row.setAttribute('role', 'radiogroup');

    const buttons = opts.options.map(({ value, label, tip }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.setAttribute('role', 'radio');
        setTip(button, tip);
        button.addEventListener('click', () => {
            select(value);
            opts.onChange(value);
        });
        row.append(button);
        return { value, button };
    });

    const select = (value: T) => {
        for (const b of buttons) {
            b.button.setAttribute('aria-checked', String(b.value === value));
        }
    };
    select(opts.value);

    panel.append(row);
    return { row, set: select };
}

export function addSelect(
    panel: HTMLElement,
    opts: SelectOptions,
): HTMLElement {
    const row = document.createElement('div');
    row.className = 'select';

    const name = document.createElement('span');
    name.textContent = opts.label;
    setTip(name, opts.tip);

    const select = document.createElement('select');
    select.setAttribute('aria-label', opts.label);
    for (const { value, label } of opts.options) {
        select.add(new Option(label, value, false, value === opts.value));
    }
    select.addEventListener('change', () => opts.onChange(select.value));

    row.append(name, select);
    panel.append(row);
    return row;
}

export function addTextBox(panel: HTMLElement, opts: TextBoxOptions): TextBox {
    const row = document.createElement('div');
    row.className = 'textbox';

    const area = document.createElement('textarea');
    area.value = opts.value;
    area.placeholder = opts.placeholder;
    area.rows = 3;
    area.spellcheck = false;

    const error = document.createElement('p');
    error.className = 'error';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = opts.button;
    button.addEventListener('click', () => opts.onSubmit(area.value));

    row.append(area, error, button);
    panel.append(row);

    return {
        row,
        setError: (message) => {
            error.textContent = message;
        },
    };
}

export function addToggle(panel: HTMLElement, opts: ToggleOptions): void {
    const row = document.createElement('label');
    row.className = 'toggle';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = opts.value;
    input.addEventListener('change', () => opts.onChange(input.checked));

    const name = document.createElement('span');
    name.textContent = opts.label;
    setTip(name, opts.tip);

    row.append(input, name);
    panel.append(row);
}

export function addButton(
    panel: HTMLElement,
    label: string,
    onClick: () => void,
    tip?: string,
): Button {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action';
    button.textContent = label;
    setTip(button, tip);
    button.addEventListener('click', onClick);
    panel.append(button);
    return {
        setLabel: (l) => {
            button.textContent = l;
        },
    };
}
