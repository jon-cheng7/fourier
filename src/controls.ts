// Overlay controls panel

export interface SliderOptions {
    label: string;
    min: number;
    max: number;
    value: number;
    onInput: (value: number) => void;
}

export function createPanel(container: HTMLElement): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'controls';
    container.append(panel);
    return panel;
}

export function addSlider(panel: HTMLElement, opts: SliderOptions): void {
    const row = document.createElement('label');
    row.className = 'slider';

    const name = document.createElement('span');
    name.textContent = opts.label;

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(opts.min);
    input.max = String(opts.max);
    input.step = '1';
    input.value = String(opts.value);

    const out = document.createElement('output');
    out.textContent = input.value;

    input.addEventListener('input', () => {
        out.textContent = input.value;
        opts.onInput(input.valueAsNumber);
    });

    row.append(name, input, out);
    panel.append(row);
}
