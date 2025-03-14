import React from 'react';
import { Box, Typography } from '@mui/material';

const Users: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Users
      </Typography>
      <Typography variant="body1">
        This is the users management page. Here you will be able to view and manage all platform users.
      </Typography>
    </Box>
  );
};

export default Users; 