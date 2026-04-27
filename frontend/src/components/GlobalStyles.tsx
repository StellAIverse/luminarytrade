import { GlobalStyles as MuiGlobalStyles, Theme } from '@mui/material';

const GlobalStyles = () => (
  <MuiGlobalStyles
    styles={(theme: Theme) => ({
      'html, body, #root': {
        height: '100%',
        width: '100%',
        overflowX: 'hidden',
        position: 'relative',
      },

      body: {
        // Safe area insets for notched devices (iPhone X+, Android)
        paddingTop: 'env(safe-area-inset-top)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        // Smooth scrolling on iOS
        WebkitOverflowScrolling: 'touch',
        // Text size adjustment for mobile
        WebkitTextSizeAdjust: '100%',
        // Prevent text size adjustment on orientation change
        textSizeAdjust: '100%',
      },

      // Improve tap highlight color on mobile
      '*': {
        WebkitTapHighlightColor: 'transparent',
      },

      // Ensure proper container queries (if needed in future)
      '*, *::before, *::after': {
        boxSizing: 'border-box',
      },

      // Smooth scrolling for anchor links
      'html': {
        scrollBehavior: 'smooth',
      },

      // Better focus visibility for keyboard navigation on mobile
      'button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible': {
        outline: `2px solid ${theme.palette.primary.main}`,
        outlineOffset: 2,
      },

      // Disable zoom on input focus in iOS (already handled by 16px font)
      'input, textarea, select': {
        // Prevent iOS form field zoom on focus
        fontSize: '16px !important',
      },

      // Smooth transitions for touch feedback
      '.ui-button, button, .MuiButton-root, .MuiIconButton-root': {
        WebkitTapHighlightColor: 'rgba(0,0,0,0.1)',
      },

      // Custom scrollbar styling for webkit browsers
      '::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '::-webkit-scrollbar-track': {
        background: theme.palette.background.default,
      },
      '::-webkit-scrollbar-thumb': {
        background: theme.palette.divider,
        borderRadius: 4,
      },
      '::-webkit-scrollbar-thumb:hover': {
        background: theme.palette.text.disabled,
      },
    })}
  />
);

export default GlobalStyles;
