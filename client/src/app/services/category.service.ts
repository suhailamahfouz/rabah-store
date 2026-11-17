import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { categories as mockCategories } from '../data/categories-data';
import { Category } from '../models/store';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  // Public catalog content always comes from MongoDB. Mock data is retained
  // only as an icon map for legacy category slugs, never rendered as catalog data.
  readonly categories = signal<Category[]>([]);
  readonly error = signal('');
  private loadGeneration = 0;

  constructor() { this.reload(); }

  reload(): void {
    this.loadGeneration += 1;
    const generation = this.loadGeneration;
    this.http.get<{ success: true; data: Array<{ id: string; slug: string; name: { ar: string; en: string }; description: { ar: string; en: string }; image?: string }> }>('/api/categories', { headers: { 'Cache-Control': 'no-cache' } })
      .subscribe({
        next: ({ data }) => {
          if (generation !== this.loadGeneration) return;
          this.categories.set(data.map((category) => ({
            id: category.id,
            slug: category.slug,
            label: category.name,
            icon: mockCategories.find((item) => item.slug === category.slug)?.icon ?? 'gift',
            description: category.description,
            image: category.image,
          })));
          this.error.set('');
        },
        error: () => {
          if (generation === this.loadGeneration) this.error.set('Unable to load store categories from the server.');
        },
      });
  }

  getById(id: string): Category | undefined {
    return this.categories().find((category) => category.id === id || category.slug === id);
  }
}
