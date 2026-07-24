import { Component, input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  template: `
    <article><div class="top"><span>{{ icon() }}</span><small [class.down]="trend().startsWith('-')">{{ trend() }}</small></div>
      <b>{{ value() }}</b><p>{{ label() }}</p><footer>{{ detail() }}</footer></article>
  `,
  styles: [`
    article{padding:19px;border:1px solid #e9e8ee;border-radius:12px;background:#fff;box-shadow:0 4px 16px rgba(34,29,49,.025)}
    .top{display:flex;align-items:center;justify-content:space-between}.top>span{display:grid;width:35px;height:35px;place-items:center;border-radius:9px;color:#6852da;background:#efecff;font-size:17px}
    small{padding:4px 7px;border-radius:99px;color:#278c61;background:#eaf8f1;font-size:8px;font-weight:700}.down{color:#c25b58;background:#fff0ef}
    b{display:block;margin-top:16px;font-family:'Manrope',sans-serif;font-size:25px;letter-spacing:-.04em}p{margin:3px 0 15px;color:#777380;font-size:10px;font-weight:600}
    footer{padding-top:11px;border-top:1px solid #f0eef3;color:#a09ca7;font-size:8px}
  `],
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly trend = input.required<string>();
  readonly icon = input.required<string>();
  readonly detail = input.required<string>();
}
