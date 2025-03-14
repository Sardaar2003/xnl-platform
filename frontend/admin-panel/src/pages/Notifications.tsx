import React from 'react';
import { Box, Typography } from '@mui/material';

const Notifications: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Notifications
      </Typography>
      <Typography variant="body1">
        This is the notifications management page. Here you will be able to view and manage all system notifications.
      </Typography>
    </Box>
  );
};

export default Notifications; 