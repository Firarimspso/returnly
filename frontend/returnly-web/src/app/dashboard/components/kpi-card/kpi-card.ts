import { Component, input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  template: `
    <article><div class="top"><span>{{ icon() }}</span>@if (trend()) { <small [class.down]="trend().startsWith('-')">{{ trend() }}</small> }</div>
      <b>{{ value() }}</b><p>{{ label() }}</p><footer>{{ detail() }}</footer></article>
  `,
  styles: [`
    article{height:100%;padding:21px;border:1px solid #e9e8ee;border-radius:12px;background:#fff;box-shadow:0 4px 16px rgba(34,29,49,.025);transition:transform 180ms ease,border-color 180ms ease,box-shadow 180ms ease}
    article:hover{border-color:#dcd5fb;box-shadow:0 12px 28px rgba(59,45,108,.09);transform:translateY(-2px)}
    .top{display:flex;align-items:center;justify-content:space-between}.top>span{display:grid;width:35px;height:35px;place-items:center;border-radius:9px;color:#6852da;background:#efecff;font-size:17px;transition:color 180ms ease,background 180ms ease,transform 180ms ease}
    article:hover .top>span{color:#fff;background:#6952e8;transform:scale(1.04)}
    small{padding:4px 7px;border-radius:99px;color:#278c61;background:#eaf8f1;font-size:8px;font-weight:700}.down{color:#c25b58;background:#fff0ef}
    b{display:block;margin-top:17px;font-family:'Manrope',sans-serif;font-size:25px;letter-spacing:-.04em}p{margin:5px 0 17px;color:#686370;font-size:14px!important;font-weight:600}
    footer{padding-top:13px;border-top:1px solid #eeebf1;color:#77727e;font-size:13px;line-height:1.4}
    @media(prefers-reduced-motion:reduce){article,.top>span{transition:none}article:hover{transform:none}}
  `],
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly trend = input('');
  readonly icon = input.required<string>();
  readonly detail = input.required<string>();
}
