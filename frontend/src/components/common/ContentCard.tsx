import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Box,
  Divider,
  SxProps,
  Theme,
} from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';

interface ContentCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  headerSx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
  footerSx?: SxProps<Theme>;
  elevation?: number;
}

const ContentCard: React.FC<ContentCardProps> = ({
  title,
  subtitle,
  action,
  footer,
  children,
  sx,
  headerSx,
  contentSx,
  footerSx,
  elevation = 1,
}) => {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', ...sx }} elevation={elevation}>
      <CardHeader
        title={
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
        }
        subheader={subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
        action={
          action || (
            <IconButton aria-label="settings">
              <MoreVertIcon />
            </IconButton>
          )
        }
        sx={headerSx}
      />
      <Divider />
      <CardContent sx={{ flexGrow: 1, ...contentSx }}>{children}</CardContent>
      {footer && (
        <>
          <Divider />
          <CardActions sx={{ p: 2, ...footerSx }}>{footer}</CardActions>
        </>
      )}
    </Card>
  );
};

export default ContentCard;
