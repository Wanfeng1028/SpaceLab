import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { FooterComponent } from './shared/components/footer/footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, ToastComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
