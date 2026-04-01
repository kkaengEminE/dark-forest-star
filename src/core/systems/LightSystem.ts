import type { LightSourceState } from '../models/Player';

export class LightSystem {
  static getEffectiveRange(light: LightSourceState, moonBrightness: number): number {
    if (light.isCloaked || !light.isOn || light.fuel <= 0) {
      return 20 + moonBrightness * 40;
    }
    return light.range + moonBrightness * 60;
  }

  static getDetectionRadius(light: LightSourceState): number {
    if (light.isCloaked || !light.isOn || light.fuel <= 0) {
      return 0;
    }
    return light.range * 1.5;
  }

  static consumeFuel(light: LightSourceState, dt: number): number {
    if (!light.isOn || light.isCloaked) return light.fuel;
    light.fuel = Math.max(0, light.fuel - light.fuelConsumptionRate * dt);
    return light.fuel;
  }

  static toggleCloak(light: LightSourceState): void {
    light.isCloaked = !light.isCloaked;
  }

  static refuelFromFragment(light: LightSourceState, amount: number): void {
    light.fuel = Math.min(light.maxFuel, light.fuel + amount);
  }
}
