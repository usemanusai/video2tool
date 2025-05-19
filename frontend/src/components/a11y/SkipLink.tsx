import React from 'react';
import { Box, Link, styled } from '@mui/material';

interface SkipLinkProps {
  targetId: string;
  label?: string;
}

const StyledLink = styled(Link)(({ theme }) => ({
  position: 'absolute',
  top: '-40px',
  left: '0',
  padding: theme.spacing(1),
  zIndex: theme.zIndex.tooltip,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  textDecoration: 'none',
  boxShadow: theme.shadows[2],
  borderRadius: theme.shape.borderRadius,
  transition: 'top 0.2s',
  '&:focus': {
    top: '0',
  },
}));

/**
 * SkipLink component for keyboard accessibility
 * Allows keyboard users to skip navigation and go directly to main content
 */
const SkipLink: React.FC<SkipLinkProps> = ({ 
  targetId, 
  label = 'Skip to main content' 
}) => {
  return (
    <StyledLink href={`#${targetId}`}>
      {label}
    </StyledLink>
  );
};

export default SkipLink;
