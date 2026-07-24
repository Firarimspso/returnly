import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `<div class="page-header"><div><h1>{{ title() }}</h1><p>{{ description() }}</p></div><ng-content /></div>`,
  styles: [`
    .page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:25px}
    h1{margin:0;font-family:'Manrope',sans-serif;font-size:25px;letter-spacing:-.04em}p{margin:7px 0 0;color:#85818e;font-size:11px}
    @media(max-width:560px){.page-header{flex-direction:column}}
  `],
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
