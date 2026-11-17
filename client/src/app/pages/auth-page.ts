import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { StoreService } from '../services/store.service';

function customerIdentifierValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  if (value.includes('@')) return Validators.email(control);
  const digits = value.replace(/\D/g, '');
  return /^\+?[0-9\s()-]{7,20}$/.test(value) && digits.length >= 7 && digits.length <= 15
    ? null : { invalidIdentifier: true };
}

function loginIdentifierValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  if (value.includes('@')) return Validators.email(control);
  const digits = value.replace(/\D/g, '');
  if (/^\+?[0-9\s()-]{7,20}$/.test(value) && digits.length >= 7 && digits.length <= 15) return null;
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}$/.test(value) ? null : { invalidIdentifier: true };
}

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="container auth-shell">
      <div class="auth-card">
        <p class="eyebrow">{{ isRegistering() ? (lang() === 'ar' ? 'انضم إلينا' : 'Join us') : (lang() === 'ar' ? 'مرحباً بعودتك' : 'Welcome back') }}</p>
        <h1>{{ isRegistering() ? (lang() === 'ar' ? 'إنشاء حساب' : 'Create account') : (lang() === 'ar' ? 'تسجيل الدخول' : 'Sign in') }}</h1>
        <p class="intro">{{ lang() === 'ar' ? 'استخدم بريدك الإلكتروني أو اسم المستخدم لتسجيل الدخول.' : 'Use your email address or username to sign in.' }}</p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <label *ngIf="isRegistering()">
            <span>{{ lang() === 'ar' ? 'الاسم' : 'Name' }}</span>
            <input type="text" formControlName="name" autocomplete="name" />
          </label>

          <label>
            <span>{{ isRegistering() ? (lang() === 'ar' ? 'البريد الإلكتروني أو رقم الموبايل' : 'Email or mobile number') : (lang() === 'ar' ? 'البريد الإلكتروني أو اسم المستخدم' : 'Email or username') }}</span>
            <input type="text" formControlName="identifier" autocomplete="username" />
            <small class="field-error" *ngIf="form.controls.identifier.touched && form.controls.identifier.hasError('invalidIdentifier')">
              {{ isRegistering() ? (lang() === 'ar' ? 'أدخل بريدًا إلكترونيًا أو رقم موبايل صحيحًا.' : 'Enter a valid email address or mobile number.') : (lang() === 'ar' ? 'أدخل بريدًا إلكترونيًا أو اسم مستخدم صحيحًا.' : 'Enter a valid email address or username.') }}
            </small>
          </label>

          <label>
            <span>{{ lang() === 'ar' ? 'كلمة المرور' : 'Password' }}</span>
            <input type="password" formControlName="password" [attr.autocomplete]="isRegistering() ? 'new-password' : 'current-password'" />
            <small class="hint" *ngIf="isRegistering()">{{ lang() === 'ar' ? '٨ أحرف على الأقل' : 'At least 8 characters' }}</small>
          </label>

          <p class="feedback error" *ngIf="errorMessage()">{{ errorMessage() }}</p>
          <p class="feedback success" *ngIf="successMessage()">{{ successMessage() }}</p>

          <button type="submit" class="submit-btn" [disabled]="isSubmitting() || !isFormValid()">
            {{ isSubmitting() ? (lang() === 'ar' ? 'جارٍ الإرسال...' : 'Please wait...') : (isRegistering() ? (lang() === 'ar' ? 'إنشاء الحساب' : 'Create account') : (lang() === 'ar' ? 'دخول' : 'Sign in')) }}
          </button>
        </form>

        <p class="switch-mode">
          {{ isRegistering() ? (lang() === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?') : (lang() === 'ar' ? 'ليس لديك حساب؟' : 'New to RABAH?') }}
          <button type="button" (click)="toggleMode()">
            {{ isRegistering() ? (lang() === 'ar' ? 'تسجيل الدخول' : 'Sign in') : (lang() === 'ar' ? 'إنشاء حساب' : 'Create an account') }}
          </button>
        </p>
      </div>
    </section>
  `,
  styles: [
    `
      :host { display: block; }
      .container { width: min(1100px, calc(100% - 2rem)); margin: 0 auto; }
      .auth-shell { display: grid; place-items: center; padding: 4rem 0; }
      .auth-card { width: min(520px, 100%); box-sizing: border-box; background: white; border: 1px solid rgba(17, 24, 39, 0.06); border-radius: 1.5rem; padding: 2rem; }
      .eyebrow { margin: 0; color: #8d573c; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; }
      h1 { margin: 0.6rem 0 0.5rem; font-size: clamp(2rem, 2.5vw, 2.8rem); }
      .intro { margin: 0 0 1.5rem; color: #706963; }
      form { display: grid; gap: 1rem; }
      label { display: grid; gap: 0.5rem; font-weight: 600; }
      input { width: 100%; box-sizing: border-box; border: 1px solid rgba(49, 46, 43, 0.12); border-radius: 0.9rem; padding: 0.85rem 1rem; font: inherit; }
      .hint, .field-error { font-size: 0.82rem; font-weight: 400; }
      .hint { color: #706963; }
      .field-error, .error { color: #b42318; }
      .feedback { margin: 0; font-size: 0.9rem; }
      .success { color: #287a45; }
      .submit-btn { border: none; background: linear-gradient(135deg, #8d573c, #d3a06f); color: white; border-radius: 999px; padding: 0.95rem 1.3rem; font: inherit; font-weight: 700; cursor: pointer; }
      .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      .switch-mode { margin: 1.25rem 0 0; text-align: center; }
      .switch-mode button { border: 0; padding: 0; background: none; color: #8d573c; font: inherit; font-weight: 700; cursor: pointer; }
    `,
  ],
})
export class AuthPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(StoreService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly lang = this.store.lang;
  readonly isRegistering = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    identifier: ['', [Validators.required, loginIdentifierValidator]],
    password: ['', Validators.required],
  });

  constructor() {
    if (this.route.snapshot.queryParamMap.get('register') === 'true') this.toggleMode();
  }

  isFormValid(): boolean {
    const { name, identifier, password } = this.form.controls;
    return identifier.valid && password.valid && (!this.isRegistering() || (name.valid && password.value.length >= 12));
  }

  toggleMode(): void {
    const isRegistering = !this.isRegistering();
    this.isRegistering.set(isRegistering);
    this.form.controls.identifier.setValidators([
      Validators.required,
      isRegistering ? customerIdentifierValidator : loginIdentifierValidator,
    ]);
    this.form.controls.identifier.updateValueAndValidity();
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  submit(): void {
    if (!this.isFormValid()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    const { name, identifier, password } = this.form.getRawValue();
    const request = this.isRegistering()
      ? this.auth.register(name.trim(), identifier.trim(), password)
      : this.auth.login(identifier.trim(), password);

    request.subscribe({
      next: ({ user, role }) => {
        this.isSubmitting.set(false);
        this.successMessage.set(this.lang() === 'ar' ? `أهلًا ${user.name}، تم تسجيل الدخول بنجاح.` : `Welcome, ${user.name}. You are signed in.`);
        void this.router.navigate([role === 'admin' ? '/admin' : '/']);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(
          error.error?.error?.message ??
            (this.lang() === 'ar' ? 'تعذر إتمام العملية. حاول مرة أخرى.' : 'Unable to complete your request. Please try again.'),
        );
      },
    });
  }
}
