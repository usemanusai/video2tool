import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

// Supported languages
const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

interface LanguageSelectorProps {
  variant?: 'icon' | 'text' | 'both';
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = 'both' }) => {
  const { i18n, t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // Get current language
  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    handleClose();
  };
  
  return (
    <>
      <Tooltip title={t('common:language.select')}>
        <Button
          onClick={handleClick}
          color="inherit"
          aria-label={t('common:language.select')}
          aria-controls="language-menu"
          aria-haspopup="true"
          startIcon={variant !== 'text' ? <LanguageIcon /> : undefined}
        >
          {variant === 'icon' ? null : currentLanguage.flag + ' ' + (variant === 'both' ? currentLanguage.name : '')}
        </Button>
      </Tooltip>
      
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {languages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            selected={language.code === i18n.language}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {language.flag}
            </ListItemIcon>
            <ListItemText>{language.name}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageSelector;
