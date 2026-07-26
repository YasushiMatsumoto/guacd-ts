/**
 * Abstract base class for protocol connection builders.
 *
 * @packageDocumentation
 */

import type { ConnectionSettings } from '../../types';
import type { ProtocolConnectionParams, ValidationResult } from '../types';

/**
 * Base connection builder providing shared logic for all protocol builders.
 *
 * Subclasses must implement {@link build} and {@link validate}.
 *
 * @typeParam T - The protocol-specific parameter interface.
 */
export abstract class BaseConnectionBuilder<T extends ProtocolConnectionParams> {
  /** Accumulated connection parameters. */
  protected params: Partial<T>;

  constructor(type: T['type']) {
    this.params = { type } as Partial<T>;
  }

  /** Build a validated {@link ConnectionSettings} object. */
  abstract build(): ConnectionSettings;

  /** Validate the current parameters without building. */
  abstract validate(): ValidationResult;

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Convert the accumulated params into a {@link ConnectionSettings} bag.
   *
   * Display defaults (`width`, `height`, `dpi`) are injected when the
   * builder has not set them explicitly.
   */
  protected toConnectionSettings(): ConnectionSettings {
    const settings: Record<string, string | number | boolean | string[]> = {};

    for (const [key, value] of Object.entries(this.params)) {
      if (key === 'type') continue;
      if (value !== undefined && value !== null) {
        settings[key] = value as string | number | boolean | string[];
      }
    }

    // Apply display defaults for protocols that negotiate screen size.
    if (settings.width === undefined) settings.width = 1280;
    if (settings.height === undefined) settings.height = 720;
    if (settings.dpi === undefined) settings.dpi = 96;

    return {
      type: this.params.type as ConnectionSettings['type'],
      settings,
    };
  }

  /**
   * Validate that a numeric value is a valid TCP port.
   *
   * @returns An error string, or `undefined` if valid.
   */
  protected validatePort(port: number | undefined, field = 'port'): string | undefined {
    if (port !== undefined && (port < 1 || port > 65535)) {
      return `${field} must be between 1 and 65535`;
    }
    return undefined;
  }

  /**
   * Validate that a numeric value is positive.
   *
   * @returns An error string, or `undefined` if valid.
   */
  protected validatePositive(value: number | undefined, field: string): string | undefined {
    if (value !== undefined && value <= 0) {
      return `${field} must be greater than 0`;
    }
    return undefined;
  }
}
