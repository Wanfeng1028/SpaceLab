import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideNzI18n, zh_CN } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { IconDefinition } from '@ant-design/icons-angular';
import {
  DashboardOutline,
  FileTextOutline,
  TeamOutline,
  MessageOutline,
  BarChartOutline,
  LogoutOutline,
  PlusOutline,
  EditOutline,
  DeleteOutline,
  CheckOutline,
  CloseOutline,
  ReloadOutline,
  MenuFoldOutline,
  MenuUnfoldOutline,
  UserOutline,
  LockOutline,
} from '@ant-design/icons-angular/icons';

// 后台管理用到的图标（按需导入，避免打包全部图标）
const ADMIN_ICONS: IconDefinition[] = [
  DashboardOutline,
  FileTextOutline,
  TeamOutline,
  MessageOutline,
  BarChartOutline,
  LogoutOutline,
  PlusOutline,
  EditOutline,
  DeleteOutline,
  CheckOutline,
  CloseOutline,
  ReloadOutline,
  MenuFoldOutline,
  MenuUnfoldOutline,
  UserOutline,
  LockOutline,
];

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { NZ_MODAL_CONFIG, NzModalService } from 'ng-zorro-antd/modal';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideNzI18n(zh_CN),
    provideNzIcons(ADMIN_ICONS),
    NzModalService,
  ],
};
