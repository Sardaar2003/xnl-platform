import React from 'react';
import { Box, Typography } from '@mui/material';

const Settings: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1">
        This is the system settings page. Here you will be able to configure various platform settings.
      </Typography>
    </Box>
  );
};

export default Settings; 