import React from 'react';
import { Box, Typography } from '@mui/material';

const Transactions: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Transactions
      </Typography>
      <Typography variant="body1">
        This is the transactions management page. Here you will be able to view and manage all financial transactions.
      </Typography>
    </Box>
  );
};

export default Transactions; 