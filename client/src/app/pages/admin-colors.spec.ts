import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { AdminDashboardPageComponent } from './admin-dashboard-page';
import { PRODUCT_COLOR_GROUPS } from '../data/product-colors';

describe('Admin color palette', () => {
  beforeEach(() => {
    localStorage.removeItem('rabah-admin-demo-v1');
    TestBed.configureTestingModule({ imports: [AdminDashboardPageComponent], providers: [provideRouter([]), { provide: AdminService, useValue: null }] });
  });
  afterEach(() => { localStorage.removeItem('rabah-admin-demo-v1'); });
  it('preserves saved selections during editing and changes colors without resetting stock', () => {
    const component = TestBed.createComponent(AdminDashboardPageComponent).componentInstance;
    const [black, white] = PRODUCT_COLOR_GROUPS[0].colors;
    const product = { ...component.products()[0], variants: [], stock: 9, colorOptions: [black] };
    component.editProduct(product);
    expect(component.selectedColorHexes()).toEqual([black.hex]);
    component.toggleProductColor(white);
    component.toggleProductColor(black);
    expect(component.selectedColorHexes()).toEqual([white.hex]);
    component.saveProduct();
    const saved = component.products().find(item => item._id === product._id)!;
    expect(saved.stock).toBe(9);
    expect(saved.colorOptions).toEqual([white]);
    component.editProduct(saved);
    expect(component.selectedColorHexes()).toEqual([white.hex]);
  });
});
