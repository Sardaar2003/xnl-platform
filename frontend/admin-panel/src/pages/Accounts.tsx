import React from 'react';
import { Box, Typography } from '@mui/material';

const Accounts: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Accounts
      </Typography>
      <Typography variant="body1">
        This is the accounts management page. Here you will be able to view and manage all user accounts.
      </Typography>
    </Box>
  );
};

export default Accounts; 