import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Button, Paper, List, ListItemButton,
  ListItemText, Typography, Fade, useTheme,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import CheckIcon from '@mui/icons-material/Check';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from '../../i18n/config';

interface LanguageSwitcherProps {
  compact?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ compact = false }) => {
  const { i18n, t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = (code: SupportedLanguageCode) => {
    void i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <Box ref={containerRef} sx={{ position: 'relative', display: 'inline-block' }}>
      <Button
        variant="outlined"
        size="small"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language.switcher')}
        startIcon={compact ? undefined : <LanguageIcon sx={{ fontSize: 16 }} />}
        endIcon={
          <KeyboardArrowDownIcon sx={{
            fontSize: 16,
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }} />
        }
        sx={{
          borderColor: 'divider', color: 'text.secondary',
          textTransform: 'none', fontWeight: 500, fontSize: 13,
          px: compact ? 1 : 1.5,
          '&:hover': { borderColor: 'primary.main', color: 'primary.main', backgroundColor: 'action.hover' },
        }}
      >
        <span style={{ fontSize: 15, lineHeight: 1 }}>{currentLang.flag}</span>
        {!compact && <span style={{ marginLeft: 4 }}>{currentLang.nativeLabel}</span>}
      </Button>

      <Fade in={open}>
        <Paper
          role="listbox"
          elevation={8}
          sx={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            ...(currentLang.dir === 'rtl' ? { left: 0 } : { right: 0 }),
            minWidth: 180,
            zIndex: theme.zIndex.tooltip,
            borderRadius: 2,
            border: '1px solid', borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', backgroundColor: 'background.default' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {t('language.switcher')}
            </Typography>
          </Box>

          <List dense disablePadding>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = i18n.language === lang.code;
              return (
                <ListItemButton
                  key={lang.code}
                  role="option"
                  aria-selected={isSelected}
                  selected={isSelected}
                  onClick={() => handleSelect(lang.code as SupportedLanguageCode)}
                  sx={{
                    px: 2, py: 0.75,
                    '&.Mui-selected': { backgroundColor: 'action.selected' },
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                >
                  <ListItemText primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <span style={{ fontSize: 16, lineHeight: 1 }}>{lang.flag}</span>
                      <Box>
                        <Typography variant="body2" fontWeight={isSelected ? 600 : 400}
                          color={isSelected ? 'primary.main' : 'text.primary'}>
                          {lang.nativeLabel}
                        </Typography>
                        {lang.nativeLabel !== lang.label && (
                          <Typography variant="caption" color="text.disabled">{lang.label}</Typography>
                        )}
                      </Box>
                    </Box>
                  } />
                  {isSelected && <CheckIcon sx={{ fontSize: 14, color: 'primary.main', ml: 1, flexShrink: 0 }} />}
                </ListItemButton>
              );
            })}
          </List>
        </Paper>
      </Fade>
    </Box>
  );
};

export default LanguageSwitcher;