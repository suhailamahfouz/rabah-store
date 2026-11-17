import { Routes } from '@angular/router';
import { AuthPageComponent } from './pages/auth-page';
import { AdminDashboardPageComponent } from './pages/admin-dashboard-page';
import { adminGuard } from './guards/admin.guard';
import { CartPageComponent } from './pages/cart-page';
import { CatalogPageComponent } from './pages/catalog-page';
import { CheckoutPageComponent } from './pages/checkout-page';
import { HomePageComponent } from './pages/home-page';
import { ProductDetailPageComponent } from './pages/product-detail-page';
import { MyOrdersPageComponent } from './pages/my-orders-page';
import { TrackOrderPageComponent } from './pages/track-order-page';
import { customerGuard } from './guards/customer.guard';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'catalog', component: CatalogPageComponent },
  { path: 'catalog/:categoryId', component: CatalogPageComponent },
  { path: 'product/:slug', component: ProductDetailPageComponent },
  { path: 'cart', component: CartPageComponent },
  { path: 'checkout', component: CheckoutPageComponent },
  { path: 'account/orders', component: MyOrdersPageComponent, canActivate: [customerGuard] },
  { path: 'orders', redirectTo: 'account/orders', pathMatch: 'full' },
  { path: 'track-order', component: TrackOrderPageComponent },
  { path: 'login', component: AuthPageComponent },
  { path: 'auth', redirectTo: 'login', pathMatch: 'full' },
  { path: 'admin/login', redirectTo: 'login', pathMatch: 'full' },
  { path: 'admin', component: AdminDashboardPageComponent, canActivate: [adminGuard] },
  { path: '**', redirectTo: '' },
];
