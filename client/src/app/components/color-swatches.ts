import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProductColor } from '../data/product-colors';

@Component({
  selector: 'app-color-swatches', imports: [CommonModule],
  template: `<div class="swatches" role="group" [attr.aria-label]="lang === 'ar' ? 'اختيار الألوان' : 'Choose colours'" [attr.dir]="lang === 'ar' ? 'rtl' : 'ltr'">
    <button *ngFor="let color of colors" type="button" class="swatch" [class.selected]="selected.includes(color.hex)" [attr.aria-pressed]="selected.includes(color.hex)" [attr.aria-label]="color.name[lang]" [title]="color.name[lang]" (click)="choose.emit(color)">
      <span class="disc" [style.background-color]="color.hex"><svg *ngIf="selected.includes(color.hex)" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10" /></svg></span>
      <span *ngIf="showNames" class="name">{{ color.name[lang] }}</span>
    </button>
  </div>`,
  styles: [`
    .swatches{display:flex;flex-wrap:wrap;gap:8px;align-items:start}
    .swatch{display:grid;justify-items:center;gap:6px;min-width:44px;min-height:44px;padding:5px;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;border-radius:10px}
    .disc{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;box-shadow:inset 0 0 0 1px #0002;position:relative}
    .selected .disc::after{content:'';position:absolute;inset:-4px;border:1.5px solid #651d32;border-radius:50%}
    svg{width:16px;height:16px;padding:2px;background:#251c25b3;border-radius:50%;fill:none;stroke:white;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
    .name{font-size:11px;max-width:66px;line-height:1.4;text-align:center}
    .swatch:focus-visible{outline:2px solid #651d32;outline-offset:3px}
    @media(hover:hover){.swatch:hover{background:#eee7e2}}
  `],
})
export class ColorSwatchesComponent {
  @Input() colors: ProductColor[] = [];
  @Input() selected: string[] = [];
  @Input() lang: 'ar' | 'en' = 'ar';
  @Input() showNames = false;
  @Output() choose = new EventEmitter<ProductColor>();
}
