import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';

/** Corporate navy palette used for the header bar and primary controls. */
export const NAVY = {
  50: '#eef3fa',
  100: '#d5e1f2',
  200: '#adc3e5',
  300: '#7f9fd4',
  400: '#527ac0',
  500: '#2f59a8',
  600: '#24468a',
  700: '#1c376e',
  800: '#152a55',
  900: '#101f3f',
  950: '#0a1428',
};

export const ReportingPreset = definePreset(Aura, {
  semantic: {
    primary: NAVY,
    colorScheme: {
      light: {
        primary: {
          color: '{primary.800}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.700}',
          activeColor: '{primary.900}',
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.800}',
          focusColor: '{primary.900}',
        },
      },
    },
  },
});
