import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  refresh_token: string;
  user: User;
  expires_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          this.currentUserSubject.next(user);
        } catch (e) {
          this.clearStorage();
        }
      }
    }
  }

  private clearStorage(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
    this.currentUserSubject.next(null);
  }

  register(email: string, password: string, username: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, {
      email,
      password,
      username
    }).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, {
      email,
      password
    }).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  logout(): void {
    this.clearStorage();
    this.router.navigate(['/']);
  }

  private handleAuthResponse(response: AuthResponse): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('token', response.token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    this.currentUserSubject.next(response.user);
  }

  isLoggedIn(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return !!localStorage.getItem('token');
  }

  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'admin';
  }

  isWriter(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'admin' || user?.role === 'writer';
  }

  getToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('token');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  updateProfile(username: string, avatarUrl: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/auth/profile`, {
      username,
      avatar_url: avatarUrl
    });
  }

  updatePassword(oldPassword: string, newPassword: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/auth/password`, {
      old_password: oldPassword,
      new_password: newPassword
    });
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(user));
        }
      })
    );
  }
}
