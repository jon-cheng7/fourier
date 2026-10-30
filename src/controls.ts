// Overlay controls panel

export interface SliderOptions {
    label: string;
    min: number;
    max: number;
    value: number;
    onInput: (value: number) => void;
}

export interface Slider {
    set(value: number, max: number): void;
}

export interface ChoiceOptions<T extends string> {
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
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
    value: boolean;
    onChange: (value: boolean) => void;
}

export function createPanel(container: HTMLElement): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'controls';
    container.append(panel);
    return panel;
}

export function addSlider(panel: HTMLElement, opts: SliderOptions): Slider {
    const row = document.createElement('label');
    row.className = 'slider';

    const name = document.createElement('span');
    name.textContent = opts.label;

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(opts.min);
    input.step = '1';

    const out = document.createElement('output');

    const set = (value: number, max: number) => {
        input.max = String(max);
        input.value = String(value);
        out.textContent = input.value;
    };
    set(opts.value, opts.max);

    input.addEventListener('input', () => {
        out.textContent = input.value;
        opts.onInput(input.valueAsNumber);
    });

    row.append(name, input, out);
    panel.append(row);
    return { set };
}

export function addChoice<T extends string>(
    panel: HTMLElement,
    opts: ChoiceOptions<T>,
): HTMLElement {
    const row = document.createElement('div');
    row.className = 'choice';
    row.setAttribute('role', 'radiogroup');

    const buttons = opts.options.map(({ value, label }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.setAttribute('role', 'radio');
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

    row.append(input, name);
    panel.append(row);
}
