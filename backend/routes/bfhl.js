const express = require('express');
const { processData } = require('../lib/processor');

const router = express.Router();

// Identity
const USER_ID = 'seeracharmi_27072005';
const EMAIL_ID = 'charmi_seera@srmap.edu.in';
const COLLEGE_ROLL_NUMBER = 'AP23110011486';

/**
 * POST /bfhl
 * Accepts { data: string[] } and returns structured hierarchy insights.
 */
router.post('/', (req, res) => {
  try {
    const { data } = req.body;

    // Validate request body
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Request body must contain a "data" array.' });
    }

    const { hierarchies, invalid_entries, duplicate_edges, summary } = processData(data);

    return res.status(200).json({
      user_id: USER_ID,
      email_id: EMAIL_ID,
      college_roll_number: COLLEGE_ROLL_NUMBER,
      hierarchies,
      invalid_entries,
      duplicate_edges,
      summary,
    });
  } catch (err) {
    console.error('Error processing /bfhl:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
