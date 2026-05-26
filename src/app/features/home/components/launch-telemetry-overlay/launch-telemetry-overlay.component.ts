import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, signal, computed, HostListener } from '@angular/core';

interface TelemetryPhase {
  label: string;
  active: boolean;
}

interface GaugeTick {
  angle: number;
  major: boolean;
}

@Component({
  selector: 'app-launch-telemetry-overlay',
  templateUrl: './launch-telemetry-overlay.component.html',
  styleUrl: './launch-telemetry-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaunchTelemetryOverlayComponent implements OnInit, OnDestroy {
  readonly Math = Math;

  readonly activeIndex = computed(() => {
    const hours = this.currentTime().getHours();
    if (hours >= 5 && hours < 9) return 0;   // 05:00 - 08:59 (DAWN)
    if (hours >= 9 && hours < 12) return 1;  // 09:00 - 11:59 (MORNING)
    if (hours >= 12 && hours < 14) return 2; // 12:00 - 13:59 (MIDDAY)
    if (hours >= 14 && hours < 19) return 3; // 14:00 - 18:59 (AFTERNOON)
    return 4;                                // 19:00 - 04:59 (NIGHT)
  });

  readonly phases = computed<TelemetryPhase[]>(() => {
    const idx = this.activeIndex();
    return [
      { label: 'DAWN', active: idx === 0 },
      { label: 'MORNING', active: idx === 1 },
      { label: 'MIDDAY', active: idx === 2 },
      { label: 'AFTERNOON', active: idx === 3 },
      { label: 'NIGHT', active: idx === 4 },
    ];
  });

  /** 11 条刻度线角度（从弧线左端到右端均匀分布） */
  readonly ticks: GaugeTick[] = Array.from({ length: 11 }, (_, i) => ({
    angle: (i + 1) * (Math.PI / 12),
    major: i % 2 === 0,
  }));

  // Signals for holding telemetry states
  readonly currentTime = signal(new Date());

  readonly locationInfo = signal({
    status: 'loading',
    city: 'Locating...',
    region: 'Permission Required',
    latitude: null as number | null,
    longitude: null as number | null
  });

  readonly weatherInfo = signal({
    status: 'loading',
    temperature: '--',
    condition: 'Loading'
  });

  readonly networkInfo = signal({
    status: 'UNKNOWN',
    detail: 'CHECKING',
    level: 0
  });

  private timerId: ReturnType<typeof setInterval> | null = null;
  private connectionRef: EventTarget | null = null;
  private connectionChangeHandler: (() => void) | null = null;
  private abortController: AbortController | null = null;

  @HostListener('window:online')
  onOnline(): void {
    this.updateNetworkStatus();
  }

  @HostListener('window:offline')
  onOffline(): void {
    this.updateNetworkStatus();
  }

  ngOnInit(): void {
    this.abortController = new AbortController();

    // 1. Initialize network status and listen for connection changes
    this.updateNetworkStatus();
    this.setupConnectionListener();

    // 2. Fetch location & weather
    this.initLocationAndWeather();

    // 3. Set up 1s clock interval (clock only, no network polling)
    this.timerId = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
    }
    this.abortController?.abort();
    this.teardownConnectionListener();
  }

  private setupConnectionListener(): void {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      this.connectionRef = conn;
      this.connectionChangeHandler = () => this.updateNetworkStatus();
      conn.addEventListener('change', this.connectionChangeHandler);
    }
  }

  private teardownConnectionListener(): void {
    if (this.connectionRef && this.connectionChangeHandler) {
      (this.connectionRef as any).removeEventListener('change', this.connectionChangeHandler);
      this.connectionRef = null;
      this.connectionChangeHandler = null;
    }
  }

  // Formatting utility getters
  get formattedTime(): string {
    const d = this.currentTime();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  get formattedDate(): string {
    const d = this.currentTime();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  get formattedDateTime(): string {
    return `${this.formattedDate} ${this.formattedTime}`;
  }

  get userTimeZone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }

  get phaseProgress(): number {
    const idx = this.activeIndex();
    const total = this.phases().length - 1;
    return total > 0 ? idx / total : 0;
  }

  /** Gets active signal strength index (0 to 5) */
  get networkLevel(): number {
    return this.networkInfo().level;
  }

  private initLocationAndWeather(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.handleLocationError('unsupported');
      return;
    }

    // Respect prior geolocation consent
    if (localStorage.getItem('geoConsent') !== 'true') {
      this.locationInfo.set({
        status: 'pending',
        city: 'Click to enable',
        region: 'Location permission required',
        latitude: null,
        longitude: null
      });
      return;
    }

    this.requestGeolocation();
  }

  grantLocationConsent(): void {
    localStorage.setItem('geoConsent', 'true');
    this.requestGeolocation();
  }

  private requestGeolocation(): void {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        this.fetchGeocodingAndWeather(lat, lon);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        this.handleLocationError(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  private handleLocationError(reason: 'denied' | 'failed' | 'unsupported'): void {
    const isDenied = reason === 'denied';
    this.locationInfo.set({
      status: reason,
      city: 'Unavailable',
      region: isDenied ? 'Location Disabled' : 'Locating Failed',
      latitude: null,
      longitude: null
    });
    this.weatherInfo.set({
      status: 'unavailable',
      temperature: '--',
      condition: 'Weather N/A'
    });
  }

  private async fetchGeocodingAndWeather(lat: number, lon: number): Promise<void> {
    // 1. Fetch location name via BigDataCloud Reverse Geocoding API (free, keyless)
    try {
      const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
      const geoRes = await fetch(geoUrl, { signal: this.abortController?.signal });
      if (!geoRes.ok) throw new Error('Geocoding response failed');
      const geoData = await geoRes.json();
      
      const city = geoData.city || geoData.locality || geoData.principalSubdivision || 'Unknown';
      const region = geoData.principalSubdivision && geoData.countryCode 
        ? `${geoData.principalSubdivision} / ${geoData.countryCode}` 
        : geoData.countryName || 'Unknown';

      this.locationInfo.set({
        status: 'success',
        city,
        region,
        latitude: lat,
        longitude: lon
      });
    } catch (e) {
      console.warn('Geocoding API failed, falling back to coordinates:', e);
      // Fallback: display approximate coordinates with correct hemisphere indicators
      this.locationInfo.set({
        status: 'success',
        city: `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`,
        region: `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`,
        latitude: lat,
        longitude: lon
      });
    }

    // 2. Fetch current weather via Open-Meteo API (free, keyless)
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
      const weatherRes = await fetch(weatherUrl, { signal: this.abortController?.signal });
      if (!weatherRes.ok) throw new Error('Weather response failed');
      const weatherData = await weatherRes.json();
      
      const current = weatherData.current_weather;
      if (!current) throw new Error('No current weather data');

      const temp = Math.round(current.temperature);
      const code = current.weathercode;
      const condition = this.mapWeatherCode(code);

      this.weatherInfo.set({
        status: 'success',
        temperature: `${temp}°`,
        condition
      });
    } catch (e) {
      console.warn('Weather API failed:', e);
      this.weatherInfo.set({
        status: 'unavailable',
        temperature: '--',
        condition: 'Weather N/A'
      });
    }
  }

  private mapWeatherCode(code: number): string {
    // Open-Meteo WMO weather codes mapping:
    if (code === 0) return 'Clear';
    if (code >= 1 && code <= 3) return 'Cloudy';
    if (code === 45 || code === 48) return 'Foggy';
    if (code >= 51 && code <= 55) return 'Drizzle';
    if (code >= 61 && code <= 65) return 'Rainy';
    if (code >= 71 && code <= 75) return 'Snowy';
    if (code >= 80 && code <= 82) return 'Showers';
    if (code >= 95 && code <= 99) return 'Storm';
    return 'Cloudy';
  }

  private updateNetworkStatus(): void {
    if (typeof navigator === 'undefined') return;

    const online = navigator.onLine;
    if (!online) {
      this.networkInfo.set({
        status: 'OFFLINE',
        detail: 'OFFLINE',
        level: 0
      });
      return;
    }

    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      const type = conn.effectiveType || ''; // '4g', '3g', '2g', 'slow-2g'
      const downlink = conn.downlink || 0;  // Mbps
      const rtt = conn.rtt || 0;            // ms

      let status = 'GOOD';
      let level = 5;

      if (type === 'slow-2g' || type === '2g' || downlink < 0.5) {
        status = 'POOR';
        level = 1;
      } else if (type === '3g' || downlink < 2.0) {
        status = 'FAIR';
        level = 3;
      } else {
        status = 'GOOD';
        level = 5;
      }

      // If online but level indicates slow connection
      if (rtt > 300) {
        level = Math.max(1, level - 1);
      }

      this.networkInfo.set({
        status,
        detail: `ONLINE (${type.toUpperCase() || 'LTE'})`,
        level
      });
    } else {
      // Fallback if Network Information API is not supported
      this.networkInfo.set({
        status: 'GOOD',
        detail: 'ONLINE',
        level: 4
      });
    }
  }
}
